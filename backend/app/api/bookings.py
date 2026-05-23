"""Bookings admin API routes — list, cancel, reschedule, and send requests."""

import logging
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.booking import Booking
from app.models.event_type import EventType
from app.schemas.booking import BookingCancel, BookingReschedule, BookingResponse
from app.services import booking_service
from app.services.email_service import EmailService
from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()
router = APIRouter(prefix="/bookings", tags=["Bookings"])
email_service = EmailService(settings)

DEFAULT_USER_ID = 1


async def _reload_booking(db: AsyncSession, booking_id: int) -> Booking:
    """Reload a booking with full relationships after mutation."""
    result = await db.execute(
        select(Booking)
        .where(Booking.id == booking_id)
        .options(selectinload(Booking.event_type).selectinload(EventType.user))
    )
    return result.scalar_one()


@router.get("", response_model=List[BookingResponse])
async def list_bookings(
    status: Optional[str] = Query(None, description="Filter: upcoming | past | cancelled"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List bookings for the default user with optional status filter, sorted correctly."""
    bookings, total = await booking_service.get_bookings(
        db, DEFAULT_USER_ID, status_filter=status, page=page, limit=limit
    )
    return bookings


@router.get("/recent", response_model=List[BookingResponse])
async def get_recent_bookings(
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """Get the most recently CREATED bookings for notification display."""
    bookings = await booking_service.get_recent_bookings(db, DEFAULT_USER_ID, limit=limit)
    return bookings


@router.get("/{uid}", response_model=BookingResponse)
async def get_booking(uid: str, db: AsyncSession = Depends(get_db)):
    """Get a booking by its public UID."""
    return await booking_service.get_booking_by_uid(db, uid)


@router.patch("/{uid}/cancel", response_model=BookingResponse)
async def cancel_booking(
    uid: str,
    data: BookingCancel,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Cancel a booking and send a cancellation email."""
    booking = await booking_service.cancel_booking(db, uid, data.reason)
    await db.commit()

    full_booking = await _reload_booking(db, booking.id)
    et = full_booking.event_type
    host = et.user if et else None
    background_tasks.add_task(email_service.send_booking_cancellation, full_booking, et, host)
    return full_booking


@router.patch("/{uid}/reschedule", response_model=BookingResponse)
async def reschedule_booking(
    uid: str,
    data: BookingReschedule,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Reschedule a booking to a new time (updates in-place, same UID)."""
    old_booking = await booking_service.get_booking_by_uid(db, uid)
    old_start = old_booking.start_time
    old_end = old_booking.end_time

    booking = await booking_service.reschedule_booking(db, uid, data.new_start_time)
    await db.commit()

    full_booking = await _reload_booking(db, booking.id)
    et = full_booking.event_type
    host = et.user if et else None
    background_tasks.add_task(
        email_service.send_booking_reschedule, full_booking, et, host, old_start, old_end
    )
    return full_booking


class RequestEmailPayload(BaseModel):
    message: Optional[str] = None  # optional custom message from admin


@router.post("/{uid}/request-reschedule", status_code=status.HTTP_200_OK)
async def request_reschedule_from_client(
    uid: str,
    payload: RequestEmailPayload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Send an email to the booker asking them to reschedule the meeting."""
    booking = await booking_service.get_booking_by_uid(db, uid)
    et = booking.event_type
    host = et.user if et else None

    background_tasks.add_task(
        email_service.send_reschedule_request, booking, et, host, payload.message
    )
    return {"message": f"Reschedule request sent to {booking.booker_email}"}


@router.post("/{uid}/request-cancel", status_code=status.HTTP_200_OK)
async def request_cancel_from_client(
    uid: str,
    payload: RequestEmailPayload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Send an email to the booker asking them to cancel the meeting."""
    booking = await booking_service.get_booking_by_uid(db, uid)
    et = booking.event_type
    host = et.user if et else None

    background_tasks.add_task(
        email_service.send_cancel_request, booking, et, host, payload.message
    )
    return {"message": f"Cancel request sent to {booking.booker_email}"}
