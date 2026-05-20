import csv
import io
import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.trade import Trade, TradeTag, AssetType, TradeSide, TradeStatus, TradeRating
from app.schemas.trade import TradeCreateRequest, TradeUpdateRequest, TradeResponse, PaginatedTradeResponse


class TradeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_trades(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 25,
        symbol: str | None = None,
        asset_type: str | None = None,
        side: str | None = None,
        status: str | None = None,
        tag_id: str | None = None,
        strategy_id: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        sort_by: str = "entry_time",
        sort_order: str = "desc",
    ) -> PaginatedTradeResponse:
        conditions = [Trade.user_id == user_id]

        if symbol:
            conditions.append(Trade.symbol.ilike(f"%{symbol}%"))
        if asset_type:
            conditions.append(Trade.asset_type == AssetType(asset_type))
        if side:
            conditions.append(Trade.side == TradeSide(side))
        if status:
            conditions.append(Trade.status == TradeStatus(status))
        if strategy_id:
            conditions.append(Trade.strategy_id == strategy_id)
        if start_date:
            conditions.append(Trade.entry_time >= datetime.fromisoformat(start_date))
        if end_date:
            conditions.append(Trade.entry_time <= datetime.fromisoformat(end_date))

        # Tag filter via join
        query = select(Trade)
        if tag_id:
            query = query.join(TradeTag, Trade.id == TradeTag.trade_id).where(TradeTag.tag_id == tag_id)

        query = query.where(and_(*conditions))

        # Sorting
        sort_col = getattr(Trade, sort_by, Trade.entry_time)
        if sort_order == "asc":
            query = query.order_by(asc(sort_col))
        else:
            query = query.order_by(desc(sort_col))

        # Count
        count_query = select(func.count()).select_from(Trade)
        if tag_id:
            count_query = count_query.join(TradeTag, Trade.id == TradeTag.trade_id)
        count_query = count_query.where(and_(*conditions))
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        result = await self.db.execute(query)
        trades = result.scalars().all()

        return PaginatedTradeResponse(
            items=[TradeResponse.model_validate(t) for t in trades],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, (total + page_size - 1) // page_size),
        )

    async def get_trade(self, trade_id: str, user_id: str) -> TradeResponse | None:
        result = await self.db.execute(
            select(Trade).where(Trade.id == trade_id, Trade.user_id == user_id)
        )
        trade = result.scalar_one_or_none()
        if not trade:
            return None
        return TradeResponse.model_validate(trade)

    async def create_trade(self, user_id: str, data: TradeCreateRequest, account_id: str | None = None) -> TradeResponse:
        pnl = None
        pnl_percent = None
        if data.exit_price and data.exit_price > 0:
            if data.side == TradeSide.buy:
                pnl = (data.exit_price - data.entry_price) * data.quantity - data.fees - data.commission
            else:
                pnl = (data.entry_price - data.exit_price) * data.quantity - data.fees - data.commission
            if data.entry_price > 0:
                pnl_percent = (pnl / (data.entry_price * data.quantity)) * 100

        trade = Trade(
            user_id=user_id,
            account_id=account_id,
            symbol=data.symbol.upper(),
            asset_type=data.asset_type,
            side=data.side,
            quantity=data.quantity,
            entry_price=data.entry_price,
            exit_price=data.exit_price,
            entry_time=data.entry_time,
            exit_time=data.exit_time or (datetime.now(timezone.utc) if data.exit_price else None),
            pnl=pnl,
            pnl_percent=pnl_percent,
            fees=data.fees,
            commission=data.commission,
            status=TradeStatus.closed if data.exit_price else TradeStatus.open,
            notes=data.notes,
            strategy_id=data.strategy_id,
        )
        self.db.add(trade)
        await self.db.flush()

        # Attach tags
        for tag_id in data.tag_ids:
            self.db.add(TradeTag(trade_id=trade.id, tag_id=tag_id))

        await self.db.commit()
        await self.db.refresh(trade)
        return TradeResponse.model_validate(trade)

    async def update_trade(self, trade_id: str, user_id: str, data: TradeUpdateRequest) -> TradeResponse | None:
        result = await self.db.execute(
            select(Trade).where(Trade.id == trade_id, Trade.user_id == user_id)
        )
        trade = result.scalar_one_or_none()
        if not trade:
            return None

        if data.rating is not None:
            trade.rating = data.rating
        if data.notes is not None:
            trade.notes = data.notes
        if data.strategy_id is not None:
            trade.strategy_id = data.strategy_id

        # Update tags if provided
        if data.tag_ids is not None:
            # Remove existing
            await self.db.execute(
                select(TradeTag).where(TradeTag.trade_id == trade.id)
            )
            existing_tags = (await self.db.execute(
                select(TradeTag).where(TradeTag.trade_id == trade.id)
            )).scalars().all()
            for et in existing_tags:
                await self.db.delete(et)
            # Add new
            for tag_id in data.tag_ids:
                self.db.add(TradeTag(trade_id=trade.id, tag_id=tag_id))

        await self.db.commit()
        await self.db.refresh(trade)
        return TradeResponse.model_validate(trade)

    async def delete_trade(self, trade_id: str, user_id: str) -> bool:
        result = await self.db.execute(
            select(Trade).where(Trade.id == trade_id, Trade.user_id == user_id)
        )
        trade = result.scalar_one_or_none()
        if not trade:
            return False
        await self.db.delete(trade)
        await self.db.commit()
        return True

    async def import_csv(self, user_id: str, file_content: str) -> int:
        """Import trades from CSV. Returns count of imported trades."""
        reader = csv.DictReader(io.StringIO(file_content))
        count = 0
        for row in reader:
            try:
                side = TradeSide.buy if "buy" in row.get("side", "").lower() else TradeSide.sell
                entry_time = datetime.fromisoformat(row.get("entry_time", "").replace("Z", "+00:00"))
                exit_price = float(row.get("exit_price", 0)) if row.get("exit_price") else None
                exit_time = datetime.fromisoformat(row["exit_time"].replace("Z", "+00:00")) if row.get("exit_time") and exit_price else None

                trade = Trade(
                    user_id=user_id,
                    symbol=row.get("symbol", "").upper(),
                    asset_type=AssetType(row.get("asset_type", "stock")),
                    side=side,
                    quantity=float(row.get("quantity", 0)),
                    entry_price=float(row.get("entry_price", 0)),
                    exit_price=exit_price,
                    entry_time=entry_time,
                    exit_time=exit_time,
                    fees=float(row.get("fees", 0)),
                    commission=float(row.get("commission", 0)),
                    status=TradeStatus.closed if exit_price else TradeStatus.open,
                    notes=row.get("notes", ""),
                )
                self.db.add(trade)
                count += 1
            except (KeyError, ValueError) as e:
                print(f"Skipping row: {e}")
                continue

        await self.db.commit()
        return count
