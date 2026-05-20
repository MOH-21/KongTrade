from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import UserResponse
from app.api.deps import require_user
from app.services.report_service import ReportService

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/pnl-over-time")
async def pnl_over_time(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)
    return await service.pnl_over_time(user_id=user.id, start_date=start_date, end_date=end_date)


@router.get("/by-symbol")
async def by_symbol(
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)
    return await service.by_symbol(user_id=user.id)


@router.get("/by-tag")
async def by_tag(
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)
    return await service.by_tag(user_id=user.id)


@router.get("/by-time")
async def by_time(
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)
    return await service.by_time(user_id=user.id)


@router.get("/performance")
async def performance(
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)
    return await service.performance_metrics(user_id=user.id)
