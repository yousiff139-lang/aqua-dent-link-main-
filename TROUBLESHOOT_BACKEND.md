# Troubleshooting: Backend Server Not Connecting

## Quick Diagnosis

### Step 1: Check if Backend is Running
Open a new terminal and run:
```powershell
Get-NetTCPConnection -LocalPort 3001
```

If you see output, the server is running. If not, it's not running.

### Step 2: Check Backend Health
Open in browser or use curl:
```
http://localhost:3001/health
```

Should return JSON with server status.

## Common Issues & Solutions

### Issue 1: Backend Server Not Started
**Symptoms:** "Failed to connect to backend server"

**Solution:**
1. Open terminal/command prompt
2. Navigate to `backend` folder:
   ```bash
   cd backend
   ```
3. Start the server:
   ```bash
   npm run dev
   ```
4. Wait for message: `🚀 Server started successfully port: 3001`

### Issue 2: Missing Environment Variables
**Symptoms:** Server won't start, shows "Invalid environment variables"

**Solution:**
1. Check `backend/.env` file exists
2. Ensure it has these REQUIRED variables:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   PORT=3001
   ```
3. Get these from Supabase Dashboard → Settings → API

### Issue 3: Port Already in Use
**Symptoms:** "Port 3001 already in use" or "EADDRINUSE"

**Solution:**
1. Find what's using port 3001:
   ```powershell
   Get-NetTCPConnection -LocalPort 3001 | Select-Object OwningProcess
   ```
2. Kill the process:
   ```powershell
   Stop-Process -Id <PID> -Force
   ```
3. Or change PORT in `.env` to a different port (and update frontend configs)

### Issue 4: Dependencies Not Installed
**Symptoms:** "Cannot find module" errors

**Solution:**
```bash
cd backend
npm install
```

### Issue 5: Wrong Port in Frontend
**Symptoms:** Backend running but frontend can't connect

**Check these files:**

**admin-app/.env:**
```env
VITE_BACKEND_URL=http://localhost:3001/api
```

**dentist-portal/.env:**
```env
VITE_API_URL=http://localhost:3001/api
VITE_BACKEND_URL=http://localhost:3001/api
```

### Issue 6: CORS Errors
**Symptoms:** Browser console shows CORS errors

**Solution:**
Update `backend/.env`:
```env
CORS_ORIGIN=http://localhost:8000,http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:3010
```

Make sure your frontend URLs are included.

## Step-by-Step Startup Guide

### 1. Verify Environment File
```bash
cd backend
# Check .env exists and has required variables
cat .env  # or type .env on Windows
```

### 2. Install Dependencies (if needed)
```bash
npm install
```

### 3. Start Server
```bash
npm run dev
```

### 4. Verify It's Running
- Look for: `🚀 Server started successfully port: 3001`
- Test: http://localhost:3001/health
- Should see JSON response

### 5. Test API Endpoints
```bash
# Health check
curl http://localhost:3001/health

# Admin appointments (if you have admin API key)
curl http://localhost:3001/api/admin/appointments \
  -H "x-admin-api-key: your_key"
```

## Windows Quick Start

1. **Double-click:** `backend/start-backend.bat`
   - This will check for .env, install dependencies, and start the server

2. **Or use PowerShell:**
   ```powershell
   cd backend
   .\start-backend.ps1
   ```

## Still Not Working?

### Check Backend Logs
Look at the terminal where you started the backend. Common errors:

- **"Invalid environment variables"** → Check .env file
- **"Port already in use"** → Kill process on port 3001
- **"Cannot find module"** → Run `npm install`
- **"ECONNREFUSED"** → Backend not running

### Verify Backend is Actually Running
```powershell
# Check if port 3001 is listening
netstat -ano | findstr :3001

# Check Node processes
Get-Process node
```

### Test Backend Directly
Open browser: http://localhost:3001/health

If this doesn't work, the backend isn't running properly.

## Need More Help?

1. Check backend terminal for error messages
2. Verify all environment variables are set
3. Make sure Supabase credentials are correct
4. Check that no firewall is blocking port 3001



