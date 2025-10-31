@echo off
REM Complete fix for appointments loading issue

echo.
echo ================================================================
echo    FIXING APPOINTMENTS LOADING ISSUE
echo ================================================================
echo.

echo [INFO] This script will:
echo   1. Fix RLS policies for appointments table
echo   2. Fix status constraint to include 'upcoming'
echo   3. Apply all pending migrations
echo.

set /p confirm="Continue? (y/n): "
if /i not "%confirm%"=="y" (
    echo [CANCELLED] Operation cancelled by user
    pause
    exit /b 0
)

echo.
echo [STEP 1/3] Checking Supabase CLI...
where supabase >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Supabase CLI not found
    echo Install it with: npm install -g supabase
    pause
    exit /b 1
)
echo [SUCCESS] Supabase CLI found

echo.
echo [STEP 2/3] Applying migrations...
cd supabase
supabase db push
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to apply migrations
    echo Check the error messages above
    cd ..
    pause
    exit /b 1
)
cd ..
echo [SUCCESS] Migrations applied

echo.
echo [STEP 3/3] Verifying fix...
echo.
echo Please test the following:
echo   1. Log in to your application
echo   2. Navigate to Dashboard
echo   3. Try to view appointments
echo   4. Book a new appointment
echo   5. Verify it appears in the dashboard
echo.

echo ================================================================
echo    FIX COMPLETE
echo ================================================================
echo.
echo [INFO] If you still see errors:
echo   1. Open browser console (F12)
echo   2. Copy and paste the contents of:
echo      scripts/test-appointments-query.js
echo   3. Press Enter and share the output
echo.

pause
