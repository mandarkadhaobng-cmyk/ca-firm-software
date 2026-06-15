#!/bin/bash
set -e

echo ""
echo "====================================================="
echo " CA Firm Practice Manager - First-Time Setup"
echo "====================================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "[ERROR] Node.js not found. Install from https://nodejs.org"
  exit 1
fi
echo "[OK] Node.js $(node --version)"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
  echo "[ERROR] PostgreSQL not found."
  echo "  Ubuntu/Debian: sudo apt install postgresql postgresql-client"
  echo "  Mac: brew install postgresql"
  exit 1
fi
echo "[OK] PostgreSQL found"

# Install frontend deps
echo ""
echo "[1/4] Installing frontend dependencies..."
npm install

# Install backend deps
echo ""
echo "[2/4] Installing backend dependencies..."
cd backend && npm install && cd ..

# Database setup
echo ""
echo "[3/4] Setting up PostgreSQL database..."
createdb ca_firm_db 2>/dev/null || echo "  (database already exists, skipping create)"
psql -d ca_firm_db -f backend/database/schema.sql
psql -d ca_firm_db -f backend/database/seed.sql
echo "[OK] Database ready"

echo ""
echo "====================================================="
echo " Setup Complete!"
echo "====================================================="
echo ""
echo " Login credentials:"
echo "   Email:    admin@cafirm.com"
echo "   Password: Admin@1234"
echo ""
echo "[4/4] Starting servers..."
echo ""
echo " Backend  -> http://localhost:5000"
echo " Frontend -> http://localhost:5173"
echo ""

# Start backend in background
cd backend && npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment then start frontend
sleep 2
npm run dev &
FRONTEND_PID=$!

echo ""
echo " Both servers running. Press Ctrl+C to stop."
echo ""

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servers stopped.'; exit 0" SIGINT SIGTERM
wait
