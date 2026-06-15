@echo off
echo.
echo  =====================================================
echo   CA Firm - Database Setup
echo  =====================================================
echo.

set /p PGPASSWORD="Enter PostgreSQL password: "
if "%PGPASSWORD%"=="" set PGPASSWORD=postgres

echo.
echo Creating database...
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE ca_firm_db;" 2>nul

echo Running schema...
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d ca_firm_db -f "%~dp0backend\database\schema.sql"
if %errorlevel% neq 0 ( echo [ERROR] Schema failed! & pause & exit /b 1 )

echo Running seed data...
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d ca_firm_db -f "%~dp0backend\database\seed.sql"
if %errorlevel% neq 0 ( echo [ERROR] Seed failed! & pause & exit /b 1 )

echo Updating backend password in .env...
powershell -Command "(Get-Content '%~dp0backend\.env') -replace 'DB_PASSWORD=.*', 'DB_PASSWORD=%PGPASSWORD%' | Set-Content '%~dp0backend\.env'"

echo.
echo  =====================================================
echo   Database ready!
echo   Login: admin@cafirm.com / Admin@1234
echo  =====================================================
echo.
pause
