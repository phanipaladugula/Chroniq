# 🚀 Scalar Cal — Setup Guide

## Prerequisites
- PostgreSQL running (via pgAdmin on desktop)
- Python 3.11+
- Node.js 18+

## Quick Start

### 1. Create Database
Open pgAdmin and create a new database named `scalar_cal`:
```sql
CREATE DATABASE scalar_cal;
```

### 2. Configure Backend
```bash
cd backend
# Edit .env with your credentials:
# DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/scalar_cal
# SMTP_USER=your-gmail@gmail.com
# SMTP_PASSWORD=your-16-char-app-password
```

### 3. Install & Run Backend
```bash
cd backend
pip install -r requirements.txt
python -m app.seed          # Seeds the database
uvicorn app.main:app --reload --port 8000
```

### 4. Install & Run Frontend
```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

---

## Test URLs
| Feature | URL |
|---------|-----|
| Dashboard | http://localhost:5173/event-types |
| Bookings | http://localhost:5173/bookings |
| Availability | http://localhost:5173/availability |
| Public Booking | http://localhost:5173/john/30min |
| API Docs | http://localhost:8000/docs |

---

## Deployment

### Backend → Render
1. Create a new Web Service on Render
2. Connect your GitHub repo
3. Set:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables from `.env`

### Frontend → Vercel
1. Import your GitHub repo on Vercel
2. Set:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Set `VITE_API_URL=https://your-render-backend.onrender.com/api`

---

## Gmail App Password Setup
1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account → Security → App Passwords
3. Create a new app password (select "Mail" + "Windows Computer")
4. Copy the 16-character password to `SMTP_PASSWORD` in `.env`
