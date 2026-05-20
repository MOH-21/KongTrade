from pydantic import BaseModel
from datetime import datetime


class PlaybookCreateRequest(BaseModel):
    name: str
    description: str | None = None
    asset_types: list[str] | None = None
    timeframes: list[str] | None = None
    entry_criteria: dict | None = None
    exit_criteria: dict | None = None
    risk_rules: dict | None = None


class PlaybookUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    asset_types: list[str] | None = None
    timeframes: list[str] | None = None
    entry_criteria: dict | None = None
    exit_criteria: dict | None = None
    risk_rules: dict | None = None


class PlaybookResponse(BaseModel):
    id: str
    name: str
    description: str | None
    asset_types: list | None
    timeframes: list | None
    entry_criteria: dict | None
    exit_criteria: dict | None
    risk_rules: dict | None
    is_template: bool
    is_public: bool
    success_rate: float
    total_trades: int
    created_at: datetime

    model_config = {"from_attributes": True}
