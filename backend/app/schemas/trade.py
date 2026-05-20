from pydantic import BaseModel
from datetime import datetime
from app.models.trade import AssetType, TradeSide, TradeStatus, TradeRating


class TradeCreateRequest(BaseModel):
    symbol: str
    asset_type: AssetType = AssetType.stock
    side: TradeSide
    quantity: float
    entry_price: float
    exit_price: float | None = None
    entry_time: datetime
    exit_time: datetime | None = None
    fees: float = 0.0
    commission: float = 0.0
    notes: str | None = None
    tag_ids: list[str] = []
    strategy_id: str | None = None


class TradeUpdateRequest(BaseModel):
    rating: TradeRating | None = None
    notes: str | None = None
    tag_ids: list[str] | None = None
    strategy_id: str | None = None


class TradeResponse(BaseModel):
    id: str
    symbol: str
    asset_type: AssetType
    side: TradeSide
    quantity: float
    entry_price: float
    exit_price: float | None
    entry_time: datetime
    exit_time: datetime | None
    pnl: float | None
    pnl_percent: float | None
    fees: float
    commission: float
    status: TradeStatus
    rating: TradeRating | None
    notes: str | None
    tags_data: dict | None
    strategy_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedTradeResponse(BaseModel):
    items: list[TradeResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
