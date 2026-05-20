from pydantic import BaseModel
from datetime import date, datetime
from app.models.journal import EmotionalState


class JournalEntryRequest(BaseModel):
    pre_market_notes: str | None = None
    end_of_day_notes: str | None = None
    emotional_state: EmotionalState | None = None
    lessons_learned: str | None = None
    trade_ids: list[str] = []


class JournalEntryResponse(BaseModel):
    id: str
    entry_date: date
    pre_market_notes: str | None
    end_of_day_notes: str | None
    emotional_state: EmotionalState | None
    lessons_learned: str | None
    trade_ids: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TagCreateRequest(BaseModel):
    name: str
    category: str = "custom"
    color: str = "#6B7280"


class TagResponse(BaseModel):
    id: str
    name: str
    category: str
    color: str

    model_config = {"from_attributes": True}
