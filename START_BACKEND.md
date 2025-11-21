# How to Start the Backend Server

## Quick Start

The backend server needs to be running on port 3001 for the admin app and dentist portal to work.

### Option 1: Using npm (Recommended)

```bash
cd backend
npm run dev
```

### Option 2: Using the batch file (Windows)

```bash
cd backend
start-backend.bat
```

## Required Environment Variables

Make sure `backend/.env` file exists with these variables:

```env
NODE_ENV=development
PORT=3001
API_PREFIX=/api

SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

CORS_ORIGIN=http://localhost:8000,http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:3010
LOG_LEVEL=info

JWT_SECRET=your_jwt_secret_optional
ADMIN_API_KEYS=your_admin_api_key_optional
```

## Verify Backend is Running

1. Check if port 3001 is listening:
   ```bash
   netstat -ano | findstr :3001
   ```

2. Test the health endpoint:
   ```bash
   curl http://localhost:3001/health
   ```

   Should return:
   ```json
   {
     "status": "healthy",
     "timestamp": "...",
     "uptime": ...,
     "checks": {
       "database": "ok"
     }
   }
   ```

3. Test an API endpoint:
   ```bash
   curl http://localhost:3001/api/admin/appointments
   ```

## Troubleshooting

### Backend won't start

1. **Check environment variables:**
   - Make sure `backend/.env` exists
   - Verify all required variables are set (especially Supabase credentials)

2. **Check for port conflicts:**
   - Make sure nothing else is using port 3001
   - Change PORT in `.env` if needed

3. **Check dependencies:**
   ```bash
   cd backend
   npm install
   ```

4. **Check logs:**
   - Look at the console output when starting
   - Common errors:
     - Missing Supabase credentials
     - Port already in use
     - Database connection issues

### "Failed to connect to backend server" error

This means the backend is not running. Follow these steps:

1. **Start the backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Wait for the server to start:**
   - You should see: `🚀 Server started successfully`
   - Port should be 3001

3. **Verify it's running:**
   - Open browser: http://localhost:3001/health
   - Should see a JSON response

4. **Check frontend configuration:**
   - Admin app: `admin-app/.env` should have `VITE_BACKEND_URL=http://localhost:3001/api`
   - Dentist portal: `dentist-portal/.env` should have `VITE_API_URL=http://localhost:3001/api`

## Running All Services

To run all services at once:

1. **Backend** (Terminal 1):
   ```bash
   cd backend
   npm run dev
   ```

2. **Admin App** (Terminal 2):
   ```bash
   cd admin-app
   npm run dev
   ```

3. **Dentist Portal** (Terminal 3):
   ```bash
   cd dentist-portal
   npm run dev
   ```

## Ports

- Backend: `3001`
- Admin App: `3010`
- Dentist Portal: `5173` (default Vite port)
- Main Website: `5173` or `3000` (if different)

Make sure all ports are available and not in use by other applications.

