# Quick Start: Backend Server

## The Problem
You're seeing: **"Failed to connect to backend server at http://localhost:3001/api. Please ensure the backend is running."**

This means the backend server is **not running** on port 3001.

## Solution: Start the Backend Server

### Option 1: Using the Batch File (Windows - Easiest)
1. Navigate to the `backend` folder
2. Double-click `start-backend.bat`
3. The server should start on port 3001

### Option 2: Using PowerShell Script (Windows)
1. Open PowerShell
2. Navigate to the `backend` folder:
   ```powershell
   cd backend
   ```
3. Run the script:
   ```powershell
   .\start-backend.ps1
   ```

### Option 3: Manual Start (Any OS)
1. Open terminal/command prompt
2. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
3. Install dependencies (if not done):
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

## Verify Backend is Running

After starting, you should see:
```
🚀 Server started successfully
  port: 3001
  environment: development
  apiPrefix: /api
```

Test it by opening in browser:
- http://localhost:3001/health

Or using curl:
```bash
curl http://localhost:3001/health
```

## Required Environment Variables

Make sure `backend/.env` file exists with:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=3001
```

**These are REQUIRED** - the server won't start without them!

## Common Issues

### "Port 3001 already in use"
- Another process is using port 3001
- Kill it or change PORT in `.env` to a different port

### "Invalid environment variables"
- Check that `.env` file exists in `backend` folder
- Verify all required variables are set (see above)

### "Cannot find module"
- Run `npm install` in the `backend` folder

### Server starts but API calls still fail
- Check CORS configuration in `backend/src/config/env.ts`
- Make sure your frontend URLs are in `CORS_ORIGIN`

## Next Steps

Once the backend is running:
1. ✅ Backend server running on port 3001
2. ✅ Test health endpoint: http://localhost:3001/health
3. ✅ Try logging into dentist portal
4. ✅ Try accessing admin app appointments/patients

The frontend apps should now be able to connect!

