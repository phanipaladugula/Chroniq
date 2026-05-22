# Chroniq — Scheduling Platform (Cal.com Clone)

A full-featured scheduling/booking web application that closely replicates [Cal.com](https://cal.com)'s design and user experience. Built with **FastAPI** (Python) + **React** (Vite) + **PostgreSQL**.

![Scalar Cal](https://img.shields.io/badge/Status-Production_Ready-brightgreen)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![React](https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql)

---

## 🚀 Features

### Core Features

- **Event Types Management** — Create, edit, delete event types with custom durations, URL slugs, colors, and locations
- **Availability Settings** — Set weekly schedules, timezone support, date overrides (block days or set custom hours)
- **Public Booking Page** — Calendar date picker → time slot selection → booking form → confirmation
- **Bookings Dashboard** — View upcoming/past/cancelled bookings, cancel or reschedule

### Bonus Features

- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Date overrides (block specific dates or set different hours)
- ✅ Rescheduling flow for existing bookings
- ✅ Email notifications (booking confirmation, cancellation, rescheduling)
- ✅ Buffer time between meetings (configurable per event type)
- ✅ Custom booking questions (dynamic form fields)
- ✅ Timezone-aware scheduling with automatic conversion
- ✅ Double-booking prevention with database-level locking

---

## 🏗️ Tech Stack

| Layer    | Technology                                                      |
| -------- | --------------------------------------------------------------- |
| Frontend | React 18, Vite 5, React Router 6, Axios, date-fns, lucide-react |
| Backend  | FastAPI 0.115, SQLAlchemy 2 (async), Pydantic v2, Alembic       |
| Database | PostgreSQL 15+ with asyncpg driver                              |
| Email    | aiosmtplib + Jinja2 HTML templates (Gmail SMTP)                 |
| Styling  | Vanilla CSS (Cal.com design system)                             |

---

## 📐 System Architecture

```
┌─────────────────────┐      ┌──────────────────────┐
│   React Frontend    │ HTTP │    FastAPI Backend    │
│   (Vite + Router)   │─────▶│   (Async + Pydantic) │
│                     │ JSON │                      │
│  - Dashboard Pages  │      │  - API Layer         │
│  - Public Booking   │      │  - Service Layer     │
│  - UI Components    │      │  - Data Access       │
└─────────────────────┘      └──────────┬───────────┘
                                        │ asyncpg
                              ┌─────────▼──────────┐
                              │    PostgreSQL       │
                              │   - users           │
                              │   - event_types     │
                              │   - availability_*  │
                              │   - bookings        │
                              └────────────────────┘
```

---

## 📊 Database Schema

### Tables

| Table                    | Description                              |
| ------------------------ | ---------------------------------------- |
| `users`                  | User profiles (default user: John Doe)   |
| `event_types`            | Scheduling event configurations          |
| `availability_schedules` | Named availability schedules per user    |
| `availability_rules`     | Weekly time rules (day + time range)     |
| `date_overrides`         | Per-date availability exceptions         |
| `bookings`               | Booked appointments with status tracking |

### Key Design Decisions

- All timestamps stored as **UTC** (`timestamptz`) — converted to user timezone at API boundary
- Booking UIDs use **UUID v4** (never exposed auto-increment IDs publicly)
- Custom booking questions stored as **JSONB** for flexibility
- `SELECT FOR UPDATE` row-level locking prevents double bookings
- Composite indexes on frequently queried columns for performance

---

## 🛠️ Setup Instructions

### Prerequisites

- **Python** 3.11+ (with pip)
- **Node.js** 18+ (with npm)
- **PostgreSQL** 15+ (pgAdmin or CLI)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/scalar-cal.git
cd scalar-cal
```

### 2. Database Setup

Create a PostgreSQL database:

```sql
-- In pgAdmin or psql:
CREATE DATABASE scalar_cal;
```

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials and Gmail App Password

# Run database migrations
alembic upgrade head

# Seed sample data
python -m app.seed

# Start the backend server
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 5. Access the Application

| Page           | URL                                |
| -------------- | ---------------------------------- |
| Dashboard      | http://localhost:5173/event-types  |
| Bookings       | http://localhost:5173/bookings     |
| Availability   | http://localhost:5173/availability |
| Public Booking | http://localhost:5173/john/30min   |
| API Docs       | http://localhost:8000/docs         |

---

## 📧 Email Configuration (Gmail)

To enable email notifications:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Generate an App Password: Security → App Passwords → Select "Mail"
4. Copy the 16-character password into your `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
```

---

## 🧪 API Endpoints

### Admin Endpoints (assume default user)

| Method | Endpoint                           | Description                 |
| ------ | ---------------------------------- | --------------------------- |
| GET    | `/api/event-types`                 | List all event types        |
| POST   | `/api/event-types`                 | Create event type           |
| PUT    | `/api/event-types/{id}`            | Update event type           |
| DELETE | `/api/event-types/{id}`            | Delete event type           |
| PATCH  | `/api/event-types/{id}/toggle`     | Toggle active status        |
| GET    | `/api/availability/schedules`      | List availability schedules |
| POST   | `/api/availability/schedules`      | Create schedule             |
| PUT    | `/api/availability/schedules/{id}` | Update schedule             |
| GET    | `/api/bookings?status=upcoming`    | List bookings               |
| PATCH  | `/api/bookings/{uid}/cancel`       | Cancel booking              |

### Public Endpoints (no auth)

| Method | Endpoint                                              | Description     |
| ------ | ----------------------------------------------------- | --------------- |
| GET    | `/api/public/{username}/{slug}`                       | Event type info |
| GET    | `/api/public/{username}/{slug}/slots?date=&timezone=` | Available slots |
| POST   | `/api/public/{username}/{slug}/book`                  | Create booking  |
| GET    | `/api/public/booking/{uid}`                           | Booking details |
| POST   | `/api/public/booking/{uid}/cancel`                    | Cancel booking  |

---

## 🔐 Edge Cases & Error Handling

| Scenario           | Solution                                           |
| ------------------ | -------------------------------------------------- |
| Double booking     | `SELECT FOR UPDATE` + unique constraint            |
| Past time booking  | Server-side validation: `start > now + min_notice` |
| DST transitions    | IANA timezone database via `zoneinfo`              |
| Buffer overlap     | Buffer windows included in conflict query          |
| Invalid slugs      | Regex validation + unique constraint               |
| Email failure      | Background task with retry, never blocks booking   |
| Concurrent updates | Optimistic locking with `updated_at`               |

---

## 📁 Project Structure

```
Scalar/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers
│   │   ├── models/       # SQLAlchemy ORM
│   │   ├── schemas/      # Pydantic DTOs
│   │   ├── services/     # Business logic
│   │   ├── email/        # Email templates
│   │   ├── main.py       # FastAPI entry
│   │   ├── config.py     # Settings
│   │   ├── database.py   # DB connection
│   │   └── seed.py       # Sample data
│   ├── alembic/          # Migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Route pages
│   │   ├── api/          # API client
│   │   ├── hooks/        # Custom hooks
│   │   └── utils/        # Helpers
│   └── package.json
└── README.md
```

---

## 🚀 Deployment

### Backend (Render)

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from `.env`

### Frontend (Vercel)

1. Import project on [Vercel](https://vercel.com)
2. Set root directory: `frontend`
3. Framework preset: Vite
4. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com/api`

---

## ⚠️ Assumptions

1. **No Authentication**: A default user (John Doe, ID=1) is pre-seeded and assumed to be logged in for all admin operations
2. **Single User**: The admin side manages one user's event types and availability
3. **Time Zones**: All internal times are stored in UTC; timezone conversion happens at the API boundary
4. **Meeting Links**: Meeting URLs are placeholder-generated (no actual Google Meet/Zoom integration)
5. **Email**: Uses Gmail SMTP with App Password; emails are sent asynchronously and failures don't block bookings

---

## 📝 License

This project was built as an assignment submission. All rights reserved.
