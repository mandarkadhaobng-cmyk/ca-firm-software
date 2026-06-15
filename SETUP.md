# CA Firm Practice Management — Full-Stack Setup Guide

## Architecture Overview

```
Browser (PWA)
    ↕ HTTPS
Vercel (Frontend — React + Vite)
    ↕ HTTPS / REST + Socket.IO
Cloudflare Tunnel
    ↕ localhost:5000
Office Server (Backend — Node.js + Express)
    ↕ pg pool
PostgreSQL (Local Office Server — port 5432)
    +
Cloudflare R2 (File Storage)
```

---

## Prerequisites

Install these on your **office server** (Windows or Linux):

| Software | Download |
|---|---|
| Node.js v20+ | https://nodejs.org |
| PostgreSQL 15+ | https://www.postgresql.org/download |
| Git | https://git-scm.com |
| cloudflared | https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads |

---

## Step 1 — Clone & Install

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/ca-firm-software.git
cd ca-firm-software

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

---

## Step 2 — PostgreSQL Setup

Open **pgAdmin** or **psql** and run:

```sql
-- Create database and user
CREATE DATABASE ca_firm_db;
CREATE USER ca_firm_user WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE ca_firm_db TO ca_firm_user;
\c ca_firm_db
GRANT ALL ON SCHEMA public TO ca_firm_user;
```

Then run the schema and seed files:

```bash
psql -U ca_firm_user -d ca_firm_db -f backend/database/schema.sql
psql -U ca_firm_user -d ca_firm_db -f backend/database/seed.sql
```

Default super admin credentials after seed:
- **Email:** admin@yourfirm.com
- **Password:** Admin@1234

> Change these immediately after first login.

---

## Step 3 — Backend Environment Variables

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# Server
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-app.vercel.app

# Database (local PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ca_firm_db
DB_USER=ca_firm_user
DB_PASSWORD=your_strong_password
DB_SSL=false

# JWT (generate strong random strings — minimum 32 chars)
JWT_SECRET=CHANGE_THIS_TO_A_RANDOM_64_CHAR_STRING
JWT_REFRESH_SECRET=CHANGE_THIS_TO_ANOTHER_RANDOM_64_CHAR_STRING
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Cloudflare R2 Storage
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=ca-firm-files
R2_PUBLIC_URL=https://your-r2-public-url.r2.dev

# Email (SMTP — Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="CA Firm <your@gmail.com>"

# SMS — MSG91 (India)
MSG91_API_KEY=
MSG91_SENDER_ID=CAFIRM
MSG91_TEMPLATE_ID=

# WhatsApp — Twilio
TWILIO_SID=
TWILIO_TOKEN=
TWILIO_WA_FROM=whatsapp:+14155238886
```

> **JWT Secret tip:** Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

---

## Step 4 — Frontend Environment Variables

In the **root** of the project (next to `package.json`):

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Your Cloudflare Tunnel URL (set after Step 6)
VITE_API_URL=https://your-tunnel.trycloudflare.com/api

# Cloudflare R2 public URL for file previews
VITE_R2_PUBLIC_URL=https://your-r2-public-url.r2.dev
```

---

## Step 5 — Start the Backend

```bash
cd backend
node server.js
```

You should see:
```
✅ Database connected (pool ready)
🚀 CA Firm API running on port 5000
```

To run as a **background service** on Windows, install PM2:

```bash
npm install -g pm2
cd backend
pm2 start server.js --name ca-firm-backend
pm2 save
pm2 startup   # follow the printed command to auto-start on reboot
```

---

## Step 6 — Cloudflare Tunnel (Remote Access)

This makes your office backend reachable from the internet securely — without opening firewall ports.

### One-time setup

```bash
# Login to Cloudflare (opens browser)
cloudflared tunnel login

# Create named tunnel
cloudflared tunnel create ca-firm-backend

# Route your domain to the tunnel (replace with your domain)
cloudflared tunnel route dns ca-firm-backend api.yourfirmdomain.com
```

### Start the tunnel

```bash
cloudflared tunnel run --url http://localhost:5000 ca-firm-backend
```

Your backend is now live at `https://api.yourfirmdomain.com`.

Update `VITE_API_URL` in your frontend `.env`:
```env
VITE_API_URL=https://api.yourfirmdomain.com/api
```

### Auto-start tunnel on Windows

Create `C:\cloudflare\config.yml`:
```yaml
tunnel: ca-firm-backend
credentials-file: C:\Users\YourUser\.cloudflared\ca-firm-backend.json

ingress:
  - hostname: api.yourfirmdomain.com
    service: http://localhost:5000
  - service: http_status:404
```

Install as Windows Service:
```bash
cloudflared service install
```

---

## Step 7 — Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
vercel

# Set environment variables on Vercel dashboard:
# VITE_API_URL = https://api.yourfirmdomain.com/api
# VITE_R2_PUBLIC_URL = https://your-r2.r2.dev
```

Or connect your GitHub repo to Vercel for automatic deployments on every push.

---

## Step 8 — Cloudflare R2 Setup

1. Go to **Cloudflare Dashboard → R2 → Create Bucket**
2. Name: `ca-firm-files`
3. Go to **R2 → Manage API Tokens → Create Token** (read + write)
4. Copy Account ID, Access Key, Secret Key into `backend/.env`
5. Under bucket settings → enable **Public Access** (or configure custom domain)

---

## Step 9 — GitHub Setup

```bash
cd ca-firm-software

# Initialize (if not already)
git init
git add .
git commit -m "Initial commit — enterprise upgrade"

# Create repo on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/ca-firm-software.git
git push -u origin main
```

Add a `.gitignore` to protect secrets:
```
node_modules/
dist/
.env
backend/.env
backend/node_modules/
*.log
```

---

## Default Login

| Field | Value |
|---|---|
| Email | admin@yourfirm.com |
| Password | Admin@1234 |
| Role | Super Admin |

---

## Project Structure

```
ca-firm-software/
├── src/                    ← React frontend
│   ├── auth/               ← Login, Forgot/Reset Password
│   ├── dashboard/          ← Role-specific dashboards
│   ├── employees/          ← Employee management
│   ├── clients/            ← Client management
│   ├── assignments/        ← Assignment management
│   ├── timesheets/         ← Timesheet entry & list
│   ├── approvals/          ← Approval queue
│   ├── leaves/             ← Leave application & approval
│   ├── holidays/           ← Holiday calendar
│   ├── notices/            ← Announcements
│   ├── hr/                 ← HR dashboard
│   ├── reports/            ← Reports & analytics
│   ├── settings/           ← Firm settings
│   ├── services/           ← API client + service layer
│   ├── store/              ← Zustand state management
│   ├── hooks/              ← Custom React hooks
│   └── routes/             ← React Router config
│
├── backend/                ← Express.js API
│   ├── config/             ← DB, JWT, CORS
│   ├── controllers/        ← Request handlers
│   ├── services/           ← Business logic
│   ├── routes/             ← API route definitions
│   ├── middleware/         ← Auth, RBAC, audit, errors
│   ├── notifications/      ← Email, SMS, WhatsApp engines
│   ├── sockets/            ← Socket.IO realtime
│   ├── permissions/        ← RBAC permission matrix
│   ├── database/           ← schema.sql + seed.sql
│   ├── utils/              ← Logger, pagination, errors
│   └── server.js           ← Entry point
│
├── public/                 ← PWA manifest + service worker
├── SETUP.md                ← This file
├── vercel.json             ← Vercel SPA config
└── package.json            ← Frontend dependencies
```

---

## Roles & Permissions

| Role | Access |
|---|---|
| **super_admin** | Everything — firm settings, all data, all reports |
| **partner** | All client/assignment/timesheet data, reports |
| **hr** | Employee management, leaves, holidays, notices |
| **manager** | Own team assignments, timesheets, approve leaves |
| **employee** | Own timesheets, leaves, notifications |
| **article** | Same as employee (article trainees) |

---

## Notification Channels

Configure in **Settings → Notifications**:

| Channel | Provider |
|---|---|
| In-App | Built-in (Socket.IO) — always on |
| Email | SMTP (Gmail, Outlook, SendGrid, etc.) |
| SMS | MSG91 (India) or Twilio |
| WhatsApp | Twilio or Meta Cloud API |

---

## Troubleshooting

**Backend won't connect to PostgreSQL:**
- Check `DB_HOST`, `DB_USER`, `DB_PASSWORD` in `backend/.env`
- Ensure PostgreSQL service is running: `services.msc` (Windows)
- Test: `psql -U ca_firm_user -d ca_firm_db`

**Frontend shows "Network Error":**
- Confirm `VITE_API_URL` points to your tunnel URL
- Confirm backend is running (`pm2 status` or `node server.js`)
- Confirm Cloudflare Tunnel is active

**JWT errors / getting logged out:**
- `JWT_SECRET` and `JWT_REFRESH_SECRET` must be the same between restarts
- Don't use short strings — minimum 32 characters

**Socket.IO not connecting:**
- Ensure `FRONTEND_URL` in `backend/.env` matches your Vercel URL exactly (no trailing slash)
- Cloudflare Tunnel supports WebSockets by default

**File uploads failing:**
- Check R2 credentials and bucket name
- Ensure bucket has public access enabled for file previews
