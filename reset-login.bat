@echo off
echo.
echo  ================================================
echo   CA Firm - Reset Admin Login
echo  ================================================
echo.

set /p PGPASSWORD="Enter your PostgreSQL password: "
if "%PGPASSWORD%"=="" set PGPASSWORD=postgres123

echo.
echo Resetting admin user...

"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d ca_firm_db -c ^
"INSERT INTO firms (id, name, firm_code, email) VALUES ('00000000-0000-0000-0000-000000000001','My CA Firm','CAFIRM001','admin@cafirm.com') ON CONFLICT DO NOTHING;" 2>nul

"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d ca_firm_db -c ^
"INSERT INTO roles (id, firm_id, name, slug, is_system) VALUES ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Super Admin','super_admin',true) ON CONFLICT DO NOTHING;" 2>nul

"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d ca_firm_db -c ^
"INSERT INTO branches (id, firm_id, name, city, state) VALUES ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Head Office','Bangalore','Karnataka') ON CONFLICT DO NOTHING;" 2>nul

"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d ca_firm_db -c ^
"INSERT INTO users (id,firm_id,role_id,branch_id,first_name,last_name,email,password_hash,employee_id,designation,status) VALUES ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Super','Admin','admin@cafirm.com','$2a$10$ruN8NLqxia314Vd6eJNIBuw4trEcVQ650B4WEpZ7kKYEuyho3GrbS','EMP001','System Administrator','active') ON CONFLICT (id) DO UPDATE SET password_hash='$2a$10$ruN8NLqxia314Vd6eJNIBuw4trEcVQ650B4WEpZ7kKYEuyho3GrbS', role_id='10000000-0000-0000-0000-000000000001', status='active', email='admin@cafirm.com';" 2>nul

echo.
echo  ================================================
echo   Done! Login with:
echo.
echo   Email   : admin@cafirm.com
echo   Password: admin123
echo.
echo   URL: http://localhost:5176
echo  ================================================
echo.
pause
