import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Playbook(Base):
    __tablename__ = "playbooks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    asset_types: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    timeframes: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    entry_criteria: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    exit_criteria: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    risk_rules: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_template: Mapped[bool] = mapped_column(Boolean, default=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    success_rate: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()", onupdate="now()")

    user = relationship("User", back_populates="playbooks")
    trades = relationship("Trade", back_populates="strategy")
    scores = relationship("PlaybookScore", back_populates="playbook", cascade="all, delete-orphan")


class PlaybookScore(Base):
    __tablename__ = "playbook_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trade_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("trades.id", ondelete="CASCADE"), nullable=False)
    playbook_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("playbooks.id", ondelete="CASCADE"), nullable=False)
    rule_following_score: Mapped[int] = mapped_column(Integer, default=0)
    entry_score: Mapped[int] = mapped_column(Integer, default=0)
    exit_score: Mapped[int] = mapped_column(Integer, default=0)
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")

    trade = relationship("Trade", back_populates="playbook_scores")
    playbook = relationship("Playbook", back_populates="scores")
