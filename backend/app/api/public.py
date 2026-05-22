"""Public booking API routes — no authentication required."""

import logging
from datetime import date
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.database import get_db
from app.models.booking import Booking
from app.models.event_type import EventType
from app.models.user import User
from app.schemas.booking import (
    AvailableSlotsResponse,
    BookingCancel,
    BookingCreate,
    BookingReschedule,
    BookingResponse,
    PublicEventTypeResponse,
)
from app.services import availability_service, booking_service, event_type_service
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/public", tags=["Public Booking"])
email_service = EmailService(settings)


async def _load_booking_full(db: AsyncSession, booking_id: int) -> Booking:
    """Load a booking with event_type and user eager loaded."""
    result = await db.execute(
        select(Booking)
        .where(Booking.id == booking_id)
        .options(
            selectinload(Booking.event_type).selectinload(EventType.user)
        )
    )
    return result.scalar_one()


@router.get("/{username}/{slug}", response_model=PublicEventTypeResponse)
async def get_public_event_type(
    username: str, slug: str, db: AsyncSession = Depends(get_db)
):
    """Get event type details for the public booking page."""
    event_type = await event_type_service.get_event_type_by_slug(db, username, slug)
    return PublicEventTypeResponse(
        id=event_type.id,
        title=event_type.title,
        description=event_type.description,
        duration_minutes=event_type.duration_minutes,
        slug=event_type.slug,
        location_type=event_type.location_type,
        location_value=event_type.location_value,
        color=event_type.color,
        buffer_before=event_type.buffer_before,
        buffer_after=event_type.buffer_after,
        min_notice_minutes=event_type.min_notice_minutes,
        max_advance_days=event_type.max_advance_days,
        custom_questions=event_type.custom_questions or [],
        host_name=event_type.user.name,
        host_username=event_type.user.username,
        host_avatar_url=event_type.user.avatar_url,
        host_timezone=event_type.user.timezone,
    )


@router.get("/{username}/{slug}/slots", response_model=AvailableSlotsResponse)
async def get_available_slots(
    username: str,
    slug: str,
    date: date = Query(..., description="Date in YYYY-MM-DD format"),
    timezone: str = Query("Asia/Kolkata", description="IANA timezone string"),
    db: AsyncSession = Depends(get_db),
):
    """Get available time slots for a specific date."""
    event_type = await event_type_service.get_event_type_by_slug(db, username, slug)
    slots = await availability_service.get_available_slots(
        db, event_type.id, date, timezone
    )
    return AvailableSlotsResponse(date=str(date), timezone=timezone, slots=slots)


@router.post(
    "/{username}/{slug}/book",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_booking(
    username: str,
    slug: str,
    data: BookingCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Create a booking. Sends confirmation email asynchronously."""
    event_type = await event_type_service.get_event_type_by_slug(db, username, slug)
    booking = await booking_service.create_booking(db, event_type.id, data)
    await db.commit()

    # Reload with all relationships for email and response
    booking = await _load_booking_full(db, booking.id)

    # Send emails in background (never blocks booking)
    et = booking.event_type
    host = et.user if et else None
    background_tasks.add_task(
        email_service.send_booking_confirmation, booking, et, host
    )

    return booking


@router.get("/booking/{uid}", response_model=BookingResponse)
async def get_booking_confirmation(uid: str, db: AsyncSession = Depends(get_db)):
    """Get booking details for the confirmation page."""
    return await booking_service.get_booking_by_uid(db, uid)


@router.post("/booking/{uid}/cancel", response_model=BookingResponse)
async def cancel_booking_public(
    uid: str,
    data: BookingCancel,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Cancel a booking from the booker side."""
    # Get full booking before cancel for email
    old_booking = await booking_service.get_booking_by_uid(db, uid)
    et = old_booking.event_type
    host = et.user if hasattr(et, 'user') else None

    booking = await booking_service.cancel_booking(db, uid, data.reason)
    await db.commit()

    background_tasks.add_task(email_service.send_booking_cancellation, booking, et, host)
    return booking


@router.post("/booking/{uid}/reschedule", response_model=BookingResponse)
async def reschedule_booking_public(
    uid: str,
    data: BookingReschedule,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Reschedule a booking from the booker side."""
    old_booking = await booking_service.get_booking_by_uid(db, uid)
    old_start = old_booking.start_time
    old_end = old_booking.end_time

    new_booking = await booking_service.reschedule_booking(db, uid, data.new_start_time)
    await db.commit()

    # Reload with relations
    new_booking = await _load_booking_full(db, new_booking.id)
    et = new_booking.event_type
    host = et.user if et else None

    background_tasks.add_task(
        email_service.send_booking_reschedule, new_booking, et, host, old_start, old_end
    )
    return new_booking
