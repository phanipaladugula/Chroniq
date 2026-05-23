"""Service layer for Booking operations with SELECT FOR UPDATE locking."""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking
from app.models.event_type import EventType
from app.models.user import User
from app.schemas.booking import BookingCancel, BookingCreate
from app.utils.conflicts import booking_conflicts
from app.utils import generate_meeting_url

logger = logging.getLogger(__name__)


async def _load_booking_with_relations(db: AsyncSession, booking_id: int) -> Booking:
    """Load a booking with event_type (and its user) eagerly loaded."""
    from app.models.user import User  # avoid circular at module level
    result = await db.execute(
        select(Booking)
        .where(Booking.id == booking_id)
        .options(
            selectinload(Booking.event_type).selectinload(EventType.user)
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return booking


async def create_booking(
    db: AsyncSession, event_type_id: int, data: BookingCreate
) -> Booking:
    """Create a booking with SELECT FOR UPDATE locking to prevent double-booking."""
    # 1. Lock the event type row
    result = await db.execute(
        select(EventType)
        .where(EventType.id == event_type_id)
        .with_for_update()
    )
    event_type = result.scalar_one_or_none()

    if not event_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event type not found")

    if not event_type.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This event type is not currently active.",
        )

    # Pydantic ensures start_time is an AwareDatetime. Convert to UTC.
    start_time = data.start_time.astimezone(timezone.utc)
    
    logger.debug("Received booking request. Timezone context: incoming_tz=%s, start_time_utc=%s", data.booker_timezone, start_time.isoformat())

    # Validate min_notice
    now_utc = datetime.now(timezone.utc)
    min_notice = timedelta(minutes=event_type.min_notice_minutes)
    if start_time < now_utc + min_notice:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Booking must be at least {event_type.min_notice_minutes} minutes in advance.",
        )

    # Validate max_advance
    max_advance = timedelta(days=event_type.max_advance_days)
    if start_time > now_utc + max_advance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Booking cannot be more than {event_type.max_advance_days} days in advance.",
        )

    # 2. Calculate end_time
    duration = timedelta(minutes=event_type.duration_minutes)
    end_time = start_time + duration

    # 3. Check conflicts across ALL event types for this user (host double-booking prevention)
    buffer_before = event_type.buffer_before
    buffer_after = event_type.buffer_after
    
    candidate_effective_start = start_time - timedelta(minutes=buffer_before)
    candidate_effective_end = end_time + timedelta(minutes=buffer_after)

    all_event_types_result = await db.execute(
        select(EventType.id).where(EventType.user_id == event_type.user_id)
    )
    user_event_type_ids = [row[0] for row in all_event_types_result.all()]

    # Prefilter bookings that might overlap based on effective start and end
    conflict_result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.event_type))
        .where(
            Booking.event_type_id.in_(user_event_type_ids),
            Booking.status == "confirmed",
            Booking.start_time < candidate_effective_end,
            Booking.end_time > candidate_effective_start,
        )
    )
    possible_conflicts = conflict_result.scalars().all()
    
    for existing in possible_conflicts:
        if booking_conflicts(
            candidate_start=start_time,
            candidate_end=end_time,
            candidate_buffer_before=buffer_before,
            candidate_buffer_after=buffer_after,
            existing_booking=existing,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This time slot conflicts with an existing booking (including buffer times). Please choose another time.",
            )

    # 5. Create booking
    booking = Booking(
        uid=uuid.uuid4(),
        event_type_id=event_type_id,
        booker_name=data.booker_name,
        booker_email=data.booker_email,
        booker_timezone=data.booker_timezone,
        start_time=start_time,
        end_time=end_time,
        status="confirmed",
        custom_responses=data.custom_responses,
        notes=data.notes if hasattr(data, 'notes') else None,
        meeting_url=generate_meeting_url(),
    )
    db.add(booking)
    await db.flush()

    logger.info(
        "Created booking uid=%s for event type %d. Timezone context: incoming_tz=%s, start_time_utc=%s",
        booking.uid, event_type_id, data.booker_timezone, start_time.isoformat(),
    )
    return booking


async def get_bookings(
    db: AsyncSession,
    user_id: int,
    status_filter: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[Sequence[Booking], int]:
    """Get bookings for a user's event types with pagination, sorted correctly."""
    now_utc = datetime.now(timezone.utc)

    # Get all event type IDs for this user
    et_result = await db.execute(
        select(EventType.id).where(EventType.user_id == user_id)
    )
    user_event_type_ids = [row[0] for row in et_result.all()]

    if not user_event_type_ids:
        return [], 0

    base_filter = Booking.event_type_id.in_(user_event_type_ids)

    if status_filter == "upcoming":
        status_condition = and_(
            Booking.status == "confirmed",
            Booking.start_time > now_utc,
        )
        sort_order = Booking.start_time.asc()  # Earliest first
    elif status_filter == "past":
        status_condition = and_(
            Booking.status == "confirmed",
            Booking.start_time <= now_utc,
        )
        sort_order = Booking.start_time.desc()  # Most recent first
    elif status_filter == "cancelled":
        status_condition = Booking.status.in_(["cancelled", "rescheduled"])
        sort_order = Booking.start_time.desc()
    else:
        status_condition = None
        sort_order = Booking.start_time.desc()

    # Count total
    count_query = select(func.count(Booking.id)).where(base_filter)
    if status_condition is not None:
        count_query = count_query.where(status_condition)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Fetch page
    offset = (page - 1) * limit
    query = (
        select(Booking)
        .where(base_filter)
        .options(selectinload(Booking.event_type))
        .order_by(sort_order)
        .offset(offset)
        .limit(limit)
    )
    if status_condition is not None:
        query = query.where(status_condition)

    result = await db.execute(query)
    bookings = result.scalars().all()

    return bookings, total


async def get_recent_bookings(db: AsyncSession, user_id: int, limit: int = 5) -> Sequence[Booking]:
    """Get the most recently created bookings for notification purposes."""
    et_result = await db.execute(
        select(EventType.id).where(EventType.user_id == user_id)
    )
    user_event_type_ids = [row[0] for row in et_result.all()]
    if not user_event_type_ids:
        return []

    result = await db.execute(
        select(Booking)
        .where(
            Booking.event_type_id.in_(user_event_type_ids),
            Booking.status == "confirmed",
        )
        .options(selectinload(Booking.event_type))
        .order_by(Booking.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


async def get_booking_by_uid(db: AsyncSession, uid: str) -> Booking:
    """Get a single booking by its public UID with event_type loaded."""
    try:
        booking_uid = uuid.UUID(uid)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid booking UID format.",
        )

    result = await db.execute(
        select(Booking)
        .where(Booking.uid == booking_uid)
        .options(
            selectinload(Booking.event_type).selectinload(EventType.user)
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )
    return booking


async def cancel_booking(
    db: AsyncSession, uid: str, reason: str | None = None
) -> Booking:
    """Cancel a booking by UID."""
    booking = await get_booking_by_uid(db, uid)

    if booking.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This booking is already cancelled.",
        )

    booking.status = "cancelled"
    booking.cancellation_reason = reason
    await db.flush()
    logger.info("Cancelled booking uid=%s, reason=%s", uid, reason)
    return booking


async def reschedule_booking(
    db: AsyncSession, uid: str, new_start_time: datetime
) -> Booking:
    """Reschedule a booking IN-PLACE: update start/end time, keep same UID.

    This is preferred over cancel+create because the booking UID stays stable
    and the booker's confirmation link remains valid.
    """
    booking = await get_booking_by_uid(db, uid)

    if booking.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reschedule a cancelled booking.",
        )

    event_type = booking.event_type
    if not event_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event type not found for this booking.",
        )

    # Ensure new_start_time is in UTC.
    new_start_time = new_start_time.astimezone(timezone.utc)
    logger.debug("Rescheduling booking uid=%s. Timezone context: new_start_time_utc=%s", uid, new_start_time.isoformat())

    now_utc = datetime.now(timezone.utc)

    # Validate min_notice
    min_notice = timedelta(minutes=event_type.min_notice_minutes)
    if new_start_time < now_utc + min_notice:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"New time must be at least {event_type.min_notice_minutes} minutes from now.",
        )

    # Calculate new end_time
    duration = timedelta(minutes=event_type.duration_minutes)
    new_end_time = new_start_time + duration

    # Check for conflicts (excluding this booking itself)
    buffer_before = event_type.buffer_before
    buffer_after = event_type.buffer_after
    
    candidate_effective_start = new_start_time - timedelta(minutes=buffer_before)
    candidate_effective_end = new_end_time + timedelta(minutes=buffer_after)

    all_event_types_result = await db.execute(
        select(EventType.id).where(EventType.user_id == event_type.user_id)
    )
    user_event_type_ids = [row[0] for row in all_event_types_result.all()]

    conflict_result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.event_type))
        .where(
            Booking.id != booking.id,  # exclude self
            Booking.event_type_id.in_(user_event_type_ids),
            Booking.status == "confirmed",
            Booking.start_time < candidate_effective_end,
            Booking.end_time > candidate_effective_start,
        )
    )
    possible_conflicts = conflict_result.scalars().all()
    
    for existing in possible_conflicts:
        if booking_conflicts(
            candidate_start=new_start_time,
            candidate_end=new_end_time,
            candidate_buffer_before=buffer_before,
            candidate_buffer_after=buffer_after,
            existing_booking=existing,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The new time conflicts with an existing booking.",
            )

    # Update in-place
    old_start = booking.start_time
    booking.start_time = new_start_time
    booking.end_time = new_end_time
    booking.status = "confirmed"

    await db.flush()
    logger.info(
        "Rescheduled booking uid=%s from %s → %s",
        uid, old_start.isoformat(), new_start_time.isoformat(),
    )
    return booking
