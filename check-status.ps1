# Simple System Status Check
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Dental Care Connect - Status Check" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check backend .env
Write-Host "Checking Backend Configuration..." -ForegroundColor Yellow
if (Test-Path "backend/.env") {
    $content = Get-Content "backend/.env" -Raw
    if ($content -match "SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE") {
        Write-Host "[X] CRITICAL: SUPABASE_SERVICE_ROLE_KEY needs to be updated" -ForegroundColor Red
        Write-Host "    Get it from: https://supabase.com/dashboard -> Settings -> API" -ForegroundColor Yellow
    } elseif ($content -match "SUPABASE_SERVICE_ROLE_KEY=eyJ") {
        Write-Host "[OK] SUPABASE_SERVICE_ROLE_KEY is configured" -ForegroundColor Green
    }
    
    if ($content -match "JWT_SECRET=7d16264c5d4ec0a5c8e53eef96eaa9fb2608f0010a77436ccf2dc939a1a2ee21") {
        Write-Host "[OK] JWT_SECRET is configured" -ForegroundColor Green
    }
} else {
    Write-Host "[X] backend/.env not found" -ForegroundColor Red
}

Write-Host ""

# Check if services are running
Write-Host "Checking Services..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[OK] Backend API is running (Port 3000)" -ForegroundColor Green
} catch {
    Write-Host "[X] Backend API is not running (Port 3000)" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5174" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[OK] Public Site is running (Port 5174)" -ForegroundColor Green
} catch {
    Write-Host "[X] Public Site is not running (Port 5174)" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3010" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[OK] Admin Dashboard is running (Port 3010)" -ForegroundColor Green
} catch {
    Write-Host "[X] Admin Dashboard is not running (Port 3010)" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3011" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[OK] Dentist Portal is running (Port 3011)" -ForegroundColor Green
} catch {
    Write-Host "[X] Dentist Portal is not running (Port 3011)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "1. Update SUPABASE_SERVICE_ROLE_KEY in backend/.env" -ForegroundColor White
Write-Host "2. Run: .\start-all-services.bat" -ForegroundColor White
Write-Host "3. See START_SYSTEM.md for detailed instructions" -ForegroundColor White
Write-Host ""
