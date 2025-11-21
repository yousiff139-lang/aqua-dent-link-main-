# Fix: "No token provided" Error - Step by Step

## The Error
When loading appointments, patients, or doctors in admin app, you see:
- "No token provided"
- "Failed to load" error

## Root Cause
The admin app needs to send an API key in the request header, but:
1. The `.env` file might not exist
2. The API key might not be set
3. The admin app might not have been restarted after creating `.env`

## Complete Fix (Do All Steps)

### Step 1: Create admin-app/.env File

**Using PowerShell (Recommended):**
```powershell
cd admin-app
@"
VITE_BACKEND_URL=http://localhost:3001/api
VITE_ADMIN_API_KEY=admin-key-aquadent-2024-secure
"@ | Out-File -FilePath .env -Encoding utf8
```

**Or manually:**
1. Open Notepad
2. Paste this:
   ```
   VITE_BACKEND_URL=http://localhost:3001/api
   VITE_ADMIN_API_KEY=admin-key-aquadent-2024-secure
   ```
3. Save as: `admin-app\.env`
   - Change "Save as type" to "All Files (*.*)"
   - Make sure filename is exactly `.env` (not `.env.txt`)

### Step 2: Verify Backend Has Matching Key

Check `backend/.env` has:
```env
ADMIN_API_KEYS=admin-key-aquadent-2024-secure
```

If it's different, update `admin-app/.env` to match.

### Step 3: RESTART Admin App ⚠️ CRITICAL

**This is the most important step!**

Environment variables are ONLY loaded when the app starts.

1. **Stop the admin app:**
   - Go to the terminal where admin app is running
   - Press `Ctrl+C` to stop it

2. **Start it again:**
   ```bash
   cd admin-app
   npm run dev
   ```

3. **Wait for it to fully start:**
   - You should see: `Local: http://localhost:3010`

### Step 4: Test

1. Open admin app in browser
2. Login with admin email
3. Try:
   - Appointments page
   - Patients page  
   - Doctors page

All should work now! ✅

## Verify It's Working

### Check Browser Console
1. Open DevTools (F12)
2. Go to Network tab
3. Try loading appointments
4. Click on the request to `/admin/appointments`
5. Check Headers section
6. You should see: `x-admin-api-key: admin-key-aquadent-2024-secure`

### Check File Exists
```powershell
Test-Path admin-app\.env
# Should return: True
```

### Check File Content
```powershell
Get-Content admin-app\.env
# Should show:
# VITE_BACKEND_URL=http://localhost:3001/api
# VITE_ADMIN_API_KEY=admin-key-aquadent-2024-secure
```

## Common Mistakes

### ❌ Mistake 1: Forgot to Restart
- Created `.env` file but didn't restart admin app
- **Fix:** Restart the admin app

### ❌ Mistake 2: Wrong File Location
- Created `.env` in wrong folder
- **Fix:** Must be in `admin-app/.env` (not `admin-app/src/.env`)

### ❌ Mistake 3: Wrong Filename
- Saved as `.env.txt` instead of `.env`
- **Fix:** Rename to `.env` (no extension)

### ❌ Mistake 4: API Key Mismatch
- Keys in frontend and backend don't match
- **Fix:** Make sure both have the exact same key

### ❌ Mistake 5: Typo in Variable Name
- Used `VITE_ADMIN_KEY` instead of `VITE_ADMIN_API_KEY`
- **Fix:** Must be exactly `VITE_ADMIN_API_KEY`

## Still Not Working?

### Debug Steps

1. **Check if file exists:**
   ```powershell
   ls admin-app\.env
   ```

2. **Check file content:**
   ```powershell
   Get-Content admin-app\.env
   ```

3. **Check backend key:**
   ```powershell
   Select-String -Path backend\.env -Pattern "ADMIN_API_KEYS"
   ```

4. **Check browser console:**
   - Open DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

5. **Verify backend is running:**
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
   ```

6. **Test API directly:**
   ```powershell
   $headers = @{ "x-admin-api-key" = "admin-key-aquadent-2024-secure" }
   Invoke-WebRequest -Uri "http://localhost:3001/api/admin/appointments" -Headers $headers -UseBasicParsing
   ```

## Quick Test Script

Run this to verify everything:

```powershell
# Check .env exists
if (Test-Path "admin-app\.env") {
    Write-Host "✅ .env file exists" -ForegroundColor Green
    Get-Content "admin-app\.env"
} else {
    Write-Host "❌ .env file NOT found" -ForegroundColor Red
}

# Check backend key
$backendKey = Select-String -Path "backend\.env" -Pattern "ADMIN_API_KEYS=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value }
if ($backendKey) {
    Write-Host "✅ Backend key: $backendKey" -ForegroundColor Green
} else {
    Write-Host "❌ Backend key NOT found" -ForegroundColor Red
}

# Test backend connection
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
    Write-Host "✅ Backend is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend is NOT running" -ForegroundColor Red
}
```



