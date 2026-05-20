from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.broker import BrokerConnection, Account
from app.models.trade import Trade, AssetType, TradeSide, TradeStatus
from app.schemas.broker import BrokerConnectionResponse, AccountResponse, BrokerStatusResponse
from app.utils.encryption import encrypt_value, decrypt_value
from app.utils.robinhood_client import RobinhoodClient, MfaRequired


class BrokerService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def connect_broker(
        self, user_id: str, broker_name: str, username: str, password: str,
        mfa_code: str | None = None, connection_id: str | None = None,
    ) -> dict:
        """Connect to Robinhood. Returns {"connected": True, "connection": ...}
        or {"mfa_required": True, "connection_id": ...}"""
        client = RobinhoodClient()

        # If we have a connection_id, this is a retry with MFA code
        if connection_id:
            result = await self.db.execute(
                select(BrokerConnection).where(BrokerConnection.id == connection_id)
            )
            conn = result.scalar_one_or_none()
            if not conn:
                raise ValueError("Connection not found")
            try:
                client.login(
                    username=conn.username,
                    password=decrypt_value(conn.encrypted_password),
                    mfa_code=mfa_code,
                )
            except MfaRequired:
                return {"mfa_required": True, "connection_id": connection_id}
            except Exception as e:
                raise ConnectionError(str(e))
            pickle_data = client.get_session_pickle()
            conn.pickle_data = pickle_data
            conn.is_connected = True
            await self.db.commit()
            await self.db.refresh(conn)
            acc = await self._sync_account(user_id, conn.id, client)
            client.logout()
            return {"connected": True, "connection": BrokerConnectionResponse.model_validate(conn)}

        # Fresh connection — store credentials first, then try login
        result = await self.db.execute(
            select(BrokerConnection).where(
                BrokerConnection.user_id == user_id,
                BrokerConnection.broker_name == broker_name,
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.username = username
            existing.encrypted_password = encrypt_value(password)
            existing.is_connected = False
            await self.db.commit()
            await self.db.refresh(existing)
            conn = existing
        else:
            conn = BrokerConnection(
                user_id=user_id,
                broker_name=broker_name,
                username=username,
                encrypted_password=encrypt_value(password),
                is_connected=False,
            )
            self.db.add(conn)
            await self.db.commit()
            await self.db.refresh(conn)

        try:
            client.login(username, password)
        except MfaRequired:
            return {"mfa_required": True, "connection_id": str(conn.id)}
        except Exception as e:
            raise ConnectionError(str(e))

        pickle_data = client.get_session_pickle()
        conn.pickle_data = pickle_data
        conn.is_connected = True
        await self.db.commit()
        await self.db.refresh(conn)

        acc = await self._sync_account(user_id, conn.id, client)
        client.logout()
        return {"connected": True, "connection": BrokerConnectionResponse.model_validate(conn)}

    async def _sync_account(self, user_id: str, connection_id: str, client: RobinhoodClient):
        account_info = client.get_account_info()
        if not account_info:
            return None
        result = await self.db.execute(
            select(Account).where(
                Account.user_id == user_id,
                Account.broker_connection_id == connection_id,
                Account.account_number == account_info.account_number,
            )
        )
        acc = result.scalar_one_or_none()
        if acc:
            acc.current_balance = account_info.equity
        else:
            acc = Account(
                user_id=user_id,
                broker_connection_id=connection_id,
                account_number=account_info.account_number,
                account_type=account_info.account_type,
                initial_balance=account_info.equity,
                current_balance=account_info.equity,
            )
            self.db.add(acc)
        await self.db.commit()
        return acc

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

    async def sync_trades(self, user_id: str, connection_id: str) -> int:
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
                pickle_data=conn.pickle_data,
            )
        except Exception as e:
            raise ConnectionError(f"Robinhood auth failed: {str(e)}")

        try:
            trades_data = client.get_all_trades()
            new_pickle = client.get_session_pickle()
            if new_pickle:
                conn.pickle_data = new_pickle

            new_count = 0
            for td in trades_data:
                if td.broker_order_id:
                    existing = await self.db.execute(
                        select(Trade).where(
                            Trade.user_id == user_id,
                            Trade.broker_order_id == td.broker_order_id,
                        )
                    )
                    if existing.scalar_one_or_none():
                        continue

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
