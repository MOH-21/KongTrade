from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.broker import BrokerConnectRequest, BrokerConnectResponse
from app.api.deps import get_local_user, LocalUser
from app.services.broker_service import BrokerService

router = APIRouter(prefix="/api/brokers", tags=["brokers"])


@router.post("/connect", response_model=BrokerConnectResponse)
async def connect_broker(
    request: BrokerConnectRequest,
    user: LocalUser = Depends(get_local_user),
    db: AsyncSession = Depends(get_db),
):
    service = BrokerService(db)
    try:
        result = await service.connect_broker(
            user_id=user.id,
            broker_name=request.broker_name,
            username=request.username,
            password=request.password,
            mfa_code=request.mfa_code,
            connection_id=request.connection_id,
        )
        return BrokerConnectResponse(**result)
    except ConnectionError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status")
async def broker_status(
    user: LocalUser = Depends(get_local_user),
    db: AsyncSession = Depends(get_db),
):
    service = BrokerService(db)
    return await service.get_status(user_id=user.id)


@router.post("/sync")
async def sync_trades(
    user: LocalUser = Depends(get_local_user),
    db: AsyncSession = Depends(get_db),
):
    service = BrokerService(db)
    status = await service.get_status(user_id=user.id)
    if not status.connected:
        raise HTTPException(status_code=400, detail="No connected broker")

    from sqlalchemy import select
    from app.models.broker import BrokerConnection
    result = await db.execute(
        select(BrokerConnection).where(
            BrokerConnection.user_id == user.id,
            BrokerConnection.is_connected == True,
        )
    )
    conn = result.scalars().first()
    if not conn:
        raise HTTPException(status_code=400, detail="No connected broker")

    count = await service.sync_trades(user_id=str(user.id), connection_id=str(conn.id))
    return {"message": f"Synced {count} trades", "new_trades": count}


@router.delete("/disconnect")
async def disconnect_broker(
    broker_name: str = "robinhood",
    user: LocalUser = Depends(get_local_user),
    db: AsyncSession = Depends(get_db),
):
    service = BrokerService(db)
    success = await service.disconnect(user_id=user.id, broker_name=broker_name)
    if not success:
        raise HTTPException(status_code=404, detail="Broker connection not found")
    return {"message": f"Disconnected from {broker_name}"}
