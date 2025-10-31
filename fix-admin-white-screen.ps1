# Fix Admin Dashboard White Screen Issue
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Admin Dashboard - White Screen Fix" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if admin-app directory exists
if (-not (Test-Path "admin-app")) {
    Write-Host "[ERROR] admin-app directory not found" -ForegroundColor Red
    Write-Host "Run this script from the project root directory" -ForegroundColor Yellow
    exit 1
}

Write-Host "Step 1: Checking dependencies..." -ForegroundColor Yellow

# Check if node_modules exists
if (-not (Test-Path "admin-app/node_modules")) {
    Write-Host "[FIX] Installing dependencies..." -ForegroundColor Yellow
    Set-Location admin-app
    npm install
    Set-Location ..
    Write-Host "[OK] Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "[OK] Dependencies exist" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 2: Checking environment variables..." -ForegroundColor Yellow

# Check .env file
if (-not (Test-Path "admin-app/.env")) {
    Write-Host "[FIX] Creating .env file..." -ForegroundColor Yellow
    
    # Copy from .env.example if it exists
    if (Test-Path "admin-app/.env.example") {
        Copy-Item "admin-app/.env.example" "admin-app/.env"
        Write-Host "[OK] Created .env from .env.example" -ForegroundColor Green
    } else {
        # Create basic .env
        @"
VITE_SUPABASE_URL=https://ypbklvrerxikktkbswad.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwYmtsdnJlcnhpa2t0a2Jzd2FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDYwMTUsImV4cCI6MjA3NTY4MjAxNX0.e8Gt-zzSlsWN208RJ-FUMLn-L9lkWNFsVEkqCfNGJJ8
"@ | Out-File -FilePath "admin-app/.env" -Encoding UTF8
        Write-Host "[OK] Created .env file" -ForegroundColor Green
    }
} else {
    Write-Host "[OK] .env file exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 3: Clearing cache and rebuilding..." -ForegroundColor Yellow

# Clear Vite cache
if (Test-Path "admin-app/node_modules/.vite") {
    Remove-Item -Recurse -Force "admin-app/node_modules/.vite"
    Write-Host "[OK] Cleared Vite cache" -ForegroundColor Green
}

# Clear dist folder
if (Test-Path "admin-app/dist") {
    Remove-Item -Recurse -Force "admin-app/dist"
    Write-Host "[OK] Cleared dist folder" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 4: Testing admin app startup..." -ForegroundColor Yellow

# Try to start the dev server
Write-Host "[INFO] Starting admin app on port 3010..." -ForegroundColor Cyan
Write-Host "[INFO] Press Ctrl+C to stop after verifying it works" -ForegroundColor Cyan
Write-Host ""

Set-Location admin-app
npm run dev
