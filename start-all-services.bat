@echo off
echo ========================================
echo Dental Care Connect - Starting All Services
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "backend" (
    echo ERROR: Run this script from the project root directory
    pause
    exit /b 1
)

echo Starting Backend API...
start "Backend API" cmd /k "cd backend && npm run dev"
timeout /t 2 /nobreak >nul

echo Starting Public Booking Site...
start "Public Site" cmd /k "npm run dev"
timeout /t 2 /nobreak >nul

echo Starting Admin Dashboard...
start "Admin Dashboard" cmd /k "cd admin-app && npm run dev"
timeout /t 2 /nobreak >nul

echo Starting Dentist Portal...
start "Dentist Portal" cmd /k "cd dentist-portal && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo All services are starting...
echo ========================================
echo.
echo Wait 10-15 seconds for all services to start, then access:
echo.
echo   Public Site:      http://localhost:5174
echo   Admin Dashboard:  http://localhost:3010
echo   Dentist Portal:   http://localhost:3011
echo   Backend API:      http://localhost:3000/health
echo.
echo Press any key to exit (services will keep running)...
pause >nul
