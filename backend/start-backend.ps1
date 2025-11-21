# Backend Server Startup Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Backend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "[ERROR] .env file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create a .env file with the following required variables:" -ForegroundColor Yellow
    Write-Host "  - SUPABASE_URL" -ForegroundColor Yellow
    Write-Host "  - SUPABASE_ANON_KEY" -ForegroundColor Yellow
    Write-Host "  - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Yellow
    Write-Host "  - PORT (optional, defaults to 3001)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "See START_BACKEND_SERVER.md or .env.example for details." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[INFO] .env file found" -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path node_modules)) {
    Write-Host "[INFO] Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Check if port 3001 is in use
$portInUse = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "[WARNING] Port 3001 is already in use!" -ForegroundColor Yellow
    Write-Host "Process ID: $($portInUse.OwningProcess)" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Do you want to kill the process and continue? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Stop-Process -Id $portInUse.OwningProcess -Force
        Write-Host "[INFO] Process killed" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "[INFO] Exiting. Please stop the process using port 3001 manually." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "[INFO] Starting server on port 3001..." -ForegroundColor Green
Write-Host "[INFO] Server will be available at: http://localhost:3001" -ForegroundColor Cyan
Write-Host "[INFO] Health check: http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "[INFO] API base: http://localhost:3001/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the server
npm run dev

