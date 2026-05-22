"""EventType model."""

from datetime import datetime, timezone

from sqlalchemy import Boolean, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EventType(Base):
    __tablename__ = "event_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    location_type: Mapped[str] = mapped_column(String(50), default="google_meet", nullable=False)
    location_value: Mapped[str | None] = mapped_column(String(500), nullable=True)
    color: Mapped[str] = mapped_column(String(7), default="#292929", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    buffer_before: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    buffer_after: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    min_notice_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    max_advance_days: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    custom_questions: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    schedule_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("availability_schedules.id", ondelete="SET NULL"), nullable=True
    )
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

    # Relationships
    user = relationship("User", back_populates="event_types")
    schedule = relationship("AvailabilitySchedule", back_populates="event_types")
    bookings = relationship("Booking", back_populates="event_type", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<EventType(id={self.id}, title='{self.title}', slug='{self.slug}')>"
