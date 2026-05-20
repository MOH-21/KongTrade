from app.workers.celery_app import celery_app
from app.database import async_session
from app.services.broker_service import BrokerService


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def sync_robinhood_trades(self, user_id: str, connection_id: str):
    """Pull trade history from Robinhood and import into KongTrade."""
    import asyncio

    async def _run():
        async with async_session() as db:
            service = BrokerService(db)
            count = await service.sync_trades(user_id=user_id, connection_id=connection_id)
            return count

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # In a running event loop, create new loop in thread
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, _run())
                return future.result()
        else:
            count = asyncio.run(_run())
        return {"status": "success", "new_trades": count}
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def sync_robinhood_positions(self, user_id: str, connection_id: str):
    """Sync current open positions from Robinhood. Updates trade statuses."""
    import asyncio

    async def _run():
        async with async_session() as db:
            # This will update open trade statuses based on current positions
            from sqlalchemy import select, update
            from app.models.trade import Trade, TradeStatus
            from app.models.broker import BrokerConnection
            from app.utils.robinhood_client import RobinhoodClient
            from app.utils.encryption import decrypt_value

            result = await db.execute(
                select(BrokerConnection).where(BrokerConnection.id == connection_id)
            )
            conn = result.scalar_one_or_none()
            if not conn:
                return {"status": "error", "message": "Connection not found"}

            client = RobinhoodClient()
            client.login(
                username=conn.username,
                password=decrypt_value(conn.encrypted_password),
                mfa_secret=decrypt_value(conn.encrypted_mfa_secret) if conn.encrypted_mfa_secret else None,
                pickle_data=conn.pickle_data,
            )

            positions = client.get_current_positions()
            position_symbols = {p.symbol for p in positions}

            # Mark trades as closed if symbol is no longer in positions
            open_trades_result = await db.execute(
                select(Trade).where(
                    Trade.user_id == user_id,
                    Trade.status == TradeStatus.open,
                )
            )
            open_trades = open_trades_result.scalars().all()
            for trade in open_trades:
                if trade.symbol not in position_symbols:
                    trade.status = TradeStatus.closed

            await db.commit()
            client.logout()
            return {"status": "success", "open_positions": len(positions)}

    import asyncio
    try:
        count = asyncio.run(_run())
        return count
    except Exception as exc:
        raise self.retry(exc=exc)
