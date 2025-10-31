@echo off
echo ========================================
echo Fixing Chatbot Import Error
echo ========================================
echo.

echo Step 1: Clearing Vite cache...
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
    echo [OK] Cache cleared
) else (
    echo [OK] No cache to clear
)

echo.
echo Step 2: Clearing dist folder...
if exist "dist" (
    rmdir /s /q "dist"
    echo [OK] Dist cleared
)

echo.
echo Step 3: Restarting dev server...
echo.
echo ========================================
echo Starting public site on port 5174
echo ========================================
echo.
echo The chatbot error should now be fixed!
echo Press Ctrl+C to stop
echo.

npm run dev
