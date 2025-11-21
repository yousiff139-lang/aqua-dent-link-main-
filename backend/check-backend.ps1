# Check if backend server is running
Write-Host "Checking backend server status..." -ForegroundColor Cyan

$port = 3001
$url = "http://localhost:$port/health"

try {
    $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 2 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend server is running on port $port" -ForegroundColor Green
        Write-Host "   Health check: $url" -ForegroundColor Gray
        exit 0
    }
} catch {
    Write-Host "❌ Backend server is NOT running on port $port" -ForegroundColor Red
    Write-Host ""
    Write-Host "To start the backend server:" -ForegroundColor Yellow
    Write-Host "  1. Open a terminal in the 'backend' folder" -ForegroundColor Gray
    Write-Host "  2. Run: npm run dev" -ForegroundColor Gray
    Write-Host "  3. Or run: .\start-backend.bat" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Make sure you have:" -ForegroundColor Yellow
    Write-Host "  - Created backend/.env file with Supabase credentials" -ForegroundColor Gray
    Write-Host "  - Installed dependencies (npm install)" -ForegroundColor Gray
    exit 1
}

