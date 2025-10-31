# Dental Care Connect - System Status Verification Script
# Run this to check if all components are properly configured

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Dental Care Connect - System Status" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "backend")) {
    Write-Host "❌ Error: Run this script from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Checking Configuration Files..." -ForegroundColor Yellow
Write-Host ""

# Function to check if file exists
function Test-ConfigFile {
    param($path, $name)
    if (Test-Path $path) {
        Write-Host "✅ $name exists" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $name missing" -ForegroundColor Red
        return $false
    }
}

# Function to check environment variable
function Test-EnvVariable {
    param($file, $varName, $shouldNotBe)
    
    if (-not (Test-Path $file)) {
        Write-Host "  ⚠️  File not found: $file" -ForegroundColor Yellow
        return $false
    }
    
    $content = Get-Content $file -Raw
    if ($content -match "$varName=(.+)") {
        $value = $matches[1].Trim()
        if ($value -eq $shouldNotBe) {
            Write-Host "  ❌ $varName needs to be updated (currently: $shouldNotBe)" -ForegroundColor Red
            return $false
        } elseif ($value -eq "") {
            Write-Host "  ❌ $varName is empty" -ForegroundColor Red
            return $false
        } else {
            Write-Host "  ✅ $varName is configured" -ForegroundColor Green
            return $true
        }
    } else {
        Write-Host "  ❌ $varName not found in file" -ForegroundColor Red
        return $false
    }
}

# Check configuration files
$configOk = $true

Write-Host "1. Backend Configuration" -ForegroundColor Cyan
$configOk = (Test-ConfigFile "backend/.env" "backend/.env") -and $configOk
$configOk = (Test-EnvVariable "backend/.env" "SUPABASE_SERVICE_ROLE_KEY" "YOUR_SERVICE_ROLE_KEY_HERE") -and $configOk
$configOk = (Test-EnvVariable "backend/.env" "JWT_SECRET" "your-jwt-secret-change-in-production-use-random-string") -and $configOk
$configOk = (Test-EnvVariable "backend/.env" "SUPABASE_URL" "") -and $configOk
Write-Host ""

Write-Host "2. Frontend Configuration" -ForegroundColor Cyan
$configOk = (Test-ConfigFile ".env" ".env") -and $configOk
$configOk = (Test-EnvVariable ".env" "VITE_SUPABASE_URL" "") -and $configOk
$configOk = (Test-EnvVariable ".env" "VITE_SUPABASE_ANON_KEY" "") -and $configOk
Write-Host ""

Write-Host "3. Admin Dashboard Configuration" -ForegroundColor Cyan
$configOk = (Test-ConfigFile "admin-app/.env" "admin-app/.env") -and $configOk
$configOk = (Test-EnvVariable "admin-app/.env" "VITE_SUPABASE_URL" "") -and $configOk
Write-Host ""

Write-Host "4. Dentist Portal Configuration" -ForegroundColor Cyan
$configOk = (Test-ConfigFile "dentist-portal/.env" "dentist-portal/.env") -and $configOk
$configOk = (Test-EnvVariable "dentist-portal/.env" "VITE_SUPABASE_URL" "") -and $configOk
Write-Host ""

# Check if node_modules exist
Write-Host "📦 Checking Dependencies..." -ForegroundColor Yellow
Write-Host ""

function Test-Dependencies {
    param($path, $name)
    if (Test-Path "$path/node_modules") {
        Write-Host "✅ $name dependencies installed" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $name dependencies missing (run: cd $path && npm install)" -ForegroundColor Red
        return $false
    }
}

$depsOk = $true
$depsOk = (Test-Dependencies "backend" "Backend") -and $depsOk
$depsOk = (Test-Dependencies "." "Frontend") -and $depsOk
$depsOk = (Test-Dependencies "admin-app" "Admin") -and $depsOk
$depsOk = (Test-Dependencies "dentist-portal" "Dentist Portal") -and $depsOk
Write-Host ""

# Check if backend is running
Write-Host "🔌 Checking Services..." -ForegroundColor Yellow
Write-Host ""

function Test-Service {
    param($url, $name)
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 2 -ErrorAction Stop
        Write-Host "✅ $name is running" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ $name is not running" -ForegroundColor Red
        return $false
    }
}

$servicesOk = $true
$servicesOk = (Test-Service "http://localhost:3000/health" "Backend API") -and $servicesOk
$servicesOk = (Test-Service "http://localhost:5174" "Public Site") -and $servicesOk
$servicesOk = (Test-Service "http://localhost:3010" "Admin Dashboard") -and $servicesOk
$servicesOk = (Test-Service "http://localhost:3011" "Dentist Portal") -and $servicesOk
Write-Host ""

# Check database migrations
Write-Host "🗄️  Checking Database..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path "supabase/migrations") {
    $migrations = Get-ChildItem "supabase/migrations" -Filter "*.sql"
    Write-Host "  Found $($migrations.Count) migration files" -ForegroundColor Cyan
    
    # Check for critical migration
    $criticalMigration = $migrations | Where-Object { $_.Name -like "*fix_schema_cache_appointments*" }
    if ($criticalMigration) {
        Write-Host "  ✅ Critical schema fix migration found" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Critical schema fix migration not found" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Migrations directory not found" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

if ($configOk -and $depsOk) {
    Write-Host "✅ Configuration: OK" -ForegroundColor Green
} else {
    Write-Host "❌ Configuration: Issues Found" -ForegroundColor Red
}

if ($depsOk) {
    Write-Host "✅ Dependencies: OK" -ForegroundColor Green
} else {
    Write-Host "❌ Dependencies: Issues Found" -ForegroundColor Red
}

if ($servicesOk) {
    Write-Host "✅ Services: All Running" -ForegroundColor Green
} else {
    Write-Host "⚠️  Services: Some Not Running (this is OK if you haven't started them yet)" -ForegroundColor Yellow
}

Write-Host ""

# Next steps
if (-not $configOk) {
    Write-Host "🔧 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Fix configuration issues above" -ForegroundColor White
    Write-Host "2. Update SUPABASE_SERVICE_ROLE_KEY in backend/.env" -ForegroundColor White
    Write-Host "   Get it from: https://supabase.com/dashboard → Settings → API" -ForegroundColor White
    Write-Host ""
}

if (-not $depsOk) {
    Write-Host "📦 Install Dependencies:" -ForegroundColor Yellow
    Write-Host "   npm install" -ForegroundColor White
    Write-Host "   cd backend && npm install" -ForegroundColor White
    Write-Host "   cd admin-app && npm install" -ForegroundColor White
    Write-Host "   cd dentist-portal && npm install" -ForegroundColor White
    Write-Host ""
}

if (-not $servicesOk) {
    Write-Host "🚀 Start Services:" -ForegroundColor Yellow
    Write-Host "   Terminal 1: cd backend && npm run dev" -ForegroundColor White
    Write-Host "   Terminal 2: npm run dev" -ForegroundColor White
    Write-Host "   Terminal 3: cd admin-app && npm run dev" -ForegroundColor White
    Write-Host "   Terminal 4: cd dentist-portal && npm run dev" -ForegroundColor White
    Write-Host ""
}

if ($configOk -and $depsOk -and $servicesOk) {
    Write-Host "🎉 System is fully operational!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access your applications:" -ForegroundColor Cyan
    Write-Host "  Public Site:      http://localhost:5174" -ForegroundColor White
    Write-Host "  Admin Dashboard:  http://localhost:3010" -ForegroundColor White
    Write-Host "  Dentist Portal:   http://localhost:3011" -ForegroundColor White
    Write-Host "  Backend API:      http://localhost:3000" -ForegroundColor White
    Write-Host ""
}

Write-Host "For detailed instructions, see: START_SYSTEM.md" -ForegroundColor Cyan
Write-Host ""
