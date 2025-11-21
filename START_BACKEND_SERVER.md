# How to Start the Backend Server

## Quick Start

The backend server needs to be running on **port 3001** for the admin app and dentist portal to work.

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Install Dependencies (if not already done)
```bash
npm install
```

### Step 3: Create/Check Environment File

Create a `.env` file in the `backend` directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
API_PREFIX=/api

# Supabase Configuration (REQUIRED)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# CORS Configuration
CORS_ORIGIN=http://localhost:8000,http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:3010

# Optional: Admin API Key
ADMIN_API_KEYS=your_admin_api_key_here

# Optional: JWT Secret (for dentist tokens)
JWT_SECRET=your_jwt_secret_here

# Optional: Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_SUCCESS_URL=http://localhost:3000/success
STRIPE_CANCEL_URL=http://localhost:3000/cancel
```

### Step 4: Start the Backend Server

**For Development:**
```bash
npm run dev
```

**For Production:**
```bash
npm run build
npm start
```

### Step 5: Verify Server is Running

Open your browser or use curl:
```bash
curl http://localhost:3001/health
```

You should see:
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

## Troubleshooting

### Error: "Invalid environment variables"
- Make sure your `.env` file exists in the `backend` directory
- Check that `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are set
- These are **REQUIRED** - the server won't start without them

### Error: "Port 3001 already in use"
- Another process is using port 3001
- Find and kill the process:
  ```bash
  # Windows
  netstat -ano | findstr :3001
  taskkill /PID <PID> /F
  
  # Mac/Linux
  lsof -ti:3001 | xargs kill -9
  ```
- Or change the PORT in `.env` to a different port (and update frontend configs)

### Error: "Failed to connect to backend"
- Make sure the backend server is running
- Check that it's running on port 3001 (check the console output)
- Verify the URL in frontend `.env` files matches: `http://localhost:3001/api`

### Server starts but API calls fail
- Check CORS configuration - make sure your frontend URLs are in `CORS_ORIGIN`
- Check Supabase connection - verify your Supabase credentials are correct
- Check browser console for specific error messages

## Expected Console Output

When the server starts successfully, you should see:
```
🚀 Server started successfully
  port: 3001
  environment: development
  apiPrefix: /api
```

## Testing the API

Once the server is running, test these endpoints:

1. **Health Check:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Admin Appointments:**
   ```bash
   curl http://localhost:3001/api/admin/appointments \
     -H "x-admin-api-key: your_admin_api_key"
   ```

3. **Dentist Login:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/dentist/login \
     -H "Content-Type: application/json" \
     -d '{"email":"dentist@example.com"}'
   ```

## Windows Quick Start Script

Create a file `start-backend.bat` in the backend directory:

```batch
@echo off
echo Starting Backend Server...
cd /d %~dp0
if not exist .env (
    echo ERROR: .env file not found!
    echo Please create .env file with required variables.
    pause
    exit /b 1
)
npm run dev
pause
```

Then double-click `start-backend.bat` to start the server.
