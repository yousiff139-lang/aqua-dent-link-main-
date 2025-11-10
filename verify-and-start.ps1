# Dental Care Connect - Verification and Startup Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Dental Care Connect - System Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Checking environment files..." -ForegroundColor Yellow

$envFiles = @(
    @{Path=".env"; Name="Public Website"},
    @{Path="backend\.env"; Name="Backend API"},
    @{Path="admin-app\.env"; Name="Admin Dashboard"},
    @{Path="dentist-portal\.env"; Name="Dentist Portal"}
)

$allEnvFilesExist = $true
foreach ($file in $envFiles) {
    if (Test-Path $file.Path) {
        Write-Host "✅ $($file.Name) env file exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $($file.Name) env file missing: $($file.Path)" -ForegroundColor Red
        $allEnvFilesExist = $false
    }
}

if (-not $allEnvFilesExist) {
    Write-Host ""
    Write-Host "⚠️  Some environment files are missing. Please create them before starting." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Checking for running services..." -ForegroundColor Yellow

$ports = @(3000, 5174, 3010, 3011)
$runningPorts = @()

foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        $runningPorts += $port
        Write-Host "⚠️  Port $port is already in use" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Port $port is available" -ForegroundColor Green
    }
}

if ($runningPorts.Count -gt 0) {
    Write-Host ""
    Write-Host "Some ports are already in use. Do you want to:" -ForegroundColor Yellow
    Write-Host "1. Kill existing processes and restart"
    Write-Host "2. Continue anyway"
    Write-Host "3. Exit"
    $choice = Read-Host "Enter choice (1-3)"
    
    if ($choice -eq "1") {
        Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
        Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "✅ Processes stopped" -ForegroundColor Green
    } elseif ($choice -eq "3") {
        exit 0
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start Backend
Write-Host "Starting Backend API (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 3

# Start Public Website
Write-Host "Starting Public Website (Port 5174)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 3

# Start Admin Dashboard
Write-Host "Starting Admin Dashboard (Port 3010)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd admin-app; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 3

# Start Dentist Portal
Write-Host "Starting Dentist Portal (Port 3011)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd dentist-portal; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "All Services Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
Write-Host "   Backend API:        http://localhost:3000" -ForegroundColor White
Write-Host "   Public Website:     http://localhost:5174" -ForegroundColor White
Write-Host "   Admin Dashboard:    http://localhost:3010" -ForegroundColor White
Write-Host "   Dentist Portal:     http://localhost:3011" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Health Check:       http://localhost:3000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏳ Waiting for services to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "Testing Backend Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend is healthy!" -ForegroundColor Green
        Write-Host $response.Content
    } else {
        Write-Host "⚠️  Backend returned status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Backend health check failed. It may still be starting..." -ForegroundColor Red
    Write-Host "   Check the Backend API window for errors" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open http://localhost:5174 to access the public website" -ForegroundColor White
Write-Host "2. Open http://localhost:3010 to access the admin dashboard" -ForegroundColor White
Write-Host "3. Open http://localhost:3011 to access the dentist portal" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT: Have you applied the database migration?" -ForegroundColor Yellow
Write-Host "   If not, see: DO_IT_ALL.md (Step 1)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to open the public website..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Start-Process "http://localhost:5174"

Write-Host ""
Write-Host "Services are running. Close the PowerShell windows to stop them." -ForegroundColor Green
Write-Host ""
