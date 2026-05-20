from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.playbook import Playbook, PlaybookScore
from app.schemas.playbook import PlaybookCreateRequest, PlaybookUpdateRequest, PlaybookResponse


class PlaybookService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_playbooks(self, user_id: str) -> list[PlaybookResponse]:
        result = await self.db.execute(
            select(Playbook).where(Playbook.user_id == user_id).order_by(Playbook.name)
        )
        playbooks = result.scalars().all()
        return [
            self._to_response(p, await self._count_trades(p.id))
            for p in playbooks
        ]

    async def get_playbook(self, playbook_id: str, user_id: str) -> PlaybookResponse | None:
        result = await self.db.execute(
            select(Playbook).where(Playbook.id == playbook_id, Playbook.user_id == user_id)
        )
        p = result.scalar_one_or_none()
        if not p:
            return None
        return self._to_response(p, await self._count_trades(p.id))

    async def create_playbook(self, user_id: str, data: PlaybookCreateRequest) -> PlaybookResponse:
        playbook = Playbook(
            user_id=user_id,
            name=data.name,
            description=data.description,
            asset_types=data.asset_types,
            timeframes=data.timeframes,
            entry_criteria=data.entry_criteria,
            exit_criteria=data.exit_criteria,
            risk_rules=data.risk_rules,
        )
        self.db.add(playbook)
        await self.db.commit()
        await self.db.refresh(playbook)
        return self._to_response(playbook, 0)

    async def update_playbook(self, playbook_id: str, user_id: str, data: PlaybookUpdateRequest) -> PlaybookResponse | None:
        result = await self.db.execute(
            select(Playbook).where(Playbook.id == playbook_id, Playbook.user_id == user_id)
        )
        p = result.scalar_one_or_none()
        if not p:
            return None
        for field in ["name", "description", "asset_types", "timeframes", "entry_criteria", "exit_criteria", "risk_rules"]:
            val = getattr(data, field, None)
            if val is not None:
                setattr(p, field, val)
        await self.db.commit()
        await self.db.refresh(p)
        return self._to_response(p, await self._count_trades(p.id))

    async def delete_playbook(self, playbook_id: str, user_id: str) -> bool:
        result = await self.db.execute(
            select(Playbook).where(Playbook.id == playbook_id, Playbook.user_id == user_id)
        )
        p = result.scalar_one_or_none()
        if not p:
            return False
        await self.db.delete(p)
        await self.db.commit()
        return True

    async def get_templates(self) -> list[PlaybookResponse]:
        result = await self.db.execute(
            select(Playbook).where(Playbook.is_template == True)
        )
        templates = result.scalars().all()
        return [self._to_response(p, await self._count_trades(p.id)) for p in templates]

    async def _count_trades(self, playbook_id: str) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(PlaybookScore).where(PlaybookScore.playbook_id == playbook_id)
        )
        return result.scalar() or 0

    def _to_response(self, p: Playbook, total_trades: int) -> PlaybookResponse:
        return PlaybookResponse(
            id=str(p.id),
            name=p.name,
            description=p.description,
            asset_types=p.asset_types,
            timeframes=p.timeframes,
            entry_criteria=p.entry_criteria,
            exit_criteria=p.exit_criteria,
            risk_rules=p.risk_rules,
            is_template=p.is_template,
            is_public=p.is_public,
            success_rate=p.success_rate,
            total_trades=total_trades,
            created_at=p.created_at,
        )
