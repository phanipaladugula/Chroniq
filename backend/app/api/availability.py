"""Availability API routes."""

import logging
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.availability import (
    AvailabilityScheduleCreate,
    AvailabilityScheduleResponse,
    AvailabilityScheduleUpdate,
    DateOverrideCreate,
    DateOverrideResponse,
)
from app.services import availability_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/availability", tags=["Availability"])

DEFAULT_USER_ID = 1


@router.get("/schedules", response_model=List[AvailabilityScheduleResponse])
async def list_schedules(db: AsyncSession = Depends(get_db)):
    """List all availability schedules for the default user."""
    return await availability_service.get_schedules(db, DEFAULT_USER_ID)


@router.post(
    "/schedules", response_model=AvailabilityScheduleResponse, status_code=status.HTTP_201_CREATED
)
async def create_schedule(data: AvailabilityScheduleCreate, db: AsyncSession = Depends(get_db)):
    """Create a new availability schedule."""
    return await availability_service.create_schedule(db, DEFAULT_USER_ID, data)


@router.get("/schedules/{schedule_id}", response_model=AvailabilityScheduleResponse)
async def get_schedule(schedule_id: int, db: AsyncSession = Depends(get_db)):
    """Get a schedule with all its rules and overrides."""
    return await availability_service.get_schedule(db, schedule_id)


@router.put("/schedules/{schedule_id}", response_model=AvailabilityScheduleResponse)
async def update_schedule(
    schedule_id: int, data: AvailabilityScheduleUpdate, db: AsyncSession = Depends(get_db)
):
    """Update a schedule and optionally replace its rules."""
    return await availability_service.update_schedule(db, schedule_id, data)


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(schedule_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a schedule (fails if in use by event types)."""
    await availability_service.delete_schedule(db, schedule_id)


@router.patch("/schedules/{schedule_id}/default", response_model=AvailabilityScheduleResponse)
async def set_default_schedule(schedule_id: int, db: AsyncSession = Depends(get_db)):
    """Set a schedule as the default for the user."""
    return await availability_service.set_default_schedule(db, DEFAULT_USER_ID, schedule_id)


@router.post(
    "/schedules/{schedule_id}/overrides",
    response_model=DateOverrideResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_override(
    schedule_id: int, data: DateOverrideCreate, db: AsyncSession = Depends(get_db)
):
    """Add a date override to a schedule."""
    return await availability_service.add_date_override(db, schedule_id, data)


@router.delete("/overrides/{override_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_override(override_id: int, db: AsyncSession = Depends(get_db)):
    """Remove a date override."""
    await availability_service.remove_date_override(db, override_id)
