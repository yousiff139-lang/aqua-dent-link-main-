# Quick Admin App Test Script
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Admin App - Quick Test" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if admin-app exists
Write-Host "Test 1: Checking admin-app directory..." -ForegroundColor Yellow
if (Test-Path "admin-app") {
    Write-Host "[PASS] admin-app directory exists" -ForegroundColor Green
} else {
    Write-Host "[FAIL] admin-app directory not found" -ForegroundColor Red
    exit 1
}

# Test 2: Check dependencies
Write-Host "`nTest 2: Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "admin-app/node_modules") {
    Write-Host "[PASS] Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Dependencies missing" -ForegroundColor Red
    Write-Host "Run: cd admin-app && npm install" -ForegroundColor Yellow
    exit 1
}

# Test 3: Check .env file
Write-Host "`nTest 3: Checking environment variables..." -ForegroundColor Yellow
if (Test-Path "admin-app/.env") {
    $envContent = Get-Content "admin-app/.env" -Raw
    if ($envContent -match "VITE_SUPABASE_URL") {
        Write-Host "[PASS] .env file configured" -ForegroundColor Green
    } else {
        Write-Host "[WARN] .env file exists but may be incomplete" -ForegroundColor Yellow
    }
} else {
    Write-Host "[FAIL] .env file missing" -ForegroundColor Red
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    @"
VITE_SUPABASE_URL=https://ypbklvrerxikktkbswad.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwYmtsdnJlcnhpa2t0a2Jzd2FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDYwMTUsImV4cCI6MjA3NTY4MjAxNX0.e8Gt-zzSlsWN208RJ-FUMLn-L9lkWNFsVEkqCfNGJJ8
"@ | Out-File -FilePath "admin-app/.env" -Encoding UTF8
    Write-Host "[FIXED] Created .env file" -ForegroundColor Green
}

# Test 4: Check if port 3010 is available
Write-Host "`nTest 4: Checking port 3010..." -ForegroundColor Yellow
$portCheck = netstat -ano | Select-String ":3010"
if ($portCheck) {
    Write-Host "[INFO] Port 3010 is in use (admin app may be running)" -ForegroundColor Cyan
} else {
    Write-Host "[INFO] Port 3010 is available" -ForegroundColor Cyan
}

# Test 5: Check critical files
Write-Host "`nTest 5: Checking critical files..." -ForegroundColor Yellow
$criticalFiles = @(
    "admin-app/src/main.tsx",
    "admin-app/src/App.tsx",
    "admin-app/src/index.css",
    "admin-app/index.html",
    "admin-app/vite.config.ts",
    "admin-app/src/components/ErrorBoundary.tsx"
)

$allFilesExist = $true
foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $file" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if ($allFilesExist) {
    Write-Host "[PASS] All critical files exist" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Some critical files are missing" -ForegroundColor Red
}

# Summary
Write-Host "`n=================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

if ($allFilesExist) {
    Write-Host "[SUCCESS] Admin app is ready to start" -ForegroundColor Green
    Write-Host "`nTo start the admin app:" -ForegroundColor Cyan
    Write-Host "  cd admin-app" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host "`nThen open: http://localhost:3010" -ForegroundColor Cyan
} else {
    Write-Host "[FAILED] Admin app has issues" -ForegroundColor Red
    Write-Host "`nRun the fix script:" -ForegroundColor Yellow
    Write-Host "  .\fix-admin-white-screen.ps1" -ForegroundColor White
}

Write-Host ""
