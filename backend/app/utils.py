"""Utility functions for the Scalar Cal application."""

import re
from datetime import datetime
from zoneinfo import ZoneInfo


def slugify(text: str) -> str:
    """Convert text to a URL-safe slug (lowercase, hyphens only).

    Args:
        text: The text to slugify.

    Returns:
        A URL-safe slug string.
    """
    # Convert to lowercase
    text = text.lower().strip()
    # Replace spaces and underscores with hyphens
    text = re.sub(r"[\s_]+", "-", text)
    # Remove non-alphanumeric characters (except hyphens)
    text = re.sub(r"[^a-z0-9-]", "", text)
    # Remove consecutive hyphens
    text = re.sub(r"-+", "-", text)
    # Remove leading/trailing hyphens
    text = text.strip("-")
    return text


def generate_meeting_url() -> str:
    """Generate a placeholder meeting URL.

    In production, this would integrate with Google Meet / Zoom API.

    Returns:
        A placeholder meeting URL string.
    """
    import uuid
    meeting_id = str(uuid.uuid4())[:12]
    return f"https://meet.scalar.app/{meeting_id}"


def format_datetime_for_display(dt: datetime, tz_name: str) -> str:
    """Format a datetime for human-readable display in the given timezone.

    Args:
        dt: A timezone-aware datetime (usually UTC).
        tz_name: IANA timezone name (e.g., 'Asia/Kolkata').

    Returns:
        Formatted string like 'Friday, May 23, 2026 at 2:30 PM IST'.
    """
    try:
        tz = ZoneInfo(tz_name)
    except (KeyError, Exception):
        tz = ZoneInfo("UTC")

    local_dt = dt.astimezone(tz)
    return local_dt.strftime("%A, %B %d, %Y at %I:%M %p %Z")


def format_time_for_display(dt: datetime, tz_name: str) -> str:
    """Format just the time portion for display.

    Args:
        dt: A timezone-aware datetime.
        tz_name: IANA timezone name.

    Returns:
        Formatted string like '2:30 PM'.
    """
    try:
        tz = ZoneInfo(tz_name)
    except (KeyError, Exception):
        tz = ZoneInfo("UTC")

    local_dt = dt.astimezone(tz)
    return local_dt.strftime("%I:%M %p")
