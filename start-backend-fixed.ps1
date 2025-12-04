# Start Backend Server - Fixed Script
# This script starts the backend server and checks if it's running

Write-Host "🚀 Starting Backend Server..." -ForegroundColor Cyan
Write-Host ""

# Change to backend directory
Set-Location backend

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found in backend directory!" -ForegroundColor Red
    Write-Host "📝 Please create a .env file with the following variables:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "NODE_ENV=development" -ForegroundColor Gray
    Write-Host "PORT=3001" -ForegroundColor Gray
    Write-Host "API_PREFIX=/api" -ForegroundColor Gray
    Write-Host "SUPABASE_URL=your_supabase_project_url" -ForegroundColor Gray
    Write-Host "SUPABASE_ANON_KEY=your_supabase_anon_key" -ForegroundColor Gray
    Write-Host "SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key" -ForegroundColor Gray
    Write-Host "CORS_ORIGIN=http://localhost:8000,http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:3010,http://localhost:8080" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
}

# Check if port 3001 is in use
$portInUse = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "⚠️  Port 3001 is already in use!" -ForegroundColor Yellow
    Write-Host "🛑 Stopping existing process on port 3001..." -ForegroundColor Yellow
    
    $process = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($process) {
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "✅ Process stopped" -ForegroundColor Green
    }
}

Write-Host "🔄 Starting backend server..." -ForegroundColor Cyan
Write-Host "📡 Backend will run on: http://localhost:3001" -ForegroundColor Gray
Write-Host "🏥 Health check: http://localhost:3001/health" -ForegroundColor Gray
Write-Host ""

# Start the server
npm run dev

















