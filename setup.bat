@echo off
echo.
echo  =====================================================
echo   CA Firm Practice Manager - First-Time Setup
echo  =====================================================
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Download from https://nodejs.org
    pause & exit /b 1
)
echo [OK] Node.js found

:: Ask for PostgreSQL password
echo.
set /p PGPASSWORD="Enter your PostgreSQL password (default: postgres): "
if "%PGPASSWORD%"=="" set PGPASSWORD=postgres

:: Check PostgreSQL connection
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Cannot connect to PostgreSQL. Check your password or if PostgreSQL is running.
    pause & exit /b 1
)
echo [OK] PostgreSQL connected

:: Install frontend dependencies
echo.
echo [1/4] Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 ( echo [ERROR] Frontend npm install failed & pause & exit /b 1 )

:: Install backend dependencies
echo.
echo [2/4] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 ( echo [ERROR] Backend npm install failed & pause & exit /b 1 )
cd ..

:: Update .env password
echo.
echo [2b] Updating backend .env with your password...
powershell -Command "(Get-Content backend\.env) -replace 'DB_PASSWORD=.*', 'DB_PASSWORD=%PGPASSWORD%' | Set-Content backend\.env"

:: Setup database
echo.
echo [3/4] Setting up PostgreSQL database...
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE ca_firm_db;" 2>nul
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d ca_firm_db -f backend\database\schema.sql
if %errorlevel% neq 0 ( echo [ERROR] Schema failed & pause & exit /b 1 )
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d ca_firm_db -f backend\database\seed.sql
if %errorlevel% neq 0 ( echo [ERROR] Seed failed & pause & exit /b 1 )
echo [OK] Database ready

:: Done
echo.
echo  =====================================================
echo   Setup Complete!
echo  =====================================================
echo.
echo  Login credentials:
echo    Email:    admin@cafirm.com
echo    Password: Admin@1234
echo.
echo [4/4] Starting servers...
echo.
echo  Backend  -> http://localhost:5000
echo  Frontend -> http://localhost:5173
echo.

:: Start both servers in separate windows
start "CA Firm Backend"  cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak >nul
start "CA Firm Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo  Both servers started in separate windows.
echo  Open http://localhost:5173 in your browser.
echo.
pause
