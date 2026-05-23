import pytest
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from app.tz_utils import normalize_timezone, get_tz_info
from app.schemas.booking import BookingCreate

def test_timezone_normalization():
    assert normalize_timezone("Asia/Calcutta") == "Asia/Kolkata"
    assert normalize_timezone("US/Eastern") == "America/New_York"
    assert normalize_timezone("US/Central") == "America/Chicago"
    assert normalize_timezone("Etc/GMT") == "UTC"
    
    # Case insensitive
    assert normalize_timezone("asia/calcutta") == "Asia/Kolkata"
    
    # Standard IANA
    assert normalize_timezone("America/Sao_Paulo") == "America/Sao_Paulo"

def test_booking_create_schema_enforces_aware_datetime():
    # Naive string -> Pydantic AwareDatetime rejects it or parses it and complains?
    # Wait, AwareDatetime requires timezone info.
    from pydantic import ValidationError
    try:
        BookingCreate(
            booker_name="Test",
            booker_email="test@example.com",
            booker_timezone="America/Sao_Paulo",
            start_time="2026-05-23T01:30:00", # Naive
            custom_responses={},
        )
        assert False, "Should have raised ValidationError for naive datetime"
    except ValidationError as e:
        assert "Input should have timezone info" in str(e)
        
    # Aware string
    b = BookingCreate(
        booker_name="Test",
        booker_email="test@example.com",
        booker_timezone="America/Sao_Paulo",
        start_time="2026-05-23T01:30:00-03:00", # Aware
        custom_responses={},
    )
    assert b.start_time.tzinfo is not None

def test_dst_transitions():
    ny_tz = get_tz_info("America/New_York")
    # NY DST starts second Sunday in March (March 8, 2026).
    # Spring forward: 2:00 AM -> 3:00 AM
    dt_before = datetime(2026, 3, 7, 12, 0, tzinfo=ny_tz)
    dt_after = datetime(2026, 3, 9, 12, 0, tzinfo=ny_tz)
    
    # Difference in UTC should be 48 hours minus 1 hour = 47 hours
    diff = dt_after.astimezone(timezone.utc) - dt_before.astimezone(timezone.utc)
    assert diff == timedelta(hours=47)
    
    # London DST
    lon_tz = get_tz_info("Europe/London")
    dt_lon_before = datetime(2026, 3, 28, 12, 0, tzinfo=lon_tz)
    dt_lon_after = datetime(2026, 3, 30, 12, 0, tzinfo=lon_tz)
    diff_lon = dt_lon_after.astimezone(timezone.utc) - dt_lon_before.astimezone(timezone.utc)
    assert diff_lon == timedelta(hours=47)
