"""Service layer for EventType CRUD operations."""

import logging
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.event_type import EventType
from app.models.user import User
from app.schemas.event_type import EventTypeCreate, EventTypeUpdate
from app.utils import slugify

logger = logging.getLogger(__name__)


async def create_event_type(
    db: AsyncSession, user_id: int, data: EventTypeCreate
) -> EventType:
    """Create a new event type for a user.

    Validates slug uniqueness and auto-generates a slug from the title if needed.
    """
    # Validate user exists
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Ensure slug is URL-safe
    slug = slugify(data.slug) if data.slug else slugify(data.title)

    # Check slug uniqueness
    existing = await db.execute(
        select(EventType).where(EventType.slug == slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An event type with slug '{slug}' already exists.",
        )

    event_type = EventType(
        user_id=user_id,
        title=data.title,
        description=data.description,
        duration_minutes=data.duration_minutes,
        slug=slug,
        location_type=data.location_type,
        location_value=data.location_value,
        color=data.color,
        buffer_before=data.buffer_before,
        buffer_after=data.buffer_after,
        min_notice_minutes=data.min_notice_minutes,
        max_advance_days=data.max_advance_days,
        custom_questions=data.custom_questions,
        schedule_id=data.schedule_id,
    )
    db.add(event_type)
    await db.flush()
    await db.refresh(event_type)
    logger.info("Created event type '%s' (id=%d) for user %d", event_type.title, event_type.id, user_id)
    return event_type


async def get_event_types(db: AsyncSession, user_id: int) -> Sequence[EventType]:
    """List all event types for a user."""
    result = await db.execute(
        select(EventType)
        .where(EventType.user_id == user_id)
        .order_by(EventType.created_at.desc())
    )
    return result.scalars().all()


async def get_event_type(db: AsyncSession, event_type_id: int) -> EventType:
    """Get a single event type by ID."""
    event_type = await db.get(EventType, event_type_id)
    if not event_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event type not found",
        )
    return event_type


async def update_event_type(
    db: AsyncSession, event_type_id: int, data: EventTypeUpdate
) -> EventType:
    """Update an existing event type."""
    event_type = await get_event_type(db, event_type_id)

    update_data = data.model_dump(exclude_unset=True)

    # If slug is being updated, check uniqueness
    if "slug" in update_data and update_data["slug"]:
        new_slug = slugify(update_data["slug"])
        existing = await db.execute(
            select(EventType).where(
                EventType.slug == new_slug,
                EventType.id != event_type_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An event type with slug '{new_slug}' already exists.",
            )
        update_data["slug"] = new_slug

    for field, value in update_data.items():
        setattr(event_type, field, value)

    await db.flush()
    await db.refresh(event_type)
    logger.info("Updated event type id=%d", event_type_id)
    return event_type


async def delete_event_type(db: AsyncSession, event_type_id: int) -> None:
    """Delete an event type by ID."""
    event_type = await get_event_type(db, event_type_id)
    await db.delete(event_type)
    await db.flush()
    logger.info("Deleted event type id=%d", event_type_id)


async def toggle_event_type(
    db: AsyncSession, event_type_id: int, is_active: bool
) -> EventType:
    """Toggle the active status of an event type."""
    event_type = await get_event_type(db, event_type_id)
    event_type.is_active = is_active
    await db.flush()
    await db.refresh(event_type)
    logger.info("Toggled event type id=%d active=%s", event_type_id, is_active)
    return event_type


async def get_event_type_by_slug(
    db: AsyncSession, username: str, slug: str
) -> EventType:
    """Get an event type by username and slug (for public pages)."""
    result = await db.execute(
        select(EventType)
        .join(User, EventType.user_id == User.id)
        .where(User.username == username, EventType.slug == slug, EventType.is_active.is_(True))
        .options(selectinload(EventType.user))
    )
    event_type = result.scalar_one_or_none()
    if not event_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event type not found or is not active.",
        )
    return event_type
