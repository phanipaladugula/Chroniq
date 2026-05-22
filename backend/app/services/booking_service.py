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
from app.schemas.booking import BookingCreate
from app.utils import generate_meeting_url

logger = logging.getLogger(__name__)


async def create_booking(
    db: AsyncSession, event_type_id: int, data: BookingCreate
) -> Booking:
    """Create a booking with SELECT FOR UPDATE locking to prevent double-booking.

    Steps:
        1. Lock the event type row with FOR UPDATE
        2. Calculate end_time from start_time + duration
        3. Check for conflicts (existing bookings overlapping [start - buffer_before, end + buffer_after])
        4. If conflict found, raise HTTPException 409
        5. Create booking with uid=uuid4()
        6. Return booking
    """
    # 1. Lock the event type row
    result = await db.execute(
        select(EventType)
        .where(EventType.id == event_type_id)
        .with_for_update()
    )
    event_type = result.scalar_one_or_none()

    if not event_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event type not found",
        )

    if not event_type.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This event type is not currently active.",
        )

    # Ensure start_time is timezone-aware
    start_time = data.start_time
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)

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

    # 3. Check for conflicts with buffer times
    buffer_before = timedelta(minutes=event_type.buffer_before)
    buffer_after = timedelta(minutes=event_type.buffer_after)
    buffered_start = start_time - buffer_before
    buffered_end = end_time + buffer_after

    # Check across ALL event types for this user (prevent double-booking the host)
    all_event_types_result = await db.execute(
        select(EventType.id).where(EventType.user_id == event_type.user_id)
    )
    user_event_type_ids = [row[0] for row in all_event_types_result.all()]

    conflict_result = await db.execute(
        select(Booking).where(
            Booking.event_type_id.in_(user_event_type_ids),
            Booking.status == "confirmed",
            Booking.start_time < buffered_end,
            Booking.end_time > buffered_start,
        )
    )
    existing = conflict_result.scalar_one_or_none()

    # 4. If conflict, raise 409
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This time slot conflicts with an existing booking. Please choose another time.",
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
        notes=data.notes,
        meeting_url=generate_meeting_url(),
    )
    db.add(booking)
    await db.flush()
    await db.refresh(booking)

    logger.info(
        "Created booking uid=%s for event type %d at %s",
        booking.uid, event_type_id, start_time.isoformat(),
    )

    # 6. Return booking
    return booking


async def get_bookings(
    db: AsyncSession,
    user_id: int,
    status_filter: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[Sequence[Booking], int]:
    """Get bookings for a user's event types with pagination.

    Args:
        status_filter: 'upcoming', 'past', or 'cancelled'
        page: Page number (1-indexed)
        limit: Items per page

    Returns:
        Tuple of (bookings, total_count)
    """
    now_utc = datetime.now(timezone.utc)

    # Get all event type IDs for this user
    et_result = await db.execute(
        select(EventType.id).where(EventType.user_id == user_id)
    )
    user_event_type_ids = [row[0] for row in et_result.all()]

    if not user_event_type_ids:
        return [], 0

    # Build base query
    base_filter = Booking.event_type_id.in_(user_event_type_ids)

    if status_filter == "upcoming":
        status_condition = and_(
            Booking.status == "confirmed",
            Booking.start_time > now_utc,
        )
    elif status_filter == "past":
        status_condition = and_(
            Booking.status == "confirmed",
            Booking.start_time <= now_utc,
        )
    elif status_filter == "cancelled":
        status_condition = Booking.status == "cancelled"
    else:
        status_condition = None

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
        .order_by(Booking.start_time.desc())
        .offset(offset)
        .limit(limit)
    )
    if status_condition is not None:
        query = query.where(status_condition)

    result = await db.execute(query)
    bookings = result.scalars().all()

    return bookings, total


async def get_booking_by_uid(db: AsyncSession, uid: str) -> Booking:
    """Get a single booking by its public UID."""
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
        .options(selectinload(Booking.event_type))
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
    await db.refresh(booking)
    logger.info("Cancelled booking uid=%s, reason=%s", uid, reason)
    return booking


async def reschedule_booking(
    db: AsyncSession, uid: str, new_start_time: datetime
) -> Booking:
    """Reschedule a booking: cancel the old one and create a new one at the new time."""
    old_booking = await get_booking_by_uid(db, uid)

    if old_booking.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reschedule a cancelled booking.",
        )

    # Cancel the old booking
    old_booking.status = "rescheduled"
    old_booking.cancellation_reason = "Rescheduled to new time"

    # Create new booking at the new time
    new_booking_data = BookingCreate(
        booker_name=old_booking.booker_name,
        booker_email=old_booking.booker_email,
        booker_timezone=old_booking.booker_timezone,
        start_time=new_start_time,
        custom_responses=old_booking.custom_responses or {},
        notes=old_booking.notes,
    )

    new_booking = await create_booking(db, old_booking.event_type_id, new_booking_data)
    logger.info("Rescheduled booking uid=%s → new uid=%s", uid, new_booking.uid)
    return new_booking
