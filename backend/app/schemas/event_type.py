"""Pydantic schemas for EventType."""

from typing import Optional

from pydantic import AwareDatetime, BaseModel, Field, field_validator


class EventTypeCreate(BaseModel):
    """Schema for creating an event type."""

    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    duration_minutes: int = Field(default=30, ge=5, le=480)
    slug: str = Field(..., min_length=1, max_length=100)
    location_type: str = Field(default="google_meet")
    location_value: Optional[str] = None
    color: str = Field(default="#292929", max_length=7)
    buffer_before: int = Field(default=0, ge=0, le=120)
    buffer_after: int = Field(default=0, ge=0, le=120)
    min_notice_minutes: int = Field(default=60, ge=0)
    max_advance_days: int = Field(default=60, ge=1, le=365)
    custom_questions: list = Field(default_factory=list)
    schedule_id: Optional[int] = None

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        """Ensure slug is URL-safe: lowercase, hyphens only, no spaces."""
        import re
        if not re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", v):
            raise ValueError(
                "Slug must be lowercase, contain only letters, numbers, and hyphens, "
                "and cannot start or end with a hyphen."
            )
        return v

    @field_validator("location_type")
    @classmethod
    def validate_location_type(cls, v: str) -> str:
        allowed = {"google_meet", "zoom", "phone", "in_person", "custom"}
        if v not in allowed:
            raise ValueError(f"location_type must be one of: {', '.join(sorted(allowed))}")
        return v

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str) -> str:
        import re
        if not re.match(r"^#[0-9a-fA-F]{6}$", v):
            raise ValueError("Color must be a valid hex color code (e.g., #292929)")
        return v

    model_config = {"from_attributes": True}


class EventTypeUpdate(BaseModel):
    """Schema for updating an event type. All fields optional."""

    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=5, le=480)
    slug: Optional[str] = Field(None, min_length=1, max_length=100)
    location_type: Optional[str] = None
    location_value: Optional[str] = None
    color: Optional[str] = Field(None, max_length=7)
    buffer_before: Optional[int] = Field(None, ge=0, le=120)
    buffer_after: Optional[int] = Field(None, ge=0, le=120)
    min_notice_minutes: Optional[int] = Field(None, ge=0)
    max_advance_days: Optional[int] = Field(None, ge=1, le=365)
    custom_questions: Optional[list] = None
    schedule_id: Optional[int] = None

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str | None) -> str | None:
        if v is None:
            return v
        import re
        if not re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", v):
            raise ValueError(
                "Slug must be lowercase, contain only letters, numbers, and hyphens."
            )
        return v

    @field_validator("location_type")
    @classmethod
    def validate_location_type(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed = {"google_meet", "zoom", "phone", "in_person", "custom"}
        if v not in allowed:
            raise ValueError(f"location_type must be one of: {', '.join(sorted(allowed))}")
        return v

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str | None) -> str | None:
        if v is None:
            return v
        import re
        if not re.match(r"^#[0-9a-fA-F]{6}$", v):
            raise ValueError("Color must be a valid hex color code (e.g., #292929)")
        return v

    model_config = {"from_attributes": True}


class EventTypeToggle(BaseModel):
    """Schema for toggling event type active status."""

    is_active: bool


class EventTypeResponse(BaseModel):
    """Schema for event type response."""

    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    duration_minutes: int
    slug: str
    location_type: str
    location_value: Optional[str] = None
    color: str
    is_active: bool
    buffer_before: int
    buffer_after: int
    min_notice_minutes: int
    max_advance_days: int
    custom_questions: list = []
    schedule_id: Optional[int] = None
    created_at: AwareDatetime
    updated_at: AwareDatetime

    model_config = {"from_attributes": True}
