from datetime import datetime, timedelta, timezone
from app.utils.conflicts import booking_conflicts

class MockEventType:
    def __init__(self, buffer_before=0, buffer_after=0):
        self.buffer_before = buffer_before
        self.buffer_after = buffer_after

class MockBooking:
    def __init__(self, start_time, end_time, buffer_before=0, buffer_after=0):
        self.start_time = start_time
        self.end_time = end_time
        self.event_type = MockEventType(buffer_before, buffer_after)

def test_exact_boundary():
    # Existing booking: 10:00 -> 10:30, buffer_after = 15. Effective end = 10:45
    dt_10_00 = datetime(2026, 5, 23, 10, 0, tzinfo=timezone.utc)
    dt_10_30 = datetime(2026, 5, 23, 10, 30, tzinfo=timezone.utc)
    
    existing = MockBooking(dt_10_00, dt_10_30, buffer_before=0, buffer_after=15)
    
    # Candidate: 10:45 -> 11:15, no buffers
    dt_10_45 = datetime(2026, 5, 23, 10, 45, tzinfo=timezone.utc)
    dt_11_15 = datetime(2026, 5, 23, 11, 15, tzinfo=timezone.utc)
    
    # Must succeed (no conflict)
    assert not booking_conflicts(
        candidate_start=dt_10_45,
        candidate_end=dt_11_15,
        candidate_buffer_before=0,
        candidate_buffer_after=0,
        existing_booking=existing,
    )

def test_exact_boundary_with_candidate_buffer():
    # Existing booking: 10:00 -> 10:30, buffer_after = 0. Effective end = 10:30
    dt_10_00 = datetime(2026, 5, 23, 10, 0, tzinfo=timezone.utc)
    dt_10_30 = datetime(2026, 5, 23, 10, 30, tzinfo=timezone.utc)
    existing = MockBooking(dt_10_00, dt_10_30, buffer_before=0, buffer_after=0)
    
    # Candidate: 10:45 -> 11:15, buffer_before = 15. Candidate effective start = 10:30
    dt_10_45 = datetime(2026, 5, 23, 10, 45, tzinfo=timezone.utc)
    dt_11_15 = datetime(2026, 5, 23, 11, 15, tzinfo=timezone.utc)
    
    # Must succeed (no conflict)
    assert not booking_conflicts(
        candidate_start=dt_10_45,
        candidate_end=dt_11_15,
        candidate_buffer_before=15,
        candidate_buffer_after=0,
        existing_booking=existing,
    )

def test_cross_event_type_buffer_conflict():
    # Existing booking: 10:00 -> 10:30, buffer_before=15, buffer_after=15
    dt_10_00 = datetime(2026, 5, 23, 10, 0, tzinfo=timezone.utc)
    dt_10_30 = datetime(2026, 5, 23, 10, 30, tzinfo=timezone.utc)
    existing = MockBooking(dt_10_00, dt_10_30, buffer_before=15, buffer_after=15)
    
    # Candidate: 9:15 -> 9:45, buffer_after=15
    # Candidate effective end = 10:00. Existing effective start = 9:45. Overlap!
    dt_09_15 = datetime(2026, 5, 23, 9, 15, tzinfo=timezone.utc)
    dt_09_45 = datetime(2026, 5, 23, 9, 45, tzinfo=timezone.utc)
    
    assert booking_conflicts(
        candidate_start=dt_09_15,
        candidate_end=dt_09_45,
        candidate_buffer_before=0,
        candidate_buffer_after=15,
        existing_booking=existing,
    )
    
    # Candidate: 9:00 -> 9:30, buffer_after=15
    # Candidate effective end = 9:45. Existing effective start = 9:45. No overlap!
    dt_09_00 = datetime(2026, 5, 23, 9, 0, tzinfo=timezone.utc)
    dt_09_30 = datetime(2026, 5, 23, 9, 30, tzinfo=timezone.utc)
    
    assert not booking_conflicts(
        candidate_start=dt_09_00,
        candidate_end=dt_09_30,
        candidate_buffer_before=0,
        candidate_buffer_after=15,
        existing_booking=existing,
    )
