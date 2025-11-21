# Setup Admin App Environment File

## Quick Fix: Create admin-app/.env File

Your backend already has an API key configured: `admin-key-aquadent-2024-secure`

### Step 1: Create the File

Create a file named `.env` in the `admin-app` folder with this content:

```env
# Backend API Configuration
VITE_BACKEND_URL=http://localhost:3001/api

# Admin API Key (MUST match ADMIN_API_KEYS in backend/.env)
VITE_ADMIN_API_KEY=admin-key-aquadent-2024-secure

# Supabase Configuration (optional)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 2: How to Create (Windows)

**Option A: Using Notepad**
1. Open Notepad
2. Copy the content above
3. Save as: `admin-app\.env` (make sure it's `.env` not `.env.txt`)
   - In Save dialog, change "Save as type" to "All Files (*.*)"
   - Type `.env` as the filename

**Option B: Using PowerShell**
```powershell
cd admin-app
@"
# Backend API Configuration
VITE_BACKEND_URL=http://localhost:3001/api

# Admin API Key (MUST match ADMIN_API_KEYS in backend/.env)
VITE_ADMIN_API_KEY=admin-key-aquadent-2024-secure

# Supabase Configuration (optional)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
"@ | Out-File -FilePath .env -Encoding utf8
```

**Option C: Copy from Example**
```powershell
cd admin-app
Copy-Item .env.example .env
# Then edit .env and update VITE_ADMIN_API_KEY
```

### Step 3: Restart Admin App

After creating the file, **restart the admin app**:
1. Stop the current process (Ctrl+C in the terminal)
2. Start it again:
   ```bash
   cd admin-app
   npm run dev
   ```

### Step 4: Verify It Works

1. Open admin app in browser
2. Login with admin email
3. Try accessing:
   - Appointments page ✅
   - Patients page ✅
   - Doctors page ✅

All should work without "No token" errors!

## Important Notes

⚠️ **The API key must match exactly:**
- Backend: `ADMIN_API_KEYS=admin-key-aquadent-2024-secure`
- Admin App: `VITE_ADMIN_API_KEY=admin-key-aquadent-2024-secure`

⚠️ **Environment variables are only loaded on startup:**
- You MUST restart the admin app after creating/changing `.env`

⚠️ **File location:**
- Must be in `admin-app/.env` (not `admin-app/src/.env`)
- Must be named exactly `.env` (not `.env.txt` or `.env.local`)

## Troubleshooting

### Still Getting "No token" Error?

1. **Check file exists:**
   ```powershell
   Test-Path admin-app\.env
   # Should return: True
   ```

2. **Check file content:**
   ```powershell
   Get-Content admin-app\.env
   # Should show VITE_ADMIN_API_KEY=admin-key-aquadent-2024-secure
   ```

3. **Check browser console:**
   - Open DevTools (F12)
   - Go to Network tab
   - Make a request (e.g., load appointments)
   - Check the request headers
   - Should see: `x-admin-api-key: admin-key-aquadent-2024-secure`

4. **Restart admin app:**
   - Environment variables are cached
   - Must restart to load new values

### API Key Mismatch?

If you changed the backend key, update both:
1. `backend/.env`: `ADMIN_API_KEYS=your_new_key`
2. `admin-app/.env`: `VITE_ADMIN_API_KEY=your_new_key`
3. Restart both backend and admin app


