import uuid
from datetime import datetime
from sqlalchemy import String, Float, DateTime, ForeignKey, Text, Enum as SAEnum, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class AssetType(str, enum.Enum):
    stock = "stock"
    option = "option"
    crypto = "crypto"
    futures = "futures"
    forex = "forex"


class TradeSide(str, enum.Enum):
    buy = "buy"
    sell = "sell"


class TradeStatus(str, enum.Enum):
    open = "open"
    closed = "closed"


class TradeRating(str, enum.Enum):
    A_PLUS = "A+"
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    F = "F"


class Trade(Base):
    __tablename__ = "trades"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    broker_connection_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("broker_connections.id", ondelete="SET NULL"), nullable=True)
    broker_order_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    asset_type: Mapped[AssetType] = mapped_column(SAEnum(AssetType), default=AssetType.stock)
    side: Mapped[TradeSide] = mapped_column(SAEnum(TradeSide), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)

    entry_price: Mapped[float] = mapped_column(Float, nullable=False)
    exit_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    entry_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    exit_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    pnl: Mapped[float | None] = mapped_column(Float, nullable=True)
    pnl_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    fees: Mapped[float] = mapped_column(Float, default=0.0)
    commission: Mapped[float] = mapped_column(Float, default=0.0)

    status: Mapped[TradeStatus] = mapped_column(SAEnum(TradeStatus), default=TradeStatus.closed)
    rating: Mapped[TradeRating | None] = mapped_column(SAEnum(TradeRating), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    running_pnl_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    strategy_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("playbooks.id", ondelete="SET NULL"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="trades")
    account = relationship("Account", back_populates="trades")
    strategy = relationship("Playbook", back_populates="trades")
    trade_tags = relationship("TradeTag", back_populates="trade", cascade="all, delete-orphan")
    journal_links = relationship("JournalEntryTrade", back_populates="trade", cascade="all, delete-orphan")
    playbook_scores = relationship("PlaybookScore", back_populates="trade", cascade="all, delete-orphan")


class TradeTag(Base):
    __tablename__ = "trade_tags"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trade_id: Mapped[str] = mapped_column(String(36), ForeignKey("trades.id", ondelete="CASCADE"), nullable=False)
    tag_id: Mapped[str] = mapped_column(String(36), ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)

    trade = relationship("Trade", back_populates="trade_tags")
    tag = relationship("Tag", back_populates="trade_tags")
