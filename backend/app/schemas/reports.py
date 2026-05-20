from pydantic import BaseModel
from datetime import date


class PnLTimeSeriesPoint(BaseModel):
    date: date
    pnl: float
    cumulative_pnl: float
    trade_count: int


class SymbolPerformanceItem(BaseModel):
    symbol: str
    pnl: float
    trade_count: int
    win_rate: float
    profit_factor: float


class TagPerformanceItem(BaseModel):
    tag_id: str
    tag_name: str
    pnl: float
    trade_count: int
    win_rate: float


class TimePerformanceItem(BaseModel):
    period: str
    pnl: float
    trade_count: int
    win_rate: float


class PerformanceMetricsResponse(BaseModel):
    profit_factor: float
    expectancy: float
    sharpe_ratio: float | None
    avg_r_multiple: float | None
    avg_hold_time_hours: float | None
