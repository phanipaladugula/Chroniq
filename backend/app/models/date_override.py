"""DateOverride model for schedule overrides on specific dates."""

from datetime import date, time

from sqlalchemy import Boolean, Date, Integer, Time, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DateOverride(Base):
    __tablename__ = "date_overrides"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    schedule_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("availability_schedules.id", ondelete="CASCADE"), nullable=False
    )
    override_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[time | None] = mapped_column(Time, nullable=True)

    __table_args__ = (
        UniqueConstraint("schedule_id", "override_date", name="uq_schedule_override_date"),
    )

    # Relationships
    schedule = relationship("AvailabilitySchedule", back_populates="overrides")

    def __repr__(self) -> str:
        return f"<DateOverride(id={self.id}, date={self.override_date}, blocked={self.is_blocked})>"
