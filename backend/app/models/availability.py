"""Availability schedule and rule models."""

from datetime import datetime, time, timezone

from sqlalchemy import Boolean, Integer, String, Time, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AvailabilitySchedule(Base):
    __tablename__ = "availability_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
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
    user = relationship("User", back_populates="availability_schedules")
    rules = relationship("AvailabilityRule", back_populates="schedule", cascade="all, delete-orphan")
    overrides = relationship("DateOverride", back_populates="schedule", cascade="all, delete-orphan")
    event_types = relationship("EventType", back_populates="schedule")

    def __repr__(self) -> str:
        return f"<AvailabilitySchedule(id={self.id}, name='{self.name}')>"


class AvailabilityRule(Base):
    __tablename__ = "availability_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    schedule_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("availability_schedules.id", ondelete="CASCADE"), nullable=False
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)

    __table_args__ = (
        UniqueConstraint("schedule_id", "day_of_week", "start_time", name="uq_schedule_day_start"),
    )

    # Relationships
    schedule = relationship("AvailabilitySchedule", back_populates="rules")

    def __repr__(self) -> str:
        return (
            f"<AvailabilityRule(id={self.id}, day={self.day_of_week}, "
            f"{self.start_time}-{self.end_time})>"
        )
