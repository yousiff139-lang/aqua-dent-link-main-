@echo off
echo ========================================
echo Admin Dashboard - Complete Fix
echo ========================================
echo.

echo Step 1: Checking environment file...
if not exist "admin-app\.env" (
    echo Creating .env file...
    (
        echo VITE_SUPABASE_URL=https://zizcfzhlbpuirupxtqcm.supabase.co
        echo VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppemNmemhsYnB1aXJ1cHh0cWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5OTA4ODYsImV4cCI6MjA3NTU2Njg4Nn0.aWznK2YK21hNlKcBeJp56azrWf_rfNvX4oY53T7Kh_Q
    ) > admin-app\.env
    echo [OK] Created .env file
) else (
    echo [OK] .env file exists
)

echo.
echo Step 2: Clearing cache...
cd admin-app
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite" 2>nul
    echo [OK] Cache cleared
) else (
    echo [OK] No cache to clear
)

if exist "dist" (
    rmdir /s /q "dist" 2>nul
    echo [OK] Dist folder cleared
)

echo.
echo Step 3: Starting admin app...
echo.
echo ========================================
echo Admin app starting on port 3010
echo ========================================
echo.
echo Test URLs:
echo   1. http://localhost:3010/test   (Environment check)
echo   2. http://localhost:3010/login  (Login page)
echo   3. http://localhost:3010        (Dashboard)
echo.
echo Press Ctrl+C to stop
echo ========================================
echo.

npm run dev
