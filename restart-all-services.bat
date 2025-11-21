@echo off
REM ============================================================================
REM Restart All Services - Aqua Dent Link
REM ============================================================================
REM This script restarts all services in the correct order after applying
REM the backend fix migration.
REM ============================================================================

echo.
echo ============================================================================
echo   AQUA DENT LINK - RESTART ALL SERVICES
echo ============================================================================
echo.
echo This will restart all services in the correct order:
echo   1. Backend API Server (Port 5000)
echo   2. Admin App (Port 5174)
echo   3. Dentist Portal (Port 5175)
echo   4. User Website (Port 5173)
echo.
echo Make sure you have applied the SQL migration first!
echo.
pause

REM Kill any existing Node processes on these ports
echo.
echo [1/5] Stopping existing services...
echo.

REM Kill processes on specific ports
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5174" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5175" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul

timeout /t 3 /nobreak >nul

echo Done!
echo.

REM Start Backend Server
echo [2/5] Starting Backend API Server...
echo.
cd backend
start "Backend API Server" cmd /k "npm run dev"
cd ..
timeout /t 5 /nobreak >nul
echo Backend started on http://localhost:5000
echo.

REM Start Admin App
echo [3/5] Starting Admin App...
echo.
cd admin-app
start "Admin App" cmd /k "npm run dev"
cd ..
timeout /t 5 /nobreak >nul
echo Admin App started on http://localhost:5174
echo.

REM Start Dentist Portal
echo [4/5] Starting Dentist Portal...
echo.
cd dentist-portal
start "Dentist Portal" cmd /k "npm run dev"
cd ..
timeout /t 5 /nobreak >nul
echo Dentist Portal started on http://localhost:5175
echo.

REM Start User Website
echo [5/5] Starting User Website...
echo.
start "User Website" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul
echo User Website started on http://localhost:5173
echo.

echo.
echo ============================================================================
echo   ALL SERVICES STARTED SUCCESSFULLY!
echo ============================================================================
echo.
echo Services are running on:
echo   - Backend API:     http://localhost:5000
echo   - User Website:    http://localhost:5173
echo   - Admin App:       http://localhost:5174
echo   - Dentist Portal:  http://localhost:5175
echo.
echo Four new command windows have been opened for each service.
echo To stop a service, close its command window or press Ctrl+C.
echo.
echo Next Steps:
echo   1. Open http://localhost:5174 to test Admin App
echo   2. Login and check Appointments, Patients, and Doctors pages
echo   3. Open http://localhost:5175 to test Dentist Portal
echo   4. Try marking an appointment as completed
echo   5. Verify changes sync across all apps
echo.
echo ============================================================================
echo.
pause
