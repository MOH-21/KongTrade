from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import UserResponse
from app.api.deps import require_user
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary(
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)
    return await service.get_summary(user_id=user.id)


@router.get("/calendar")
async def dashboard_calendar(
    month: int | None = Query(None, ge=1, le=12),
    year: int | None = Query(None, ge=2000),
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)
    return await service.get_calendar(user_id=user.id, month=month, year=year)


@router.get("/zella-score")
async def zella_score(
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)
    return await service.get_zella_score(user_id=user.id)


@router.get("/streaks")
async def streaks(
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)
    return await service.get_streaks(user_id=user.id)


@router.get("/drawdown")
async def drawdown(
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)
    return await service.get_drawdown(user_id=user.id)


@router.get("/recent-trades")
async def recent_trades(
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = DashboardService(db)
    return await service.get_recent_trades(user_id=user.id)
