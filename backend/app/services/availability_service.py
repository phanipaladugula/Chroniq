"""Service layer for Availability schedules, rules, date overrides, and slot generation."""

import logging
from datetime import date, datetime, time, timedelta, timezone
from typing import Sequence
from zoneinfo import ZoneInfo

from app.tz_utils import get_tz_info

from fastapi import HTTPException, status
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.availability import AvailabilitySchedule, AvailabilityRule
from app.models.booking import Booking
from app.models.date_override import DateOverride
from app.models.event_type import EventType
from app.models.user import User
from app.schemas.availability import (
    AvailabilityScheduleCreate,
    AvailabilityScheduleUpdate,
    DateOverrideCreate,
)
from app.schemas.booking import AvailableSlot
from app.utils.conflicts import booking_conflicts

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Schedule CRUD
# ---------------------------------------------------------------------------

async def create_schedule(
    db: AsyncSession, user_id: int, data: AvailabilityScheduleCreate
) -> AvailabilitySchedule:
    """Create a new availability schedule with rules."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    schedule = AvailabilitySchedule(
        user_id=user_id,
        name=data.name,
        timezone=data.timezone,
        is_default=False,
    )
    db.add(schedule)
    await db.flush()

    # Add rules
    for rule_data in data.rules:
        rule = AvailabilityRule(
            schedule_id=schedule.id,
            day_of_week=rule_data.day_of_week,
            start_time=rule_data.start_time,
            end_time=rule_data.end_time,
        )
        db.add(rule)

    await db.flush()
    await db.refresh(schedule, attribute_names=["rules", "overrides"])
    logger.info("Created schedule '%s' (id=%d) for user %d", schedule.name, schedule.id, user_id)
    return schedule


async def get_schedules(db: AsyncSession, user_id: int) -> Sequence[AvailabilitySchedule]:
    """List all availability schedules for a user."""
    result = await db.execute(
        select(AvailabilitySchedule)
        .where(AvailabilitySchedule.user_id == user_id)
        .options(
            selectinload(AvailabilitySchedule.rules),
            selectinload(AvailabilitySchedule.overrides),
        )
        .order_by(AvailabilitySchedule.created_at.desc())
    )
    return result.scalars().all()


async def get_schedule(db: AsyncSession, schedule_id: int) -> AvailabilitySchedule:
    """Get a single schedule with rules and overrides."""
    result = await db.execute(
        select(AvailabilitySchedule)
        .where(AvailabilitySchedule.id == schedule_id)
        .options(
            selectinload(AvailabilitySchedule.rules),
            selectinload(AvailabilitySchedule.overrides),
        )
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    return schedule


async def update_schedule(
    db: AsyncSession, schedule_id: int, data: AvailabilityScheduleUpdate
) -> AvailabilitySchedule:
    """Update a schedule, optionally replacing all rules."""
    schedule = await get_schedule(db, schedule_id)

    if data.name is not None:
        schedule.name = data.name
    if data.timezone is not None:
        schedule.timezone = data.timezone

    # If rules are provided, replace all existing rules
    if data.rules is not None:
        await db.execute(
            delete(AvailabilityRule).where(AvailabilityRule.schedule_id == schedule_id)
        )
        for rule_data in data.rules:
            rule = AvailabilityRule(
                schedule_id=schedule_id,
                day_of_week=rule_data.day_of_week,
                start_time=rule_data.start_time,
                end_time=rule_data.end_time,
            )
            db.add(rule)

    await db.flush()
    await db.refresh(schedule, attribute_names=["rules", "overrides"])
    logger.info("Updated schedule id=%d", schedule_id)
    return schedule


async def delete_schedule(db: AsyncSession, schedule_id: int) -> None:
    """Delete a schedule. Fails if it's used by any event type."""
    schedule = await get_schedule(db, schedule_id)

    # Check if any event type references this schedule
    result = await db.execute(
        select(EventType).where(EventType.schedule_id == schedule_id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete schedule: it is in use by one or more event types. "
                   "Reassign or remove those event types first.",
        )

    await db.delete(schedule)
    await db.flush()
    logger.info("Deleted schedule id=%d", schedule_id)


async def set_default_schedule(
    db: AsyncSession, user_id: int, schedule_id: int
) -> AvailabilitySchedule:
    """Set a schedule as the user's default, unsetting all others."""
    schedule = await get_schedule(db, schedule_id)
    if schedule.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your schedule")

    # Unset all defaults for this user
    result = await db.execute(
        select(AvailabilitySchedule).where(
            AvailabilitySchedule.user_id == user_id,
            AvailabilitySchedule.is_default.is_(True),
        )
    )
    for s in result.scalars().all():
        s.is_default = False

    schedule.is_default = True
    await db.flush()
    await db.refresh(schedule, attribute_names=["rules", "overrides"])
    logger.info("Set schedule id=%d as default for user %d", schedule_id, user_id)
    return schedule


# ---------------------------------------------------------------------------
# Date Overrides
# ---------------------------------------------------------------------------

async def add_date_override(
    db: AsyncSession, schedule_id: int, data: DateOverrideCreate
) -> DateOverride:
    """Add a date override to a schedule."""
    # Ensure schedule exists
    await get_schedule(db, schedule_id)

    # Check for existing override on the same date
    existing = await db.execute(
        select(DateOverride).where(
            DateOverride.schedule_id == schedule_id,
            DateOverride.override_date == data.override_date,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An override for {data.override_date} already exists on this schedule.",
        )

    override = DateOverride(
        schedule_id=schedule_id,
        override_date=data.override_date,
        is_blocked=data.is_blocked,
        start_time=data.start_time,
        end_time=data.end_time,
    )
    db.add(override)
    await db.flush()
    await db.refresh(override)
    logger.info("Added date override for %s on schedule %d", data.override_date, schedule_id)
    return override


async def remove_date_override(db: AsyncSession, override_id: int) -> None:
    """Remove a date override."""
    override = await db.get(DateOverride, override_id)
    if not override:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Date override not found")
    await db.delete(override)
    await db.flush()
    logger.info("Removed date override id=%d", override_id)


# ---------------------------------------------------------------------------
# Available Slots — THE CORE ALGORITHM
# ---------------------------------------------------------------------------

async def get_available_slots(
    db: AsyncSession,
    event_type_id: int,
    target_date: date,
    requester_timezone: str,
) -> list[AvailableSlot]:
    """Generate available booking slots for a given date.

    Algorithm:
        1. Load event type + its schedule (or user default schedule).
        2. Check date overrides first (blocked = no slots; custom hours override rules).
        3. Get availability rules for the day of week.
        4. Generate slot windows based on event duration.
        5. Query existing confirmed bookings for that day (respecting buffer times).
        6. Filter out conflicting slots.
        7. Filter out past slots (now + min_notice_minutes).
        8. Filter out slots beyond max_advance_days.
        9. Convert to requester timezone.
        10. Return sorted slots.
    """
    try:
        req_tz = get_tz_info(requester_timezone)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # 1. Load event type with schedule
    result = await db.execute(
        select(EventType)
        .where(EventType.id == event_type_id)
        .options(selectinload(EventType.user))
    )
    event_type = result.scalar_one_or_none()
    if not event_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event type not found")

    # Get the schedule (event type's own or user's default)
    schedule = None
    if event_type.schedule_id:
        schedule_result = await db.execute(
            select(AvailabilitySchedule)
            .where(AvailabilitySchedule.id == event_type.schedule_id)
            .options(
                selectinload(AvailabilitySchedule.rules),
                selectinload(AvailabilitySchedule.overrides),
            )
        )
        schedule = schedule_result.scalar_one_or_none()

    if not schedule:
        # Fall back to user's default schedule
        schedule_result = await db.execute(
            select(AvailabilitySchedule)
            .where(
                AvailabilitySchedule.user_id == event_type.user_id,
                AvailabilitySchedule.is_default.is_(True),
            )
            .options(
                selectinload(AvailabilitySchedule.rules),
                selectinload(AvailabilitySchedule.overrides),
            )
        )
        schedule = schedule_result.scalar_one_or_none()

    if not schedule:
        logger.warning("No schedule found for event type %d", event_type_id)
        return []

    schedule_tz = get_tz_info(schedule.timezone)

    # 2. Check date overrides
    override = None
    for ovr in schedule.overrides:
        if ovr.override_date == target_date:
            override = ovr
            break

    if override and override.is_blocked:
        # Date is completely blocked
        return []

    # 3. Get availability windows for this day
    available_windows: list[tuple[time, time]] = []

    if override and not override.is_blocked:
        # Use custom override hours
        if override.start_time and override.end_time:
            available_windows.append((override.start_time, override.end_time))
    else:
        # Use regular rules — day_of_week: 0=Monday matches Python's weekday()
        day_of_week = target_date.weekday()
        for rule in schedule.rules:
            if rule.day_of_week == day_of_week:
                available_windows.append((rule.start_time, rule.end_time))

    if not available_windows:
        return []

    # Sort windows by start time
    available_windows.sort(key=lambda w: w[0])

    # 4. Generate slot windows based on duration
    duration = timedelta(minutes=event_type.duration_minutes)
    raw_slots: list[tuple[datetime, datetime]] = []

    for window_start, window_end in available_windows:
        # Create timezone-aware datetimes in the schedule's timezone
        slot_start_dt = datetime.combine(target_date, window_start, tzinfo=schedule_tz)
        window_end_dt = datetime.combine(target_date, window_end, tzinfo=schedule_tz)

        current = slot_start_dt
        while current + duration <= window_end_dt:
            slot_end = current + duration
            raw_slots.append((current, slot_end))
            # Advance by the duration (non-overlapping slots)
            current = slot_end

    if not raw_slots:
        return []

    # 5. Query existing confirmed bookings for the day (extended window for buffer)
    max_buffer = timedelta(hours=2)  # generous window to catch cross-day buffers
    day_start_utc = (
        datetime.combine(target_date, time.min, tzinfo=schedule_tz) - max_buffer
    ).astimezone(timezone.utc)
    day_end_utc = (
        datetime.combine(target_date, time.max, tzinfo=schedule_tz) + max_buffer
    ).astimezone(timezone.utc)

    # Get bookings for all user event types in the extended window
    all_event_types_result = await db.execute(
        select(EventType.id).where(EventType.user_id == event_type.user_id)
    )
    user_event_type_ids = [row[0] for row in all_event_types_result.all()]

    all_bookings_result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.event_type))
        .where(
            Booking.event_type_id.in_(user_event_type_ids),
            Booking.status == "confirmed",
            Booking.start_time < day_end_utc,
            Booking.end_time > day_start_utc,
        )
    )
    existing_bookings = all_bookings_result.scalars().all()

    buffer_before = timedelta(minutes=event_type.buffer_before)
    buffer_after = timedelta(minutes=event_type.buffer_after)

    # 6. Filter out conflicting slots
    now_utc = datetime.now(timezone.utc)
    min_notice = timedelta(minutes=event_type.min_notice_minutes)
    max_advance = timedelta(days=event_type.max_advance_days)

    available_slots: list[AvailableSlot] = []

    for slot_start, slot_end in raw_slots:
        # Convert to UTC for comparison
        slot_start_utc = slot_start.astimezone(timezone.utc)
        slot_end_utc = slot_end.astimezone(timezone.utc)

        # 7. Filter out past slots and slots within min_notice window
        if slot_start_utc < now_utc + min_notice:
            continue

        # 8. Filter out beyond max_advance
        if slot_start_utc > now_utc + max_advance:
            continue

        # 6. Check for conflicts with existing bookings (respecting buffers).
        # A slot [slot_start, slot_end] conflicts with booking [B_start, B_end] if:
        #   slot_start < B_end + buffer_after  AND  slot_end > B_start - buffer_before
        # i.e., the slot falls within the booking's buffered exclusion zone.
        has_conflict = False
        for bk in existing_bookings:
            if booking_conflicts(
                candidate_start=slot_start_utc,
                candidate_end=slot_end_utc,
                candidate_buffer_before=event_type.buffer_before,
                candidate_buffer_after=event_type.buffer_after,
                existing_booking=bk,
            ):
                has_conflict = True
                break

        if has_conflict:
            continue

        # 9. Convert to requester timezone
        slot_start_local = slot_start_utc.astimezone(req_tz)
        slot_end_local = slot_end_utc.astimezone(req_tz)

        available_slots.append(AvailableSlot(
            start_time=slot_start_local,
            end_time=slot_end_local,
        ))

    # 10. Sort and return
    available_slots.sort(key=lambda s: s.start_time)
    return available_slots
