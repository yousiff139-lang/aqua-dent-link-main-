# Fix All Configuration Issues - PowerShell Script
# Run with: .\fix-all-config-issues.ps1

Write-Host "🔧 Dental Care Connect - Configuration Fix Script" -ForegroundColor Cyan
Write-Host "=" * 60
Write-Host ""

# Check if running in correct directory
if (-not (Test-Path ".\backend")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Checking configuration issues..." -ForegroundColor Yellow
Write-Host ""

# Issue 1: Backend Service Role Key
Write-Host "1️⃣  Checking Backend Service Role Key..." -ForegroundColor Cyan
$backendEnv = Get-Content ".\backend\.env" -Raw
if ($backendEnv -match "SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE") {
    Write-Host "   ❌ Backend service role key not configured" -ForegroundColor Red
    Write-Host "   📝 Action Required:" -ForegroundColor Yellow
    Write-Host "      1. Go to: https://supabase.com/dashboard" -ForegroundColor White
    Write-Host "      2. Select project: ypbklvrerxikktkbswad" -ForegroundColor White
    Write-Host "      3. Settings → API → Copy 'service_role' key" -ForegroundColor White
    Write-Host "      4. Update backend\.env file" -ForegroundColor White
    Write-Host ""
    $issue1 = $true
} else {
    Write-Host "   ✅ Backend service role key configured" -ForegroundColor Green
    $issue1 = $false
}

# Issue 2: Admin App Supabase Project
Write-Host "2️⃣  Checking Admin App Supabase Configuration..." -ForegroundColor Cyan
$mainEnv = Get-Content ".\.env" -Raw
$adminEnv = Get-Content ".\admin-app\.env" -Raw

$mainProjectId = if ($mainEnv -match 'VITE_SUPABASE_PROJECT_ID="([^"]+)"') { $matches[1] } else { $null }
$adminProjectId = if ($adminEnv -match 'VITE_SUPABASE_PROJECT_ID="([^"]+)"') { $matches[1] } else { $null }

if ($mainProjectId -ne $adminProjectId) {
    Write-Host "   ⚠️  Admin app uses different Supabase project" -ForegroundColor Yellow
    Write-Host "      Main app:  $mainProjectId" -ForegroundColor White
    Write-Host "      Admin app: $adminProjectId" -ForegroundColor White
    Write-Host ""
    Write-Host "   ❓ Should they use the SAME project? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host "   "
    
    if ($response -eq "Y" -or $response -eq "y") {
        Write-Host "   🔄 Updating admin-app\.env..." -ForegroundColor Cyan
        
        # Extract values from main .env
        $mainUrl = if ($mainEnv -match 'VITE_SUPABASE_URL="([^"]+)"') { $matches[1] } else { $null }
        $mainKey = if ($mainEnv -match 'VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"') { $matches[1] } else { $null }
        
        # Update admin .env
        $newAdminEnv = @"
VITE_SUPABASE_PROJECT_ID="$mainProjectId"
VITE_SUPABASE_PUBLISHABLE_KEY="$mainKey"
VITE_SUPABASE_URL="$mainUrl"
"@
        
        Set-Content ".\admin-app\.env" $newAdminEnv
        Write-Host "   ✅ Admin app configuration updated" -ForegroundColor Green
        $issue2 = $false
    } else {
        Write-Host "   ℹ️  Keeping separate projects (intentional)" -ForegroundColor Blue
        $issue2 = $false
    }
} else {
    Write-Host "   ✅ Admin app uses same Supabase project" -ForegroundColor Green
    $issue2 = $false
}
Write-Host ""

# Issue 3: Database Migration
Write-Host "3️⃣  Checking Database Migration Status..." -ForegroundColor Cyan
$migrationFile = ".\supabase\migrations\20251027140000_fix_schema_cache_appointments.sql"
if (Test-Path $migrationFile) {
    Write-Host "   ⚠️  Migration file exists but may not be applied" -ForegroundColor Yellow
    Write-Host "   📝 Action Required:" -ForegroundColor Yellow
    Write-Host "      1. Open: https://supabase.com/dashboard/project/ypbklvrerxikktkbswad/sql/new" -ForegroundColor White
    Write-Host "      2. Copy content from: $migrationFile" -ForegroundColor White
    Write-Host "      3. Paste and click 'Run'" -ForegroundColor White
    Write-Host "      4. Verify success messages" -ForegroundColor White
    Write-Host ""
    $issue3 = $true
} else {
    Write-Host "   ℹ️  Migration file not found (may already be applied)" -ForegroundColor Blue
    $issue3 = $false
}

# Summary
Write-Host "=" * 60
Write-Host "📊 Configuration Check Summary" -ForegroundColor Cyan
Write-Host "=" * 60
Write-Host ""

$totalIssues = 0
if ($issue1) { $totalIssues++ }
if ($issue2) { $totalIssues++ }
if ($issue3) { $totalIssues++ }

if ($totalIssues -eq 0) {
    Write-Host "✅ All configuration issues resolved!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Ready to start services:" -ForegroundColor Cyan
    Write-Host "   .\start-all-services.bat" -ForegroundColor White
} else {
    Write-Host "⚠️  $totalIssues issue(s) require manual action" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    if ($issue1) {
        Write-Host "   1. Update backend service role key" -ForegroundColor White
    }
    if ($issue3) {
        Write-Host "   2. Apply database migration" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "📚 Documentation:" -ForegroundColor Cyan
    Write-Host "   - SYSTEM_STATUS_COMPLETE.md" -ForegroundColor White
    Write-Host "   - ADMIN_APP_ERROR_BOUNDARY_SETUP.md" -ForegroundColor White
    Write-Host "   - README_IMPLEMENTATION.md" -ForegroundColor White
}

Write-Host ""
Write-Host "💡 For detailed help, see: SYSTEM_STATUS_COMPLETE.md" -ForegroundColor Blue
Write-Host ""
