"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup with retry logic."""
    import asyncio
    logger.info("Starting Scalar Cal API...")
    max_retries = 5
    for attempt in range(max_retries):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables ready.")
            break
        except Exception as e:
            logger.warning("Database connection failed (attempt %d/%d): %s", attempt + 1, max_retries, e)
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(2)
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Scalar Cal API",
    description="Cal.com clone scheduling platform — FastAPI backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.api.event_types import router as event_types_router
from app.api.availability import router as availability_router
from app.api.bookings import router as bookings_router
from app.api.public import router as public_router

app.include_router(event_types_router, prefix="/api")
app.include_router(availability_router, prefix="/api")
app.include_router(bookings_router, prefix="/api")
app.include_router(public_router, prefix="/api")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "app": settings.APP_NAME}
