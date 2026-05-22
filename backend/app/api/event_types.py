"""Event Types API routes."""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.schemas.event_type import (
    EventTypeCreate,
    EventTypeResponse,
    EventTypeToggle,
    EventTypeUpdate,
)
from app.services import event_type_service

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/event-types", tags=["Event Types"])

DEFAULT_USER_ID = 1


@router.get("/", response_model=List[EventTypeResponse])
async def list_event_types(db: AsyncSession = Depends(get_db)):
    """List all event types for the default user."""
    return await event_type_service.get_event_types(db, DEFAULT_USER_ID)


@router.post("/", response_model=EventTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_event_type(
    data: EventTypeCreate, db: AsyncSession = Depends(get_db)
):
    """Create a new event type. Slug can be custom or auto-generated from title."""
    return await event_type_service.create_event_type(db, DEFAULT_USER_ID, data)


@router.get("/{event_type_id}", response_model=EventTypeResponse)
async def get_event_type(event_type_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single event type by ID."""
    return await event_type_service.get_event_type(db, event_type_id)


@router.put("/{event_type_id}", response_model=EventTypeResponse)
async def update_event_type(
    event_type_id: int, data: EventTypeUpdate, db: AsyncSession = Depends(get_db)
):
    """Update an event type."""
    return await event_type_service.update_event_type(db, event_type_id, data)


@router.delete("/{event_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event_type(event_type_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an event type."""
    await event_type_service.delete_event_type(db, event_type_id)


@router.patch("/{event_type_id}/toggle", response_model=EventTypeResponse)
async def toggle_event_type(
    event_type_id: int, data: EventTypeToggle, db: AsyncSession = Depends(get_db)
):
    """Toggle active/inactive status of an event type."""
    return await event_type_service.toggle_event_type(db, event_type_id, data.is_active)
