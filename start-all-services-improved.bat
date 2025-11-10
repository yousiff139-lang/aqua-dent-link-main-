@echo off
echo ========================================
echo Starting Dental Care Connect System
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Checking Node.js version...
node --version
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)

echo Checking npm version...
npm --version
echo.

echo ========================================
echo Installing Dependencies (if needed)
echo ========================================
echo.

REM Install root dependencies
if not exist "node_modules" (
    echo Installing root dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install root dependencies
        pause
        exit /b 1
    )
)

REM Install backend dependencies
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install backend dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
)

REM Install admin-app dependencies
if not exist "admin-app\node_modules" (
    echo Installing admin-app dependencies...
    cd admin-app
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install admin-app dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
)

REM Install dentist-portal dependencies
if not exist "dentist-portal\node_modules" (
    echo Installing dentist-portal dependencies...
    cd dentist-portal
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dentist-portal dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
)

echo.
echo ========================================
echo Starting Services
echo ========================================
echo.

echo Starting Backend API (Port 3000)...
start "Backend API" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul

echo Starting Public Website (Port 5174)...
start "Public Website" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

echo Starting Admin Dashboard (Port 3010)...
start "Admin Dashboard" cmd /k "cd admin-app && npm run dev"
timeout /t 3 /nobreak >nul

echo Starting Dentist Portal (Port 3011)...
start "Dentist Portal" cmd /k "cd dentist-portal && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo All Services Started!
echo ========================================
echo.
echo Backend API:        http://localhost:3000
echo Public Website:     http://localhost:5174
echo Admin Dashboard:    http://localhost:3010
echo Dentist Portal:     http://localhost:3011
echo.
echo Health Check:       http://localhost:3000/health
echo.
echo ========================================
echo Press any key to open health check...
echo ========================================
pause >nul

start http://localhost:3000/health

echo.
echo Services are running in separate windows.
echo Close those windows to stop the services.
echo.
pause
