from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_local_user
from app.services.report_service import ReportService

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/pnl-over-time")
async def pnl_over_time(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    user = Depends(get_local_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)
    return await service.pnl_over_time(user_id=user.id, start_date=start_date, end_date=end_date)


@router.get("/by-symbol")
async def by_symbol(
    user = Depends(get_local_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)
    return await service.by_symbol(user_id=user.id)


@router.get("/by-tag")
async def by_tag(
    user = Depends(get_local_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)
    return await service.by_tag(user_id=user.id)


@router.get("/by-time")
async def by_time(
    user = Depends(get_local_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)
    return await service.by_time(user_id=user.id)


@router.get("/performance")
async def performance(
    user = Depends(get_local_user),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)
    return await service.performance_metrics(user_id=user.id)
