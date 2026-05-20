from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import UserResponse
from app.schemas.trade import TradeCreateRequest, TradeUpdateRequest, TradeResponse, PaginatedTradeResponse
from app.api.deps import require_user
from app.services.trade_service import TradeService

router = APIRouter(prefix="/api/trades", tags=["trades"])


@router.get("", response_model=PaginatedTradeResponse)
async def list_trades(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    symbol: str | None = Query(None),
    asset_type: str | None = Query(None),
    side: str | None = Query(None),
    status: str | None = Query(None),
    tag_id: str | None = Query(None),
    strategy_id: str | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    sort_by: str = Query("entry_time"),
    sort_order: str = Query("desc"),
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = TradeService(db)
    return await service.list_trades(
        user_id=user.id,
        page=page,
        page_size=page_size,
        symbol=symbol,
        asset_type=asset_type,
        side=side,
        status=status,
        tag_id=tag_id,
        strategy_id=strategy_id,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/{trade_id}", response_model=TradeResponse)
async def get_trade(
    trade_id: str,
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = TradeService(db)
    trade = await service.get_trade(trade_id, user_id=user.id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade


@router.post("", response_model=TradeResponse, status_code=201)
async def create_trade(
    request: TradeCreateRequest,
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = TradeService(db)
    return await service.create_trade(user_id=user.id, data=request)


@router.put("/{trade_id}", response_model=TradeResponse)
async def update_trade(
    trade_id: str,
    request: TradeUpdateRequest,
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = TradeService(db)
    trade = await service.update_trade(trade_id, user_id=user.id, data=request)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade


@router.delete("/{trade_id}")
async def delete_trade(
    trade_id: str,
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = TradeService(db)
    success = await service.delete_trade(trade_id, user_id=user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Trade not found")
    return {"message": "Trade deleted"}


@router.post("/import-csv")
async def import_csv(
    file: UploadFile = File(...),
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file encoding")
    service = TradeService(db)
    count = await service.import_csv(user_id=user.id, file_content=text)
    return {"message": f"Imported {count} trades", "count": count}
