from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.broker import BrokerConnection, Account
from app.models.trade import Trade, AssetType, TradeSide, TradeStatus
from app.schemas.broker import BrokerConnectionResponse, AccountResponse, BrokerStatusResponse
from app.utils.encryption import encrypt_value, decrypt_value
from app.utils.robinhood_client import RobinhoodClient


class BrokerService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ---- Connection management ----

    async def connect_broker(
        self, user_id: str, broker_name: str, username: str, password: str, mfa_secret: str | None = None
    ) -> BrokerConnectionResponse:
        # Check for existing connection
        result = await self.db.execute(
            select(BrokerConnection).where(
                BrokerConnection.user_id == user_id,
                BrokerConnection.broker_name == broker_name,
            )
        )
        existing = result.scalar_one_or_none()

        # Test the credentials
        client = RobinhoodClient()
        try:
            client.login(username, password, mfa_secret)
            pickle_data = client.get_session_pickle()

            account_info = client.get_account_info()
            client.logout()
        except Exception as e:
            raise ValueError(f"Failed to connect to {broker_name}: {str(e)}")

        if existing:
            existing.username = username
            existing.encrypted_password = encrypt_value(password)
            existing.encrypted_mfa_secret = encrypt_value(mfa_secret) if mfa_secret else None
            existing.pickle_data = pickle_data
            existing.is_connected = True
            await self.db.commit()
            await self.db.refresh(existing)
            connection = existing
        else:
            connection = BrokerConnection(
                user_id=user_id,
                broker_name=broker_name,
                username=username,
                encrypted_password=encrypt_value(password),
                encrypted_mfa_secret=encrypt_value(mfa_secret) if mfa_secret else None,
                pickle_data=pickle_data,
                is_connected=True,
            )
            self.db.add(connection)
            await self.db.commit()
            await self.db.refresh(connection)

        # Create/update account record
        if account_info:
            acc_result = await self.db.execute(
                select(Account).where(
                    Account.user_id == user_id,
                    Account.broker_connection_id == connection.id,
                    Account.account_number == account_info.account_number,
                )
            )
            acc = acc_result.scalar_one_or_none()
            if acc:
                acc.current_balance = account_info.equity
            else:
                acc = Account(
                    user_id=user_id,
                    broker_connection_id=connection.id,
                    account_number=account_info.account_number,
                    account_type=account_info.account_type,
                    initial_balance=account_info.equity,
                    current_balance=account_info.equity,
                )
                self.db.add(acc)
            await self.db.commit()

        return BrokerConnectionResponse.model_validate(connection)

    async def get_status(self, user_id: str) -> BrokerStatusResponse:
        result = await self.db.execute(
            select(BrokerConnection).where(
                BrokerConnection.user_id == user_id,
                BrokerConnection.is_connected == True,
            )
        )
        connections = result.scalars().all()

        if not connections:
            return BrokerStatusResponse(connected=False, broker_name=None, last_synced_at=None, accounts=[])

        conn = connections[0]
        acc_result = await self.db.execute(
            select(Account).where(Account.broker_connection_id == conn.id)
        )
        accounts = acc_result.scalars().all()

        return BrokerStatusResponse(
            connected=True,
            broker_name=conn.broker_name,
            last_synced_at=conn.last_synced_at,
            accounts=[AccountResponse.model_validate(a) for a in accounts],
        )

    async def disconnect(self, user_id: str, broker_name: str) -> bool:
        result = await self.db.execute(
            select(BrokerConnection).where(
                BrokerConnection.user_id == user_id,
                BrokerConnection.broker_name == broker_name,
            )
        )
        conn = result.scalar_one_or_none()
        if not conn:
            return False
        conn.is_connected = False
        await self.db.commit()
        return True

    # ---- Trade sync ----

    async def sync_trades(self, user_id: str, connection_id: str) -> int:
        """Pull trades from Robinhood and store in KongTrade. Returns count of new trades."""
        result = await self.db.execute(
            select(BrokerConnection).where(
                BrokerConnection.id == connection_id,
                BrokerConnection.user_id == user_id,
            )
        )
        conn = result.scalar_one_or_none()
        if not conn:
            raise ValueError("Broker connection not found")

        client = RobinhoodClient()
        try:
            client.login(
                username=conn.username,
                password=decrypt_value(conn.encrypted_password),
                mfa_secret=decrypt_value(conn.encrypted_mfa_secret) if conn.encrypted_mfa_secret else None,
                pickle_data=conn.pickle_data,
            )
        except Exception as e:
            raise ConnectionError(f"Robinhood auth failed: {str(e)}")

        try:
            trades_data = client.get_all_trades()

            # Update session pickle
            new_pickle = client.get_session_pickle()
            if new_pickle:
                conn.pickle_data = new_pickle

            new_count = 0
            for td in trades_data:
                # Check if we already have this trade
                if td.broker_order_id:
                    existing = await self.db.execute(
                        select(Trade).where(
                            Trade.user_id == user_id,
                            Trade.broker_order_id == td.broker_order_id,
                        )
                    )
                    if existing.scalar_one_or_none():
                        continue

                # Find or create account
                acc_result = await self.db.execute(
                    select(Account).where(Account.broker_connection_id == connection_id)
                )
                account = acc_result.scalar_one_or_none()

                trade = Trade(
                    user_id=user_id,
                    account_id=account.id if account else None,
                    broker_connection_id=connection_id,
                    broker_order_id=td.broker_order_id,
                    symbol=td.symbol,
                    asset_type=AssetType(td.asset_type),
                    side=TradeSide.buy if td.side == "buy" else TradeSide.sell,
                    quantity=td.quantity,
                    entry_price=td.entry_price,
                    exit_price=td.exit_price,
                    entry_time=td.entry_time,
                    exit_time=td.exit_time,
                    pnl=td.pnl,
                    pnl_percent=(td.pnl / (td.entry_price * td.quantity)) * 100 if td.pnl and td.quantity and td.entry_price else None,
                    fees=td.fees,
                    status=TradeStatus.closed if td.exit_price else TradeStatus.open,
                )
                self.db.add(trade)
                new_count += 1

            # Update last synced
            from datetime import datetime, timezone
            conn.last_synced_at = datetime.now(timezone.utc)
            await self.db.commit()

            client.logout()
            return new_count
        except Exception as e:
            await self.db.rollback()
            try:
                client.logout()
            except Exception:
                pass
            raise RuntimeError(f"Trade sync failed: {str(e)}")
