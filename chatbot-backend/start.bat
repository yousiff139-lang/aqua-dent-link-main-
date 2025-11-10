@echo off
REM DentalCareConnect Chatbot Backend Startup Script (Windows)

echo =========================================
echo Starting DentalCareConnect Chatbot Backend
echo =========================================
echo.

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11+ from https://www.python.org/
    pause
    exit /b 1
)

echo Python version:
python --version
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo Virtual environment created
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo Installing dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo Dependencies installed
echo.

REM Check if .env file exists
if not exist ".env" (
    echo WARNING: .env file not found
    echo Copying .env.example to .env...
    copy .env.example .env
    echo.
    echo WARNING: Please edit .env file and add your API keys:
    echo    - GEMINI_API_KEY
    echo    - DATABASE_URL
    echo    - SUPABASE credentials
    echo.
    pause
)

REM Create necessary directories
if not exist "uploads" mkdir uploads
if not exist "logs" mkdir logs

echo.
echo =========================================
echo Starting FastAPI Server
echo =========================================
echo.
echo Server will be available at:
echo   - Local:   http://localhost:8000
echo   - Network: http://0.0.0.0:8000
echo.
echo API Documentation:
echo   - Swagger UI: http://localhost:8000/docs
echo   - ReDoc:      http://localhost:8000/redoc
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
