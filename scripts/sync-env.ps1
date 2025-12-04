# sync-env.ps1
$ErrorActionPreference = "Stop"

$backendEnvPath = Join-Path $PSScriptRoot "..\backend\.env"
$dentistEnvPath = Join-Path $PSScriptRoot "..\dentist-portal\.env"

Write-Host "Reading backend environment from $backendEnvPath..."

if (-not (Test-Path $backendEnvPath)) {
    Write-Error "Backend .env file not found at $backendEnvPath"
    exit 1
}

# Read backend .env
$backendContent = Get-Content $backendEnvPath
$supabaseUrl = $null
$supabaseKey = $null

foreach ($line in $backendContent) {
    if ($line -match "^SUPABASE_URL=(.+)$") {
        $supabaseUrl = $matches[1].Trim()
    }
    if ($line -match "^SUPABASE_ANON_KEY=(.+)$") {
        $supabaseKey = $matches[1].Trim()
    }
}

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Error "Could not find SUPABASE_URL or SUPABASE_ANON_KEY in backend .env"
    exit 1
}

Write-Host "Found Supabase credentials."

# Prepare dentist portal .env content
$dentistEnvContent = @(
    "VITE_API_URL=http://localhost:3001/api",
    "VITE_BACKEND_URL=http://localhost:3001/api",
    "VITE_SUPABASE_URL=$supabaseUrl",
    "VITE_SUPABASE_ANON_KEY=$supabaseKey"
)

Write-Host "Writing to dentist portal .env at $dentistEnvPath..."
$dentistEnvContent | Set-Content $dentistEnvPath

Write-Host "Successfully synced environment variables!"
