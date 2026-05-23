# ── Backend Dockerfile ──────────────────────────────────────────────────────
# Multi-stage: keep the final image lean (no build tools)
# ────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim AS base

# System deps needed by asyncpg / psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Install Python dependencies ──────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Copy application code ────────────────────────────────────────────────────
COPY . .

# ── Runtime config ───────────────────────────────────────────────────────────
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

# Entrypoint: start uvicorn (workers auto-scaled by Railway/Render; 1 worker fine for Compose)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
