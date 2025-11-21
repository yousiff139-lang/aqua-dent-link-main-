# Backend Port Fix

## Issue Found
Your `backend/.env` file had `PORT=5000`, but the frontend apps (admin app and dentist portal) are configured to connect to port **3001**.

## Fix Applied
✅ Updated `backend/.env` to use `PORT=3001`

## Next Steps

1. **Start the Backend Server:**
   - Navigate to `backend` folder
   - Run: `npm run dev`
   - Or double-click `start-backend.bat`

2. **Verify it's running:**
   - Open: http://localhost:3001/health
   - You should see a JSON response

3. **Test the connections:**
   - Try logging into dentist portal
   - Try accessing admin app appointments/patients

## If You Still Get Errors

### Check Backend is Running
- Look for the console message: `🚀 Server started successfully port: 3001`
- Test: http://localhost:3001/health

### Check Environment Variables
Make sure `backend/.env` has:
```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Check CORS
Make sure `CORS_ORIGIN` in `.env` includes your frontend URLs:
```env
CORS_ORIGIN=http://localhost:8000,http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:3010
```

## Alternative: Change Frontend to Port 5000

If you prefer to keep backend on port 5000, update these files:

**admin-app/.env:**
```
VITE_BACKEND_URL=http://localhost:5000/api
```

**dentist-portal/.env:**
```
VITE_API_URL=http://localhost:5000/api
VITE_BACKEND_URL=http://localhost:5000/api
```

But it's easier to just use port 3001 for everything! ✅

