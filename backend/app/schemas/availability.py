"""Pydantic schemas for Availability schedules, rules, and date overrides."""

from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class AvailabilityRuleCreate(BaseModel):
    """Schema for creating an availability rule."""

    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    start_time: time
    end_time: time

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, v: time, info) -> time:
        start = info.data.get("start_time")
        if start and v <= start:
            raise ValueError("end_time must be after start_time")
        return v

    model_config = {"from_attributes": True}


class AvailabilityRuleResponse(BaseModel):
    """Schema for availability rule response."""

    id: int
    schedule_id: int
    day_of_week: int
    start_time: time
    end_time: time

    model_config = {"from_attributes": True}


class AvailabilityScheduleCreate(BaseModel):
    """Schema for creating an availability schedule with rules."""

    name: str = Field(..., min_length=1, max_length=100)
    timezone: str = Field(..., min_length=1, max_length=50)
    rules: list[AvailabilityRuleCreate] = Field(default_factory=list)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        import zoneinfo
        try:
            zoneinfo.ZoneInfo(v)
        except (KeyError, Exception):
            raise ValueError(f"Invalid timezone: {v}")
        return v

    model_config = {"from_attributes": True}


class AvailabilityScheduleUpdate(BaseModel):
    """Schema for updating an availability schedule."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    timezone: Optional[str] = Field(None, min_length=1, max_length=50)
    rules: Optional[list[AvailabilityRuleCreate]] = None

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        import zoneinfo
        try:
            zoneinfo.ZoneInfo(v)
        except (KeyError, Exception):
            raise ValueError(f"Invalid timezone: {v}")
        return v

    model_config = {"from_attributes": True}


class AvailabilityScheduleResponse(BaseModel):
    """Schema for availability schedule response."""

    id: int
    user_id: int
    name: str
    timezone: str
    is_default: bool
    rules: list[AvailabilityRuleResponse] = []
    overrides: list["DateOverrideResponse"] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DateOverrideCreate(BaseModel):
    """Schema for creating a date override."""

    override_date: date
    is_blocked: bool = True
    start_time: Optional[time] = None
    end_time: Optional[time] = None

    @field_validator("end_time")
    @classmethod
    def end_after_start_if_set(cls, v: time | None, info) -> time | None:
        start = info.data.get("start_time")
        is_blocked = info.data.get("is_blocked", True)
        if not is_blocked:
            if start is None or v is None:
                raise ValueError("start_time and end_time are required when is_blocked is False")
            if v <= start:
                raise ValueError("end_time must be after start_time")
        return v

    model_config = {"from_attributes": True}


class DateOverrideResponse(BaseModel):
    """Schema for date override response."""

    id: int
    schedule_id: int
    override_date: date
    is_blocked: bool
    start_time: Optional[time] = None
    end_time: Optional[time] = None

    model_config = {"from_attributes": True}
