# Fix: "No token is provided" Error in Admin App

## Problem
When trying to fetch appointments, patients, or doctors in the admin app, you get:
- "No token is provided" error
- API calls fail with 401 Unauthorized

## Root Cause
The admin app needs to send an API key to authenticate with the backend, but:
1. `admin-app/.env` file was missing
2. `VITE_ADMIN_API_KEY` was not set
3. Backend `ADMIN_API_KEYS` might not be configured

## Solution Applied

### ✅ Created `admin-app/.env` file
Added the following:
```env
VITE_BACKEND_URL=http://localhost:3001/api
VITE_ADMIN_API_KEY=admin-secret-key-2024
```

### ✅ Updated `backend/.env`
Added/verified:
```env
ADMIN_API_KEYS=admin-secret-key-2024
```

## How It Works

1. **Admin App** reads `VITE_ADMIN_API_KEY` from `.env`
2. **Admin App** sends this key in `x-admin-api-key` header with every API request
3. **Backend** checks if the key matches any key in `ADMIN_API_KEYS`
4. If match found, backend grants admin access

## Next Steps

### 1. Restart Admin App
After creating/updating `.env` file, restart the admin app:
```bash
cd admin-app
# Stop the current process (Ctrl+C)
npm run dev
```

### 2. Verify Backend Has API Key
Check `backend/.env` has:
```env
ADMIN_API_KEYS=admin-secret-key-2024
```

If you changed the key, make sure both files match!

### 3. Test the Connection
1. Open admin app
2. Login with admin email
3. Try accessing:
   - Appointments page
   - Patients page
   - Doctors page

All should now work without "No token" errors!

## Custom API Key

If you want to use a different API key:

1. **Generate a secure key:**
   ```bash
   # On Linux/Mac
   openssl rand -hex 32
   
   # On Windows PowerShell
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
   ```

2. **Update both files:**
   - `admin-app/.env`: `VITE_ADMIN_API_KEY=your_new_key`
   - `backend/.env`: `ADMIN_API_KEYS=your_new_key`

3. **Restart both:**
   - Backend server
   - Admin app

## Security Note

⚠️ **For Production:**
- Use a strong, randomly generated API key
- Don't commit `.env` files to git
- Use environment variables in your hosting platform
- Consider using different keys for different environments

## Troubleshooting

### Still Getting "No token" Error?

1. **Check .env file exists:**
   ```bash
   # Should see the file
   ls admin-app/.env  # Mac/Linux
   dir admin-app\.env  # Windows
   ```

2. **Check API key is set:**
   ```bash
   # Should show VITE_ADMIN_API_KEY
   cat admin-app/.env  # Mac/Linux
   type admin-app\.env  # Windows
   ```

3. **Restart admin app:**
   - Environment variables are only loaded on startup
   - Must restart after changing `.env`

4. **Check backend has matching key:**
   ```bash
   # Should show ADMIN_API_KEYS
   cat backend/.env | grep ADMIN_API_KEYS
   ```

5. **Check browser console:**
   - Open DevTools (F12)
   - Check Network tab
   - Look for `x-admin-api-key` header in requests
   - Should see the API key value

### API Key Mismatch

If keys don't match:
- Backend will reject the request
- You'll get 401 Unauthorized
- Make sure both files have the **exact same** key

### Backend Not Reading .env

If backend doesn't pick up changes:
1. Restart backend server
2. Check `.env` file is in `backend` folder (not `backend/src`)
3. Check for typos in variable name: `ADMIN_API_KEYS` (not `ADMIN_API_KEY`)


