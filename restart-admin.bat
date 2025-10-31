@echo off
echo ========================================
echo Restarting Admin Dashboard
echo ========================================
echo.

echo Clearing cache...
cd admin-app
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
    echo Cache cleared
)

echo.
echo Starting admin app on port 3010...
echo Press Ctrl+C to stop
echo.
echo Once started, open: http://localhost:3010
echo.

npm run dev
