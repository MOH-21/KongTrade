from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.journal import JournalEntryRequest, JournalEntryResponse
from app.api.deps import get_local_user
from app.services.journal_service import JournalService

router = APIRouter(prefix="/api/journal", tags=["journal"])


@router.get("/{entry_date}", response_model=JournalEntryResponse)
async def get_journal_entry(
    entry_date: date,
    user = Depends(get_local_user),
    db: AsyncSession = Depends(get_db),
):
    service = JournalService(db)
    entry = await service.get_entry(user_id=user.id, entry_date=entry_date)
    if not entry:
        raise HTTPException(status_code=404, detail="No journal entry for this date")
    return entry


@router.post("/{entry_date}", response_model=JournalEntryResponse)
async def upsert_journal_entry(
    entry_date: date,
    request: JournalEntryRequest,
    user = Depends(get_local_user),
    db: AsyncSession = Depends(get_db),
):
    service = JournalService(db)
    return await service.upsert_entry(user_id=user.id, entry_date=entry_date, data=request)


@router.get("/heatmap/data")
async def journal_heatmap(
    year: int | None = Query(None),
    month: int | None = Query(None),
    user = Depends(get_local_user),
    db: AsyncSession = Depends(get_db),
):
    service = JournalService(db)
    return await service.get_heatmap(user_id=user.id, year=year, month=month)
