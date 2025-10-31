@echo off
REM Edge Functions Deployment Script for Windows
REM This script deploys all chatbot booking system edge functions to Supabase

setlocal enabledelayedexpansion

echo.
echo ================================================================
echo    Chatbot Booking System - Edge Functions Deployment
echo ================================================================
echo.

REM Check if Supabase CLI is installed
echo [INFO] Checking prerequisites...
where supabase >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Supabase CLI is not installed
    echo Install it with: npm install -g supabase
    pause
    exit /b 1
)
echo [SUCCESS] Supabase CLI is installed

REM Check if we're in the right directory
if not exist "supabase\functions" (
    echo [ERROR] supabase\functions directory not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)
echo [SUCCESS] Project structure verified

REM Check if logged in to Supabase
echo [INFO] Checking Supabase authentication...
supabase projects list >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Not logged in to Supabase
    echo [INFO] Logging in...
    supabase login
)
echo [SUCCESS] Authenticated with Supabase

REM List available functions
echo.
echo [INFO] Available edge functions:
echo   1. chat-bot
echo   2. generate-booking-summary
echo   3. generate-appointment-excel
echo.

REM Ask user what to deploy
echo What would you like to deploy?
echo   1) All functions
echo   2) chat-bot only
echo   3) generate-booking-summary only
echo   4) generate-appointment-excel only
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    set "DEPLOY_CHATBOT=1"
    set "DEPLOY_SUMMARY=1"
    set "DEPLOY_EXCEL=1"
) else if "%choice%"=="2" (
    set "DEPLOY_CHATBOT=1"
    set "DEPLOY_SUMMARY=0"
    set "DEPLOY_EXCEL=0"
) else if "%choice%"=="3" (
    set "DEPLOY_CHATBOT=0"
    set "DEPLOY_SUMMARY=1"
    set "DEPLOY_EXCEL=0"
) else if "%choice%"=="4" (
    set "DEPLOY_CHATBOT=0"
    set "DEPLOY_SUMMARY=0"
    set "DEPLOY_EXCEL=1"
) else (
    echo [ERROR] Invalid choice
    pause
    exit /b 1
)

echo.
set /p confirm="Continue with deployment? (y/n): "
if /i not "%confirm%"=="y" (
    echo [WARNING] Deployment cancelled
    pause
    exit /b 0
)

echo.
echo [INFO] Starting deployment...
echo.

set DEPLOYED=0
set FAILED=0

REM Deploy chat-bot
if "%DEPLOY_CHATBOT%"=="1" (
    echo [INFO] Deploying chat-bot...
    supabase functions deploy chat-bot
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCESS] chat-bot deployed successfully
        set /a DEPLOYED+=1
    ) else (
        echo [ERROR] Failed to deploy chat-bot
        set /a FAILED+=1
    )
    echo.
)

REM Deploy generate-booking-summary
if "%DEPLOY_SUMMARY%"=="1" (
    echo [INFO] Deploying generate-booking-summary...
    supabase functions deploy generate-booking-summary
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCESS] generate-booking-summary deployed successfully
        set /a DEPLOYED+=1
    ) else (
        echo [ERROR] Failed to deploy generate-booking-summary
        set /a FAILED+=1
    )
    echo.
)

REM Deploy generate-appointment-excel
if "%DEPLOY_EXCEL%"=="1" (
    echo [INFO] Deploying generate-appointment-excel...
    supabase functions deploy generate-appointment-excel
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCESS] generate-appointment-excel deployed successfully
        set /a DEPLOYED+=1
    ) else (
        echo [ERROR] Failed to deploy generate-appointment-excel
        set /a FAILED+=1
    )
    echo.
)

REM Summary
echo.
echo ================================================================
echo                     Deployment Summary
echo ================================================================
echo.
echo [SUCCESS] Successfully deployed: %DEPLOYED% function(s)
if %FAILED% GTR 0 (
    echo [ERROR] Failed to deploy: %FAILED% function(s)
)
echo.

REM Check environment variables
echo [INFO] Checking environment variables...
echo.
echo [WARNING] Make sure the following secrets are configured in Supabase Dashboard:
echo   - SUPABASE_URL
echo   - SUPABASE_SERVICE_ROLE_KEY
echo   - SUPABASE_ANON_KEY
echo   - GEMINI_API_KEY (for chat-bot)
echo.
echo To set secrets, use:
echo   supabase secrets set KEY=value
echo.

REM List deployed functions
echo [INFO] Listing deployed functions...
echo.
supabase functions list

echo.
echo [INFO] Next steps:
echo   1. Verify environment variables are set
echo   2. Test deployed functions
echo   3. Monitor logs for errors
echo   4. Update frontend to use deployed endpoints
echo.

set /p view_logs="Would you like to view logs for deployed functions? (y/n): "
if /i "%view_logs%"=="y" (
    if "%DEPLOY_CHATBOT%"=="1" (
        echo.
        echo [INFO] Logs for chat-bot (last 20 lines):
        supabase functions logs chat-bot --tail 20
    )
    if "%DEPLOY_SUMMARY%"=="1" (
        echo.
        echo [INFO] Logs for generate-booking-summary (last 20 lines):
        supabase functions logs generate-booking-summary --tail 20
    )
    if "%DEPLOY_EXCEL%"=="1" (
        echo.
        echo [INFO] Logs for generate-appointment-excel (last 20 lines):
        supabase functions logs generate-appointment-excel --tail 20
    )
)

echo.
echo [SUCCESS] Deployment complete!
echo.
pause
