"""Booking model."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text, ForeignKey, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4
    )
    event_type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("event_types.id", ondelete="CASCADE"), nullable=False
    )
    booker_name: Mapped[str] = mapped_column(String(200), nullable=False)
    booker_email: Mapped[str] = mapped_column(String(255), nullable=False)
    booker_timezone: Mapped[str] = mapped_column(String(50), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="confirmed", nullable=False)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    custom_responses: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    meeting_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_bookings_event_type_start", "event_type_id", "start_time"),
        Index("ix_bookings_uid", "uid"),
    )

    # Relationships
    event_type = relationship("EventType", back_populates="bookings")

    def __repr__(self) -> str:
        return f"<Booking(id={self.id}, uid={self.uid}, status='{self.status}')>"
