# 🔧 Fix Backend Connection Errors

## Problem
You're seeing "Failed to connect to backend server at http://localhost:3001/api" errors everywhere because **the backend server is not running**.

## Quick Fix

### Step 1: Start the Backend Server

**Option A: Using the fixed startup script (Recommended)**
```powershell
.\start-backend-fixed.ps1
```

**Option B: Manual start**
```powershell
cd backend
npm run dev
```

### Step 2: Verify Backend is Running

You should see output like:
```
🚀 Server started successfully
port: 3001
environment: development
apiPrefix: /api
```

### Step 3: Test the Backend

Open your browser and go to:
- **Health Check**: http://localhost:3001/health
- Should return: `{"status":"healthy",...}`

Or use the status checker:
```powershell
cd backend
node check-backend-status.js
```

## Common Issues

### Issue 1: Port 3001 Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3001`

**Solution**:
```powershell
# Find process using port 3001
netstat -ano | findstr :3001

# Stop the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

Or use the startup script which handles this automatically.

### Issue 2: Missing .env File

**Error**: Backend won't start or can't connect to Supabase

**Solution**: Create `backend/.env` file with:
```env
NODE_ENV=development
PORT=3001
API_PREFIX=/api

SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

CORS_ORIGIN=http://localhost:8000,http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:3010,http://localhost:8080
LOG_LEVEL=info
```

### Issue 3: Supabase Connection Failed

**Error**: `TypeError: fetch failed` in backend logs

**Solution**:
1. Check Supabase credentials in `backend/.env`
2. Verify your Supabase project is active
3. Make sure `SUPABASE_URL` includes `https://`
4. Test connection:
   ```powershell
   cd backend
   node -e "require('dotenv').config(); const {createClient} = require('@supabase/supabase-js'); const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); supabase.from('profiles').select('id').limit(1).then(r => console.log('✅ Connected:', !r.error)).catch(e => console.error('❌ Error:', e.message));"
   ```

### Issue 4: Dependencies Not Installed

**Solution**:
```powershell
cd backend
npm install
```

## Verify Everything is Working

### 1. Backend Status
```powershell
cd backend
node check-backend-status.js
```

Should show all checks as ✅

### 2. Test Admin Endpoints
- http://localhost:3001/api/admin/dashboard/stats
- http://localhost:3001/api/admin/patients
- http://localhost:3001/api/admin/dentists

### 3. Test Dentist Endpoints
- http://localhost:3001/api/dentists/<email>/patients

### 4. Test Appointments
- http://localhost:3001/api/appointments

## Next Steps

Once the backend is running:

1. **Refresh your frontend apps** - They should now connect successfully
2. **Check browser console** - No more "Failed to connect" errors
3. **Test features**:
   - Admin dashboard should show stats
   - Patients section should load
   - Dentist portal should load appointments
   - User dashboard should show appointments

## Running All Services

You need to run these services simultaneously:

1. **Backend** (Terminal 1):
   ```powershell
   cd backend
   npm run dev
   ```

2. **Admin App** (Terminal 2):
   ```powershell
   cd admin-app
   npm run dev
   ```

3. **Dentist Portal** (Terminal 3):
   ```powershell
   cd dentist-portal
   npm run dev
   ```

4. **User Website** (Terminal 4):
   ```powershell
   npm run dev
   ```

## Still Having Issues?

1. **Check backend logs** - Look for errors when starting
2. **Verify environment variables** - Make sure all required vars are set
3. **Check network** - Make sure no firewall is blocking port 3001
4. **Try different port** - Change `PORT=3002` in `backend/.env` if 3001 is problematic

---

**Remember**: The backend MUST be running for all the frontend apps to work!

















