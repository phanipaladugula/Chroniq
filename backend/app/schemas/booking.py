"""Pydantic schemas for Bookings and public-facing endpoints."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.event_type import EventTypeResponse


class BookingCreate(BaseModel):
    """Schema for creating a booking."""

    booker_name: str = Field(..., min_length=1, max_length=200)
    booker_email: EmailStr
    booker_timezone: str = Field(..., min_length=1, max_length=50)
    start_time: datetime
    custom_responses: dict = Field(default_factory=dict)
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class BookingResponse(BaseModel):
    """Schema for booking response."""

    id: int
    uid: UUID
    event_type_id: int
    booker_name: str
    booker_email: str
    booker_timezone: str
    start_time: datetime
    end_time: datetime
    status: str
    cancellation_reason: Optional[str] = None
    custom_responses: dict = {}
    meeting_url: Optional[str] = None
    notes: Optional[str] = None
    event_type: Optional[EventTypeResponse] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class BookingCancel(BaseModel):
    """Schema for cancelling a booking."""

    reason: Optional[str] = None


class BookingReschedule(BaseModel):
    """Schema for rescheduling a booking."""

    new_start_time: datetime


class AvailableSlot(BaseModel):
    """A single available time slot."""

    start_time: datetime
    end_time: datetime


class AvailableSlotsResponse(BaseModel):
    """Response schema for available slots query."""

    date: str
    timezone: str
    slots: list[AvailableSlot] = []


class PublicEventTypeResponse(BaseModel):
    """Event type details for the public booking page."""

    id: int
    title: str
    description: Optional[str] = None
    duration_minutes: int
    slug: str
    location_type: str
    location_value: Optional[str] = None
    color: str
    buffer_before: int
    buffer_after: int
    min_notice_minutes: int
    max_advance_days: int
    custom_questions: list = []
    host_name: str
    host_username: str
    host_avatar_url: Optional[str] = None
    host_timezone: str = "Asia/Kolkata"

    model_config = {"from_attributes": True}
