#!/bin/bash

# DentalCareConnect Chatbot Backend Startup Script

echo "========================================="
echo "Starting DentalCareConnect Chatbot Backend"
echo "========================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    echo "Please install Python 3.11+ from https://www.python.org/"
    exit 1
fi

echo "✅ Python version: $(python3 --version)"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install/upgrade dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "✅ Dependencies installed"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found"
    echo "Copying .env.example to .env..."
    cp .env.example .env
    echo ""
    echo "⚠️  Please edit .env file and add your API keys:"
    echo "   - GEMINI_API_KEY"
    echo "   - DATABASE_URL"
    echo "   - SUPABASE credentials"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

# Create necessary directories
mkdir -p uploads logs

echo ""
echo "========================================="
echo "Starting FastAPI Server"
echo "========================================="
echo ""
echo "Server will be available at:"
echo "  - Local:   http://localhost:8000"
echo "  - Network: http://0.0.0.0:8000"
echo ""
echo "API Documentation:"
echo "  - Swagger UI: http://localhost:8000/docs"
echo "  - ReDoc:      http://localhost:8000/redoc"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
