from datetime import datetime, timedelta

def booking_conflicts(
    candidate_start: datetime,
    candidate_end: datetime,
    candidate_buffer_before: int,
    candidate_buffer_after: int,
    existing_booking,
) -> bool:
    """
    Check if a candidate slot conflicts with an existing booking, taking into account buffers.
    
    Args:
        candidate_start: Start time of the candidate slot.
        candidate_end: End time of the candidate slot.
        candidate_buffer_before: Buffer minutes before the candidate slot.
        candidate_buffer_after: Buffer minutes after the candidate slot.
        existing_booking: The existing Booking model instance (MUST have event_type loaded).
        
    Returns:
        True if there is an overlap, False otherwise.
    """
    candidate_effective_start = candidate_start - timedelta(minutes=candidate_buffer_before)
    candidate_effective_end = candidate_end + timedelta(minutes=candidate_buffer_after)
    
    existing_buffer_before = existing_booking.event_type.buffer_before if existing_booking.event_type else 0
    existing_buffer_after = existing_booking.event_type.buffer_after if existing_booking.event_type else 0
    
    existing_effective_start = existing_booking.start_time - timedelta(minutes=existing_buffer_before)
    existing_effective_end = existing_booking.end_time + timedelta(minutes=existing_buffer_after)
    
    # Conflict exists when the two effective intervals overlap.
    # Overlap condition: A < D and B > C
    return (
        candidate_effective_start < existing_effective_end
        and candidate_effective_end > existing_effective_start
    )
