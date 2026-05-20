from pydantic import BaseModel
from datetime import date, datetime


class DashboardSummaryResponse(BaseModel):
    net_pnl: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    profit_factor: float
    avg_win: float
    avg_loss: float
    best_day: dict | None
    worst_day: dict | None
    expectancy: float
    total_fees: float


class CalendarDayResponse(BaseModel):
    date: date
    pnl: float
    trade_count: int
    is_win: bool | None


class ZellaScoreResponse(BaseModel):
    score: int
    win_rate_score: float
    profit_factor_score: float
    consistency_score: float
    risk_score: float
    quality_score: float


class StreakResponse(BaseModel):
    current_win_streak: int
    current_loss_streak: int
    longest_win_streak: int
    longest_loss_streak: int
    current_day_win_streak: int


class DrawdownResponse(BaseModel):
    max_drawdown: float
    max_drawdown_percent: float
    max_drawdown_date: date | None
    avg_drawdown: float
    avg_drawdown_percent: float
