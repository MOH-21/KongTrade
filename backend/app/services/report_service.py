from datetime import datetime, date, timedelta
from sqlalchemy import select, func, and_, extract, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.trade import Trade, TradeTag, TradeStatus
from app.models.journal import Tag
from app.schemas.reports import (
    PnLTimeSeriesPoint,
    SymbolPerformanceItem,
    TagPerformanceItem,
    TimePerformanceItem,
    PerformanceMetricsResponse,
)


class ReportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def pnl_over_time(self, user_id: str, start_date: str | None = None, end_date: str | None = None) -> list[PnLTimeSeriesPoint]:
        conditions = [
            Trade.user_id == user_id,
            Trade.status == TradeStatus.closed,
            Trade.pnl.isnot(None),
        ]
        if start_date:
            conditions.append(Trade.entry_time >= datetime.fromisoformat(start_date))
        if end_date:
            conditions.append(Trade.entry_time <= datetime.fromisoformat(end_date))

        result = await self.db.execute(
            select(Trade).where(and_(*conditions)).order_by(Trade.entry_time.asc())
        )
        trades = result.scalars().all()

        day_data: dict[date, dict] = {}
        for t in trades:
            d = t.entry_time.date()
            if d not in day_data:
                day_data[d] = {"pnl": 0.0, "count": 0}
            day_data[d]["pnl"] += t.pnl or 0
            day_data[d]["count"] += 1

        cumulative = 0.0
        points = []
        for d in sorted(day_data):
            cumulative += day_data[d]["pnl"]
            points.append(PnLTimeSeriesPoint(
                date=d,
                pnl=round(day_data[d]["pnl"], 2),
                cumulative_pnl=round(cumulative, 2),
                trade_count=day_data[d]["count"],
            ))
        return points

    async def by_symbol(self, user_id: str) -> list[SymbolPerformanceItem]:
        result = await self.db.execute(
            select(Trade).where(
                Trade.user_id == user_id,
                Trade.status == TradeStatus.closed,
                Trade.pnl.isnot(None),
            )
        )
        trades = result.scalars().all()

        by_sym: dict[str, dict] = {}
        for t in trades:
            if t.symbol not in by_sym:
                by_sym[t.symbol] = {"pnl": 0.0, "count": 0, "wins": 0, "gross_profit": 0.0, "gross_loss": 0.0}
            d = by_sym[t.symbol]
            d["pnl"] += t.pnl or 0
            d["count"] += 1
            if t.pnl and t.pnl > 0:
                d["wins"] += 1
                d["gross_profit"] += t.pnl
            elif t.pnl and t.pnl < 0:
                d["gross_loss"] += abs(t.pnl)

        return [
            SymbolPerformanceItem(
                symbol=sym,
                pnl=round(d["pnl"], 2),
                trade_count=d["count"],
                win_rate=round(d["wins"] / d["count"] * 100, 2) if d["count"] else 0,
                profit_factor=round(d["gross_profit"] / d["gross_loss"], 2) if d["gross_loss"] > 0 else (999 if d["gross_profit"] > 0 else 0),
            )
            for sym, d in sorted(by_sym.items(), key=lambda x: x[1]["pnl"], reverse=True)
        ]

    async def by_tag(self, user_id: str) -> list[TagPerformanceItem]:
        result = await self.db.execute(
            select(TradeTag).join(Trade).where(Trade.user_id == user_id, Trade.pnl.isnot(None), Trade.status == TradeStatus.closed)
        )
        trade_tags = result.scalars().all()

        tag_data: dict[str, dict] = {}
        tag_names: dict[str, str] = {}
        for tt in trade_tags:
            tid = str(tt.tag_id)
            if tid not in tag_data:
                tag_data[tid] = {"pnl": 0.0, "count": 0, "wins": 0}
            if tid not in tag_names and tt.tag:
                tag_names[tid] = tt.tag.name
            if tt.trade and tt.trade.pnl:
                tag_data[tid]["pnl"] += tt.trade.pnl
                tag_data[tid]["count"] += 1
                if tt.trade.pnl > 0:
                    tag_data[tid]["wins"] += 1

        return [
            TagPerformanceItem(
                tag_id=tid,
                tag_name=tag_names.get(tid, "Unknown"),
                pnl=round(d["pnl"], 2),
                trade_count=d["count"],
                win_rate=round(d["wins"] / d["count"] * 100, 2) if d["count"] else 0,
            )
            for tid, d in sorted(tag_data.items(), key=lambda x: x[1]["pnl"], reverse=True)
        ]

    async def by_time(self, user_id: str) -> list[TimePerformanceItem]:
        """Performance by day of week."""
        result = await self.db.execute(
            select(Trade).where(
                Trade.user_id == user_id,
                Trade.status == TradeStatus.closed,
                Trade.pnl.isnot(None),
            )
        )
        trades = result.scalars().all()

        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        day_data: dict[int, dict] = {i: {"pnl": 0.0, "count": 0, "wins": 0} for i in range(7)}

        for t in trades:
            dow = t.entry_time.weekday()
            day_data[dow]["pnl"] += t.pnl or 0
            day_data[dow]["count"] += 1
            if t.pnl and t.pnl > 0:
                day_data[dow]["wins"] += 1

        return [
            TimePerformanceItem(
                period=days[i],
                pnl=round(day_data[i]["pnl"], 2),
                trade_count=day_data[i]["count"],
                win_rate=round(day_data[i]["wins"] / day_data[i]["count"] * 100, 2) if day_data[i]["count"] else 0,
            )
            for i in range(7)
        ]

    async def performance_metrics(self, user_id: str) -> PerformanceMetricsResponse:
        result = await self.db.execute(
            select(Trade).where(
                Trade.user_id == user_id,
                Trade.status == TradeStatus.closed,
                Trade.pnl.isnot(None),
            )
        )
        trades = result.scalars().all()

        if not trades:
            return PerformanceMetricsResponse(profit_factor=0, expectancy=0, sharpe_ratio=None, avg_r_multiple=None, avg_hold_time_hours=None)

        wins = [t for t in trades if t.pnl and t.pnl > 0]
        gross_profit = sum(t.pnl for t in wins if t.pnl) or 0
        gross_loss = abs(sum(t.pnl for t in trades if t.pnl and t.pnl < 0)) or 1
        profit_factor = gross_profit / gross_loss

        win_rate = len(wins) / len(trades)
        avg_win = sum(t.pnl for t in wins if t.pnl) / len(wins) if wins else 0
        loss_trades = [t for t in trades if t.pnl and t.pnl < 0]
        avg_loss = abs(sum(t.pnl for t in loss_trades if t.pnl)) / len(loss_trades) if loss_trades else 0
        expectancy = (win_rate * avg_win) - ((1 - win_rate) * avg_loss)

        # Sharpe-like (daily)
        day_pnl: dict[date, float] = {}
        for t in trades:
            d = t.entry_time.date()
            day_pnl[d] = day_pnl.get(d, 0) + (t.pnl or 0)
        values = list(day_pnl.values())
        if len(values) > 1:
            mean = sum(values) / len(values)
            var = sum((v - mean) ** 2 for v in values) / (len(values) - 1)
            std = var ** 0.5
            sharpe = (mean / std) if std > 0 else 0
        else:
            sharpe = None

        # Avg hold time
        hold_times = []
        for t in trades:
            if t.exit_time and t.entry_time:
                hold_times.append((t.exit_time - t.entry_time).total_seconds() / 3600)
        avg_hold = sum(hold_times) / len(hold_times) if hold_times else None

        return PerformanceMetricsResponse(
            profit_factor=round(profit_factor, 2),
            expectancy=round(expectancy, 2),
            sharpe_ratio=round(sharpe, 2) if sharpe is not None else None,
            avg_r_multiple=None,
            avg_hold_time_hours=round(avg_hold, 2) if avg_hold is not None else None,
        )
