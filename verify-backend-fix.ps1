# ============================================================================
# Backend Fix Verification Script
# ============================================================================
# This script verifies that all backend fixes have been applied correctly
# ============================================================================

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "  AQUA DENT LINK - BACKEND FIX VERIFICATION" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# Function to test endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{}
    )
    
    Write-Host "Testing: $Name..." -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            Write-Host " ✅ PASSED" -ForegroundColor Green
            return $true
        } else {
            Write-Host " ❌ FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host " ❌ FAILED ($($_.Exception.Message))" -ForegroundColor Red
        return $false
    }
}

# Function to check if service is running
function Test-ServiceRunning {
    param(
        [string]$Name,
        [int]$Port
    )
    
    Write-Host "Checking: $Name (Port $Port)..." -NoNewline
    
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -ErrorAction Stop
        
        if ($connection.TcpTestSucceeded) {
            Write-Host " ✅ RUNNING" -ForegroundColor Green
            return $true
        } else {
            Write-Host " ❌ NOT RUNNING" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host " ❌ NOT RUNNING" -ForegroundColor Red
        return $false
    }
}

Write-Host "[1/4] Checking Services Status" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

$backendRunning = Test-ServiceRunning -Name "Backend API" -Port 5000
$userWebRunning = Test-ServiceRunning -Name "User Website" -Port 5173
$adminAppRunning = Test-ServiceRunning -Name "Admin App" -Port 5174
$dentistPortalRunning = Test-ServiceRunning -Name "Dentist Portal" -Port 5175

Write-Host ""

if (-not $backendRunning) {
    Write-Host "⚠️  Backend API is not running. Please start it first:" -ForegroundColor Yellow
    Write-Host "   cd backend && npm run dev" -ForegroundColor Gray
    Write-Host ""
    $allPassed = $false
}

if (-not $adminAppRunning) {
    Write-Host "⚠️  Admin App is not running. Please start it:" -ForegroundColor Yellow
    Write-Host "   cd admin-app && npm run dev" -ForegroundColor Gray
    Write-Host ""
}

if (-not $dentistPortalRunning) {
    Write-Host "⚠️  Dentist Portal is not running. Please start it:" -ForegroundColor Yellow
    Write-Host "   cd dentist-portal && npm run dev" -ForegroundColor Gray
    Write-Host ""
}

if ($backendRunning) {
    Write-Host "[2/4] Testing Backend API Endpoints" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Yellow
    
    # Test health endpoint
    $healthPassed = Test-Endpoint -Name "Health Check" -Url "http://localhost:5000/health"
    $allPassed = $allPassed -and $healthPassed
    
    # Test API base
    $apiPassed = Test-Endpoint -Name "API Base" -Url "http://localhost:5000/api"
    $allPassed = $allPassed -and $apiPassed
    
    Write-Host ""
} else {
    Write-Host "[2/4] Skipping Backend API Tests (Backend not running)" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "[3/4] Checking Environment Files" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Check backend .env
Write-Host "Checking: backend/.env..." -NoNewline
if (Test-Path "backend/.env") {
    $backendEnv = Get-Content "backend/.env" -Raw
    if ($backendEnv -match "SUPABASE_URL" -and $backendEnv -match "SUPABASE_SERVICE_ROLE_KEY") {
        Write-Host " ✅ EXISTS" -ForegroundColor Green
    } else {
        Write-Host " ⚠️  MISSING KEYS" -ForegroundColor Yellow
        $allPassed = $false
    }
} else {
    Write-Host " ❌ NOT FOUND" -ForegroundColor Red
    $allPassed = $false
}

# Check admin-app .env
Write-Host "Checking: admin-app/.env..." -NoNewline
if (Test-Path "admin-app/.env") {
    $adminEnv = Get-Content "admin-app/.env" -Raw
    if ($adminEnv -match "VITE_SUPABASE_URL" -and $adminEnv -match "VITE_SUPABASE_ANON_KEY") {
        Write-Host " ✅ EXISTS" -ForegroundColor Green
    } else {
        Write-Host " ⚠️  MISSING KEYS" -ForegroundColor Yellow
        $allPassed = $false
    }
} else {
    Write-Host " ❌ NOT FOUND" -ForegroundColor Red
    $allPassed = $false
}

# Check dentist-portal .env
Write-Host "Checking: dentist-portal/.env..." -NoNewline
if (Test-Path "dentist-portal/.env") {
    $dentistEnv = Get-Content "dentist-portal/.env" -Raw
    if ($dentistEnv -match "VITE_SUPABASE_URL" -and $dentistEnv -match "VITE_SUPABASE_ANON_KEY") {
        Write-Host " ✅ EXISTS" -ForegroundColor Green
    } else {
        Write-Host " ⚠️  MISSING KEYS" -ForegroundColor Yellow
        $allPassed = $false
    }
} else {
    Write-Host " ❌ NOT FOUND" -ForegroundColor Red
    $allPassed = $false
}

# Check main .env
Write-Host "Checking: .env (main)..." -NoNewline
if (Test-Path ".env") {
    $mainEnv = Get-Content ".env" -Raw
    if ($mainEnv -match "VITE_SUPABASE_URL" -and $mainEnv -match "VITE_SUPABASE_ANON_KEY") {
        Write-Host " ✅ EXISTS" -ForegroundColor Green
    } else {
        Write-Host " ⚠️  MISSING KEYS" -ForegroundColor Yellow
        $allPassed = $false
    }
} else {
    Write-Host " ❌ NOT FOUND" -ForegroundColor Red
    $allPassed = $false
}

Write-Host ""

Write-Host "[4/4] Checking Required Files" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Check SQL migration file
Write-Host "Checking: COMPLETE_BACKEND_FIX.sql..." -NoNewline
if (Test-Path "COMPLETE_BACKEND_FIX.sql") {
    Write-Host " ✅ EXISTS" -ForegroundColor Green
} else {
    Write-Host " ❌ NOT FOUND" -ForegroundColor Red
    $allPassed = $false
}

# Check implementation guide
Write-Host "Checking: BACKEND_FIX_IMPLEMENTATION_GUIDE.md..." -NoNewline
if (Test-Path "BACKEND_FIX_IMPLEMENTATION_GUIDE.md") {
    Write-Host " ✅ EXISTS" -ForegroundColor Green
} else {
    Write-Host " ❌ NOT FOUND" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan

if ($allPassed) {
    Write-Host "  ✅ ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host "============================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Your backend is properly configured and running." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Open Admin App: http://localhost:5174" -ForegroundColor Gray
    Write-Host "  2. Test viewing Appointments, Patients, and Doctors" -ForegroundColor Gray
    Write-Host "  3. Open Dentist Portal: http://localhost:5175" -ForegroundColor Gray
    Write-Host "  4. Test marking an appointment as completed" -ForegroundColor Gray
    Write-Host "  5. Verify changes sync across all apps" -ForegroundColor Gray
} else {
    Write-Host "  ⚠️  SOME CHECKS FAILED" -ForegroundColor Yellow
    Write-Host "============================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Please fix the issues above before proceeding." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common Solutions:" -ForegroundColor Yellow
    Write-Host "  1. Start missing services:" -ForegroundColor Gray
    Write-Host "     - Backend: cd backend && npm run dev" -ForegroundColor Gray
    Write-Host "     - Admin: cd admin-app && npm run dev" -ForegroundColor Gray
    Write-Host "     - Dentist: cd dentist-portal && npm run dev" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Check environment variables in .env files" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Apply SQL migration in Supabase Dashboard" -ForegroundColor Gray
    Write-Host "     - Open COMPLETE_BACKEND_FIX.sql" -ForegroundColor Gray
    Write-Host "     - Copy content to Supabase SQL Editor" -ForegroundColor Gray
    Write-Host "     - Run the migration" -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
