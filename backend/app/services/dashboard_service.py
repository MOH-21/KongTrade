from datetime import date, datetime, timedelta
from sqlalchemy import select, func, and_, case, extract
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.trade import Trade, TradeStatus, TradeRating
from app.models.journal import JournalEntry
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    CalendarDayResponse,
    ZellaScoreResponse,
    StreakResponse,
    DrawdownResponse,
)
from app.services.zella_score import compute_zella_score


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_summary(self, user_id: str) -> DashboardSummaryResponse:
        # All closed trades
        result = await self.db.execute(
            select(Trade).where(
                Trade.user_id == user_id,
                Trade.status == TradeStatus.closed,
                Trade.pnl.isnot(None),
            ).order_by(Trade.entry_time.desc())
        )
        trades = result.scalars().all()

        if not trades:
            return DashboardSummaryResponse(
                net_pnl=0, total_trades=0, winning_trades=0, losing_trades=0,
                win_rate=0, profit_factor=0, avg_win=0, avg_loss=0,
                best_day=None, worst_day=None, expectancy=0, total_fees=0,
            )

        wins = [t for t in trades if t.pnl and t.pnl > 0]
        losses = [t for t in trades if t.pnl and t.pnl < 0]

        net_pnl = sum(t.pnl or 0 for t in trades)
        total_trades = len(trades)
        winning_trades = len(wins)
        losing_trades = len(losses)
        win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
        gross_profit = sum(t.pnl for t in wins if t.pnl) or 0
        gross_loss = abs(sum(t.pnl for t in losses if t.pnl)) or 1
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0
        avg_win = sum(t.pnl for t in wins if t.pnl) / len(wins) if wins else 0
        avg_loss = sum(t.pnl for t in losses if t.pnl) / len(losses) if losses else 0
        total_fees = sum(t.fees + t.commission for t in trades)

        # Best/worst day
        day_pnl: dict[str, float] = {}
        for t in trades:
            day_key = t.entry_time.strftime("%Y-%m-%d")
            day_pnl[day_key] = day_pnl.get(day_key, 0) + (t.pnl or 0)

        best_day_key = max(day_pnl, key=day_pnl.get)
        worst_day_key = min(day_pnl, key=day_pnl.get)

        expectancy = (win_rate / 100 * avg_win) - ((1 - win_rate / 100) * abs(avg_loss)) if total_trades > 0 else 0

        return DashboardSummaryResponse(
            net_pnl=net_pnl,
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            win_rate=round(win_rate, 2),
            profit_factor=round(profit_factor, 2),
            avg_win=round(avg_win, 2),
            avg_loss=round(avg_loss, 2),
            best_day={"date": best_day_key, "pnl": round(day_pnl[best_day_key], 2)},
            worst_day={"date": worst_day_key, "pnl": round(day_pnl[worst_day_key], 2)},
            expectancy=round(expectancy, 2),
            total_fees=round(total_fees, 2),
        )

    async def get_calendar(self, user_id: str, month: int | None = None, year: int | None = None) -> list[CalendarDayResponse]:
        now = date.today()
        if not year:
            year = now.year
        if not month:
            month = now.month

        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)

        result = await self.db.execute(
            select(Trade).where(
                Trade.user_id == user_id,
                Trade.status == TradeStatus.closed,
                Trade.pnl.isnot(None),
                Trade.entry_time >= datetime(start_date.year, start_date.month, 1),
                Trade.entry_time < datetime(end_date.year, end_date.month, 1),
            )
        )
        trades = result.scalars().all()

        day_data: dict[date, dict] = {}
        for t in trades:
            d = t.entry_time.date()
            if d not in day_data:
                day_data[d] = {"pnl": 0.0, "count": 0}
            day_data[d]["pnl"] += t.pnl or 0
            day_data[d]["count"] += 1

        calendar_days = []
        current = start_date
        while current < end_date:
            dd = day_data.get(current)
            calendar_days.append(CalendarDayResponse(
                date=current,
                pnl=round(dd["pnl"], 2) if dd else 0,
                trade_count=dd["count"] if dd else 0,
                is_win=True if dd and dd["pnl"] > 0 else (False if dd and dd["pnl"] < 0 else None),
            ))
            current += timedelta(days=1)

        return calendar_days

    async def get_zella_score(self, user_id: str) -> ZellaScoreResponse:
        result = await self.db.execute(
            select(Trade).where(
                Trade.user_id == user_id,
                Trade.status == TradeStatus.closed,
                Trade.pnl.isnot(None),
            ).order_by(Trade.entry_time.desc())
        )
        trades = result.scalars().all()

        if not trades:
            return compute_zella_score(0, 0, 0, 0, None)

        wins = [t for t in trades if t.pnl and t.pnl > 0]
        win_rate = len(wins) / len(trades) if trades else 0
        gross_profit = sum(t.pnl for t in wins if t.pnl) or 0
        gross_loss = abs(sum(t.pnl for t in trades if t.pnl and t.pnl < 0)) or 1
        profit_factor = gross_profit / gross_loss

        # Consistency: % of trading days that are profitable
        day_results: dict[str, float] = {}
        for t in trades:
            d = t.entry_time.date().isoformat()
            day_results[d] = day_results.get(d, 0) + (t.pnl or 0)
        profitable_days = sum(1 for v in day_results.values() if v > 0)
        consistency = profitable_days / len(day_results) if day_results else 0

        # Max drawdown from daily cumulative
        days = sorted(day_results.items())
        cumulative = 0.0
        peak = 0.0
        max_dd = 0.0
        for _, pnl in days:
            cumulative += pnl
            peak = max(peak, cumulative)
            dd = (peak - cumulative) / peak * 100 if peak > 0 else 0
            max_dd = max(max_dd, dd)

        # Average trade rating
        rated_trades = [t for t in trades if t.rating]
        rating_map = {"A+": 100, "A": 90, "B": 80, "C": 60, "D": 40, "F": 20}
        avg_rating = (
            sum(rating_map.get((t.rating.value if hasattr(t.rating, 'value') else t.rating), 50) for t in rated_trades) / len(rated_trades)
            if rated_trades else None
        )

        data = compute_zella_score(win_rate, profit_factor, consistency, max_dd, avg_rating)
        return ZellaScoreResponse(**data)

    async def get_streaks(self, user_id: str) -> StreakResponse:
        result = await self.db.execute(
            select(Trade).where(
                Trade.user_id == user_id,
                Trade.status == TradeStatus.closed,
                Trade.pnl.isnot(None),
            ).order_by(Trade.entry_time.asc())
        )
        trades = result.scalars().all()

        if not trades:
            return StreakResponse(current_win_streak=0, current_loss_streak=0, longest_win_streak=0, longest_loss_streak=0, current_day_win_streak=0)

        # Trade streaks
        current_win = 0
        current_loss = 0
        longest_win = 0
        longest_loss = 0

        for t in trades:
            if t.pnl and t.pnl > 0:
                current_win += 1
                current_loss = 0
                longest_win = max(longest_win, current_win)
            elif t.pnl and t.pnl < 0:
                current_loss += 1
                current_win = 0
                longest_loss = max(longest_loss, current_loss)

        # Day win streak
        day_pnl: dict[str, float] = {}
        for t in trades:
            d = t.entry_time.date().isoformat()
            day_pnl[d] = day_pnl.get(d, 0) + (t.pnl or 0)

        sorted_days = sorted(day_pnl.items())
        day_win_streak = 0
        for _, pnl in reversed(sorted_days):
            if pnl > 0:
                day_win_streak += 1
            else:
                break

        return StreakResponse(
            current_win_streak=current_win,
            current_loss_streak=current_loss,
            longest_win_streak=longest_win,
            longest_loss_streak=longest_loss,
            current_day_win_streak=day_win_streak,
        )

    async def get_drawdown(self, user_id: str) -> DrawdownResponse:
        result = await self.db.execute(
            select(Trade).where(
                Trade.user_id == user_id,
                Trade.status == TradeStatus.closed,
                Trade.pnl.isnot(None),
            ).order_by(Trade.entry_time.asc())
        )
        trades = result.scalars().all()

        if not trades:
            return DrawdownResponse(max_drawdown=0, max_drawdown_percent=0, max_drawdown_date=None, avg_drawdown=0, avg_drawdown_percent=0)

        day_pnl: dict[date, float] = {}
        for t in trades:
            d = t.entry_time.date()
            day_pnl[d] = day_pnl.get(d, 0) + (t.pnl or 0)

        days = sorted(day_pnl.items())
        cumulative = 0.0
        peak = 0.0
        max_dd = 0.0
        max_dd_date: date | None = None
        drawdowns: list[float] = []

        for d, pnl in days:
            cumulative += pnl
            if cumulative > peak:
                peak = cumulative
            if peak > 0:
                dd = (peak - cumulative) / peak * 100
                drawdowns.append(dd)
                if dd > max_dd:
                    max_dd = dd
                    max_dd_date = d

        avg_dd = sum(drawdowns) / len(drawdowns) if drawdowns else 0
        avg_dd_pct = avg_dd / 100 * peak if peak > 0 else 0

        return DrawdownResponse(
            max_drawdown=round(peak * max_dd / 100, 2),
            max_drawdown_percent=round(max_dd, 2),
            max_drawdown_date=max_dd_date,
            avg_drawdown=round(peak * avg_dd / 100, 2),
            avg_drawdown_percent=round(avg_dd, 2),
        )

    async def get_recent_trades(self, user_id: str, limit: int = 10):
        result = await self.db.execute(
            select(Trade).where(Trade.user_id == user_id).order_by(Trade.entry_time.desc()).limit(limit)
        )
        trades = result.scalars().all()
        from app.schemas.trade import TradeResponse
        return [TradeResponse.model_validate(t) for t in trades]
