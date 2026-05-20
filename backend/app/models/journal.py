import uuid
from datetime import datetime, date
from sqlalchemy import String, Date, DateTime, ForeignKey, Text, Enum as SAEnum, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class EmotionalState(str, enum.Enum):
    confident = "confident"
    fearful = "fearful"
    impulsive = "impulsive"
    neutral = "neutral"
    greedy = "greedy"
    revenge = "revenge"
    disciplined = "disciplined"


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    pre_market_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    end_of_day_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    emotional_state: Mapped[EmotionalState | None] = mapped_column(SAEnum(EmotionalState), nullable=True)
    lessons_learned: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="journal_entries")
    trade_links = relationship("JournalEntryTrade", back_populates="journal_entry", cascade="all, delete-orphan")


class JournalEntryTrade(Base):
    __tablename__ = "journal_entry_trades"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    journal_entry_id: Mapped[str] = mapped_column(String(36), ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False)
    trade_id: Mapped[str] = mapped_column(String(36), ForeignKey("trades.id", ondelete="CASCADE"), nullable=False)

    journal_entry = relationship("JournalEntry", back_populates="trade_links")
    trade = relationship("Trade", back_populates="journal_links")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="custom")
    color: Mapped[str] = mapped_column(String(7), default="#6B7280")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="tags")
    trade_tags = relationship("TradeTag", back_populates="tag", cascade="all, delete-orphan")


class DailyChecklist(Base):
    __tablename__ = "daily_checklists"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    checklist_date: Mapped[date] = mapped_column(Date, nullable=False)
    items: Mapped[dict] = mapped_column(JSON, default=dict)
    completed: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="daily_checklists")
