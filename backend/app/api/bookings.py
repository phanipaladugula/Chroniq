"""Bookings admin API routes."""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.booking import BookingCancel, BookingReschedule, BookingResponse
from app.services import booking_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bookings", tags=["Bookings"])

DEFAULT_USER_ID = 1


@router.get("/", response_model=List[BookingResponse])
async def list_bookings(
    status: Optional[str] = Query(None, description="Filter: upcoming | past | cancelled"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List bookings for the default user with optional status filter."""
    bookings, total = await booking_service.get_bookings(
        db, DEFAULT_USER_ID, status_filter=status, page=page, limit=limit
    )
    return bookings


@router.get("/{uid}", response_model=BookingResponse)
async def get_booking(uid: str, db: AsyncSession = Depends(get_db)):
    """Get a booking by its public UID."""
    return await booking_service.get_booking_by_uid(db, uid)


@router.patch("/{uid}/cancel", response_model=BookingResponse)
async def cancel_booking(
    uid: str, data: BookingCancel, db: AsyncSession = Depends(get_db)
):
    """Cancel a booking."""
    booking = await booking_service.cancel_booking(db, uid, data.reason)
    await db.commit()
    return booking


@router.patch("/{uid}/reschedule", response_model=BookingResponse)
async def reschedule_booking(
    uid: str, data: BookingReschedule, db: AsyncSession = Depends(get_db)
):
    """Reschedule a booking to a new time."""
    booking = await booking_service.reschedule_booking(db, uid, data.new_start_time)
    await db.commit()
    return booking
