"""Database seed script.
Run with: python -m app.seed
"""

import sys
import uuid
from datetime import datetime, timedelta, timezone, time
from pathlib import Path

# Add parent dir so imports work
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import Base

# Use sync engine for seeding
settings = get_settings()
SYNC_URL = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://")

try:
    engine = create_engine(SYNC_URL, echo=False)
except Exception:
    # Fallback if psycopg2 not installed
    SYNC_URL2 = settings.DATABASE_URL.replace("+asyncpg", "")
    engine = create_engine(SYNC_URL2, echo=False)


def seed():
    from app.models.user import User
    from app.models.event_type import EventType
    from app.models.availability import AvailabilitySchedule, AvailabilityRule
    from app.models.booking import Booking

    # Create tables
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        # Check if already seeded
        existing = session.execute(select(User).where(User.username == "john")).scalar_one_or_none()
        if existing:
            print("✅ Database already seeded. Skipping.")
            return

        print("🌱 Seeding database...")

        # 1. Create default user
        user = User(
            name="John Doe",
            email="john@example.com",
            username="john",
            timezone="Asia/Kolkata",
            avatar_url=None,
        )
        session.add(user)
        session.flush()
        print(f"   Created user: {user.name} (@{user.username})")

        # 2. Create default availability schedule (Mon-Fri, 9AM-5PM IST)
        schedule = AvailabilitySchedule(
            user_id=user.id,
            name="Working Hours",
            timezone="Asia/Kolkata",
            is_default=True,
        )
        session.add(schedule)
        session.flush()

        # Add Mon-Fri rules (0=Monday, 4=Friday)
        for day in range(5):  # 0-4 = Mon-Fri
            rule = AvailabilityRule(
                schedule_id=schedule.id,
                day_of_week=day,
                start_time=time(9, 0),
                end_time=time(17, 0),
            )
            session.add(rule)
        session.flush()
        print(f"   Created schedule: {schedule.name} (Mon-Fri 9AM-5PM IST)")

        # 3. Create event types
        event_types_data = [
            {
                "title": "30 Minute Meeting",
                "description": "A quick 30-minute meeting to discuss your project, ideas, or any questions you have. Let's connect!",
                "duration_minutes": 30,
                "slug": "30min",
                "color": "#4f46e5",
                "location_type": "google_meet",
                "min_notice_minutes": 60,
                "max_advance_days": 60,
            },
            {
                "title": "60 Minute Consultation",
                "description": "A comprehensive 60-minute consultation session. Perfect for in-depth discussions, project planning, or technical reviews.",
                "duration_minutes": 60,
                "slug": "60min-consultation",
                "color": "#0891b2",
                "location_type": "zoom",
                "min_notice_minutes": 120,
                "max_advance_days": 30,
            },
            {
                "title": "Quick Chat",
                "description": "Got a quick question? Let's hop on a 15-minute call and sort it out.",
                "duration_minutes": 15,
                "slug": "quick-chat",
                "color": "#059669",
                "location_type": "phone",
                "min_notice_minutes": 30,
                "max_advance_days": 14,
            },
        ]

        event_types = []
        for et_data in event_types_data:
            et = EventType(
                user_id=user.id,
                schedule_id=schedule.id,
                is_active=True,
                buffer_before=0,
                buffer_after=0,
                custom_questions=[],
                **et_data,
            )
            session.add(et)
            event_types.append(et)
        session.flush()
        print(f"   Created {len(event_types)} event types")

        # 4. Create sample bookings
        now = datetime.now(timezone.utc)
        et_30min = event_types[0]
        et_60min = event_types[1]
        et_15min = event_types[2]

        bookings_data = [
            # Upcoming bookings
            {
                "event_type": et_30min,
                "booker_name": "Alice Johnson",
                "booker_email": "alice@example.com",
                "offset_days": 1,
                "hour": 10,
                "status": "confirmed",
            },
            {
                "event_type": et_60min,
                "booker_name": "Bob Smith",
                "booker_email": "bob@company.com",
                "offset_days": 3,
                "hour": 14,
                "status": "confirmed",
            },
            {
                "event_type": et_15min,
                "booker_name": "Carol Williams",
                "booker_email": "carol@startup.io",
                "offset_days": 5,
                "hour": 11,
                "status": "confirmed",
            },
            # Past bookings
            {
                "event_type": et_30min,
                "booker_name": "David Brown",
                "booker_email": "david@example.com",
                "offset_days": -3,
                "hour": 9,
                "status": "confirmed",
            },
            {
                "event_type": et_60min,
                "booker_name": "Emma Davis",
                "booker_email": "emma@design.co",
                "offset_days": -6,
                "hour": 15,
                "status": "cancelled",
                "cancellation_reason": "Schedule conflict",
            },
        ]

        for b in bookings_data:
            start = now.replace(
                hour=b["hour"], minute=0, second=0, microsecond=0
            ) + timedelta(days=b["offset_days"])
            end = start + timedelta(minutes=b["event_type"].duration_minutes)
            booking = Booking(
                uid=uuid.uuid4(),
                event_type_id=b["event_type"].id,
                booker_name=b["booker_name"],
                booker_email=b["booker_email"],
                booker_timezone="Asia/Kolkata",
                start_time=start,
                end_time=end,
                status=b["status"],
                cancellation_reason=b.get("cancellation_reason"),
                custom_responses={},
                meeting_url=f"https://meet.google.com/abc-defg-hij",
            )
            session.add(booking)

        session.commit()
        print(f"   Created {len(bookings_data)} sample bookings")
        print("✅ Database seeded successfully!")
        print(f"\n🔗 Public booking URL: http://localhost:5173/john/30min")
        print(f"📊 Dashboard: http://localhost:5173/event-types")


if __name__ == "__main__":
    seed()
