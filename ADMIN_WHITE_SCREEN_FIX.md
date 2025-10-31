# 🔧 Admin Dashboard White Screen - Complete Fix Guide

## Problem
The admin dashboard shows a white/blank screen when accessing http://localhost:3010

## ✅ Solutions Applied

### 1. Added Error Boundary
Created `admin-app/src/components/ErrorBoundary.tsx` to catch and display React errors instead of showing a white screen.

### 2. Improved QueryClient Configuration
Added better default options to prevent hanging queries.

### 3. Created Diagnostic Script
Run `.\fix-admin-white-screen.ps1` to automatically fix common issues.

---

## 🚀 Quick Fix (Try These in Order)

### Fix 1: Clear Cache and Restart

```powershell
# Stop the admin app if running (Ctrl+C)

# Clear cache
cd admin-app
Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

# Restart
npm run dev
```

### Fix 2: Reinstall Dependencies

```powershell
cd admin-app
Remove-Item -Recurse -Force node_modules
npm install
npm run dev
```

### Fix 3: Check Environment Variables

**File:** `admin-app/.env`

Ensure it contains:
```env
VITE_SUPABASE_URL=https://ypbklvrerxikktkbswad.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwYmtsdnJlcnhpa2t0a2Jzd2FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDYwMTUsImV4cCI6MjA3NTY4MjAxNX0.e8Gt-zzSlsWN208RJ-FUMLn-L9lkWNFsVEkqCfNGJJ8
```

### Fix 4: Check Browser Console

1. Open http://localhost:3010
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Look for error messages (red text)
5. Share the error message for specific help

---

## 🔍 Diagnostic Steps

### Step 1: Verify Admin App is Running

```powershell
# Check if port 3010 is in use
netstat -ano | findstr :3010
```

**Expected:** Should show a process listening on port 3010

**If not running:**
```powershell
cd admin-app
npm run dev
```

### Step 2: Check for Build Errors

When you run `npm run dev`, look for:

✅ **Good Output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3010/
➜  Network: use --host to expose
```

❌ **Bad Output (Errors):**
```
Error: Cannot find module...
SyntaxError: ...
Failed to resolve...
```

### Step 3: Test Direct Access

Try accessing different routes:
- http://localhost:3010/login
- http://localhost:3010/dashboard

If `/login` works but `/dashboard` shows white screen:
- Issue is with authentication or protected routes
- Check browser console for errors

### Step 4: Check Network Tab

1. Open http://localhost:3010
2. Press **F12** → **Network** tab
3. Reload page
4. Look for failed requests (red status codes)

Common issues:
- **Failed to fetch** → Backend not running
- **CORS error** → Backend CORS misconfigured
- **404 errors** → Missing files or routes

---

## 🐛 Common Causes & Fixes

### Cause 1: Node Modules Corruption

**Symptoms:**
- White screen
- Console shows "Cannot find module" errors

**Fix:**
```powershell
cd admin-app
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
npm run dev
```

### Cause 2: Vite Cache Issues

**Symptoms:**
- White screen after code changes
- Old code still running

**Fix:**
```powershell
cd admin-app
Remove-Item -Recurse -Force node_modules/.vite
npm run dev
```

### Cause 3: Port Already in Use

**Symptoms:**
- Error: "Port 3010 is already in use"

**Fix:**
```powershell
# Find process using port 3010
netstat -ano | findstr :3010

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use a different port
cd admin-app
npm run dev -- --port 3011
```

### Cause 4: Missing Environment Variables

**Symptoms:**
- White screen
- Console shows "undefined" errors for Supabase

**Fix:**
Create `admin-app/.env`:
```env
VITE_SUPABASE_URL=https://ypbklvrerxikktkbswad.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwYmtsdnJlcnhpa2t0a2Jzd2FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDYwMTUsImV4cCI6MjA3NTY4MjAxNX0.e8Gt-zzSlsWN208RJ-FUMLn-L9lkWNFsVEkqCfNGJJ8
```

### Cause 5: React Component Error

**Symptoms:**
- White screen
- Console shows React error

**Fix:**
With the new ErrorBoundary, you should now see a detailed error page instead of white screen. The error page will show:
- Error message
- Stack trace
- Troubleshooting tips

### Cause 6: Supabase Connection Issue

**Symptoms:**
- White screen
- Console shows "Failed to fetch" or network errors

**Fix:**
1. Check Supabase project is running: https://supabase.com/dashboard
2. Verify VITE_SUPABASE_URL in `.env`
3. Test connection:
```powershell
curl https://ypbklvrerxikktkbswad.supabase.co/rest/v1/
```

---

## 🧪 Testing After Fix

### Test 1: Login Page Loads
```
1. Go to http://localhost:3010/login
2. Should see login form
3. No white screen
```

### Test 2: Can Login
```
1. Enter admin email: karrarmayaly@gmail.com
2. Enter any password
3. Click Login
4. Should redirect to dashboard
```

### Test 3: Dashboard Loads
```
1. After login, should see dashboard
2. Sidebar visible
3. Content loads
4. No white screen
```

### Test 4: Navigation Works
```
1. Click "Appointments" in sidebar
2. Page should load
3. Click "Patients"
4. Page should load
```

---

## 📋 Automated Fix Script

Run this PowerShell script to automatically fix common issues:

```powershell
.\fix-admin-white-screen.ps1
```

This script will:
1. Check if dependencies are installed
2. Verify environment variables
3. Clear cache
4. Restart the dev server

---

## 🔧 Manual Debugging

If automated fixes don't work, follow these steps:

### 1. Check if Admin App Starts

```powershell
cd admin-app
npm run dev
```

**Look for:**
- ✅ "ready in xxx ms" → Good
- ❌ Error messages → Note the error

### 2. Open Browser Console

1. Open http://localhost:3010
2. Press **F12**
3. Go to **Console** tab
4. Look for errors

**Common errors:**

**Error:** `Failed to fetch`
**Fix:** Backend not running. Start backend:
```powershell
cd backend
npm run dev
```

**Error:** `Cannot read property 'xxx' of undefined`
**Fix:** Missing data or API response issue. Check backend logs.

**Error:** `Module not found`
**Fix:** Missing dependency:
```powershell
cd admin-app
npm install
```

### 3. Check Network Requests

1. **F12** → **Network** tab
2. Reload page
3. Look for failed requests (red)

**If you see failed requests:**
- Check the URL being called
- Verify backend is running
- Check CORS configuration

### 4. Test Backend Connection

```powershell
# Test backend health
curl http://localhost:3000/health

# Should return:
# {"status":"healthy",...}
```

---

## 🆘 Still Not Working?

### Collect Diagnostic Information

1. **Browser Console Errors:**
   - Press F12 → Console
   - Copy all red error messages

2. **Network Errors:**
   - Press F12 → Network
   - Screenshot failed requests

3. **Terminal Output:**
   - Copy the output from `npm run dev`

4. **Environment Check:**
```powershell
# Check Node version
node --version  # Should be 18.x or higher

# Check npm version
npm --version   # Should be 9.x or higher

# Check if port is available
netstat -ano | findstr :3010
```

### Nuclear Option (Complete Reset)

If nothing works, try a complete reset:

```powershell
# 1. Stop all running processes (Ctrl+C in all terminals)

# 2. Delete all node_modules
Remove-Item -Recurse -Force admin-app/node_modules
Remove-Item -Recurse -Force backend/node_modules
Remove-Item -Recurse -Force node_modules

# 3. Delete all package-lock files
Remove-Item admin-app/package-lock.json
Remove-Item backend/package-lock.json
Remove-Item package-lock.json

# 4. Clear npm cache
npm cache clean --force

# 5. Reinstall everything
npm install
cd backend
npm install
cd ../admin-app
npm install
cd ..

# 6. Start backend
cd backend
npm run dev
# (Open new terminal)

# 7. Start admin
cd admin-app
npm run dev
```

---

## ✅ Success Checklist

After applying fixes, verify:

- [ ] Admin app starts without errors
- [ ] http://localhost:3010/login loads
- [ ] Can see login form (not white screen)
- [ ] Can login with admin email
- [ ] Dashboard loads after login
- [ ] Sidebar is visible
- [ ] Can navigate between pages
- [ ] No errors in browser console

---

## 📞 Additional Help

If you're still seeing a white screen:

1. **Check this file:** `ADMIN_WHITE_SCREEN_FIX.md`
2. **Run diagnostic:** `.\fix-admin-white-screen.ps1`
3. **Check browser console** (F12) for specific errors
4. **Verify backend is running** on port 3000
5. **Check environment variables** in `admin-app/.env`

**With the new ErrorBoundary component, you should now see a detailed error page instead of a white screen, making it much easier to diagnose the issue!**

---

**Last Updated:** October 27, 2025  
**Status:** Error Boundary Added ✅
