# Test Booking Fix Script
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Testing Booking System Fix" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check environment variables
Write-Host "Step 1: Checking environment variables..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✓ .env file exists" -ForegroundColor Green
} else {
    Write-Host "✗ .env file not found" -ForegroundColor Red
}
Write-Host ""

# Check backend API
Write-Host "Step 2: Checking backend API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Backend API is running on port 3000" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend API is not running" -ForegroundColor Red
    Write-Host "  Run: npm run dev:backend" -ForegroundColor Yellow
}
Write-Host ""

# Check BookingForm fix
Write-Host "Step 3: Verifying BookingForm.tsx fix..." -ForegroundColor Yellow
if (Test-Path "src/components/BookingForm.tsx") {
    $content = Get-Content "src/components/BookingForm.tsx" -Raw
    if ($content -match 'PDF generation skipped') {
        Write-Host "✓ PDF generation fix has been applied" -ForegroundColor Green
    } else {
        Write-Host "⚠ PDF generation fix may not be applied" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ BookingForm.tsx not found" -ForegroundColor Red
}
Write-Host ""

# Check Node processes
Write-Host "Step 4: Checking running Node processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "✓ Found $($nodeProcesses.Count) Node.js process(es) running" -ForegroundColor Green
} else {
    Write-Host "✗ No Node.js processes running" -ForegroundColor Red
    Write-Host "  Run: npm run dev" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open browser to http://localhost:5173" -ForegroundColor White
Write-Host "2. Navigate to a dentist profile" -ForegroundColor White
Write-Host "3. Click 'Book Appointment'" -ForegroundColor White
Write-Host "4. Fill out and submit the form" -ForegroundColor White
Write-Host ""
Write-Host "Expected Result:" -ForegroundColor Yellow
Write-Host "✓ No 'Failed to fetch' error" -ForegroundColor Green
Write-Host "✓ Booking succeeds" -ForegroundColor Green
Write-Host ""
