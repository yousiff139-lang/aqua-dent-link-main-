@echo off
echo ========================================
echo Starting Backend Server
echo ========================================
echo.

cd /d %~dp0

REM Check if .env file exists
if not exist .env (
    echo [ERROR] .env file not found!
    echo.
    echo Please create a .env file with the following required variables:
    echo   - SUPABASE_URL
    echo   - SUPABASE_ANON_KEY
    echo   - SUPABASE_SERVICE_ROLE_KEY
    echo   - PORT (optional, defaults to 3001)
    echo.
    echo See START_BACKEND_SERVER.md for details.
    echo.
    pause
    exit /b 1
)

echo [INFO] .env file found
echo [INFO] Starting server on port 3001...
echo.

REM Check if node_modules exists
if not exist node_modules (
    echo [INFO] Installing dependencies...
    call npm install
    echo.
)

REM Start the server
echo [INFO] Starting backend server...
echo [INFO] Server will be available at: http://localhost:3001
echo [INFO] Health check: http://localhost:3001/health
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev

pause
