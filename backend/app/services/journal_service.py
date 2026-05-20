from datetime import date
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.journal import JournalEntry, JournalEntryTrade, Tag, DailyChecklist, EmotionalState
from app.schemas.journal import JournalEntryRequest, JournalEntryResponse, TagCreateRequest, TagResponse


class JournalService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_entry(self, user_id: str, entry_date: date) -> JournalEntryResponse | None:
        result = await self.db.execute(
            select(JournalEntry)
            .options(selectinload(JournalEntry.trade_links))
            .where(JournalEntry.user_id == user_id, JournalEntry.entry_date == entry_date)
        )
        entry = result.scalar_one_or_none()
        if not entry:
            return None
        trade_ids = [str(link.trade_id) for link in (entry.trade_links or [])]
        return JournalEntryResponse(
            id=str(entry.id),
            entry_date=entry.entry_date,
            pre_market_notes=entry.pre_market_notes,
            end_of_day_notes=entry.end_of_day_notes,
            emotional_state=entry.emotional_state.value if entry.emotional_state else None,
            lessons_learned=entry.lessons_learned,
            trade_ids=trade_ids,
            created_at=entry.created_at,
            updated_at=entry.updated_at,
        )

    async def upsert_entry(self, user_id: str, entry_date: date, data: JournalEntryRequest) -> JournalEntryResponse:
        result = await self.db.execute(
            select(JournalEntry).where(
                JournalEntry.user_id == user_id,
                JournalEntry.entry_date == entry_date,
            )
        )
        entry = result.scalar_one_or_none()

        if entry:
            entry.pre_market_notes = data.pre_market_notes
            entry.end_of_day_notes = data.end_of_day_notes
            entry.emotional_state = EmotionalState(data.emotional_state) if data.emotional_state else None
            entry.lessons_learned = data.lessons_learned

            # Update trade links
            existing_links = await self.db.execute(
                select(JournalEntryTrade).where(JournalEntryTrade.journal_entry_id == entry.id)
            )
            for link in existing_links.scalars().all():
                await self.db.delete(link)

            for trade_id in data.trade_ids:
                self.db.add(JournalEntryTrade(journal_entry_id=entry.id, trade_id=trade_id))
        else:
            entry = JournalEntry(
                user_id=user_id,
                entry_date=entry_date,
                pre_market_notes=data.pre_market_notes,
                end_of_day_notes=data.end_of_day_notes,
                emotional_state=EmotionalState(data.emotional_state) if data.emotional_state else None,
                lessons_learned=data.lessons_learned,
            )
            self.db.add(entry)
            await self.db.flush()

            for trade_id in data.trade_ids:
                self.db.add(JournalEntryTrade(journal_entry_id=entry.id, trade_id=trade_id))

        await self.db.commit()
        await self.db.refresh(entry)

        trade_ids = [str(link.trade_id) for link in (entry.trade_links or [])]
        return JournalEntryResponse(
            id=str(entry.id),
            entry_date=entry.entry_date,
            pre_market_notes=entry.pre_market_notes,
            end_of_day_notes=entry.end_of_day_notes,
            emotional_state=entry.emotional_state.value if entry.emotional_state else None,
            lessons_learned=entry.lessons_learned,
            trade_ids=trade_ids,
            created_at=entry.created_at,
            updated_at=entry.updated_at,
        )

    async def get_heatmap(self, user_id: str, year: int | None = None, month: int | None = None):
        from datetime import date as dt_date
        today = dt_date.today()
        if not year:
            year = today.year

        conditions = [JournalEntry.user_id == user_id]
        if year:
            if month:
                conditions.append(
                    and_(
                        JournalEntry.entry_date >= dt_date(year, month, 1),
                        JournalEntry.entry_date < dt_date(year, month + 1, 1) if month < 12 else dt_date(year + 1, 1, 1),
                    )
                )
            else:
                conditions.append(JournalEntry.entry_date >= dt_date(year, 1, 1))
                conditions.append(JournalEntry.entry_date < dt_date(year + 1, 1, 1))

        result = await self.db.execute(
            select(JournalEntry).where(and_(*conditions))
        )
        entries = result.scalars().all()
        return [
            {
                "date": e.entry_date.isoformat(),
                "has_entry": True,
                "emotional_state": e.emotional_state.value if e.emotional_state else None,
            }
            for e in entries
        ]

    # ---- Tags ----

    async def list_tags(self, user_id: str) -> list[TagResponse]:
        result = await self.db.execute(
            select(Tag).where(Tag.user_id == user_id).order_by(Tag.name)
        )
        tags = result.scalars().all()
        return [TagResponse.model_validate(t) for t in tags]

    async def create_tag(self, user_id: str, data: TagCreateRequest) -> TagResponse:
        tag = Tag(
            user_id=user_id,
            name=data.name,
            category=data.category,
            color=data.color,
        )
        self.db.add(tag)
        await self.db.commit()
        await self.db.refresh(tag)
        return TagResponse.model_validate(tag)

    async def update_tag(self, tag_id: str, user_id: str, data: TagCreateRequest) -> TagResponse | None:
        result = await self.db.execute(
            select(Tag).where(Tag.id == tag_id, Tag.user_id == user_id)
        )
        tag = result.scalar_one_or_none()
        if not tag:
            return None
        if data.name:
            tag.name = data.name
        if data.category:
            tag.category = data.category
        if data.color:
            tag.color = data.color
        await self.db.commit()
        await self.db.refresh(tag)
        return TagResponse.model_validate(tag)

    async def delete_tag(self, tag_id: str, user_id: str) -> bool:
        result = await self.db.execute(
            select(Tag).where(Tag.id == tag_id, Tag.user_id == user_id)
        )
        tag = result.scalar_one_or_none()
        if not tag:
            return False
        await self.db.delete(tag)
        await self.db.commit()
        return True
