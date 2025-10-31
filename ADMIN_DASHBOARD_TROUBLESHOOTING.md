# 🔧 Admin Dashboard Troubleshooting Guide

**Issue:** Admin page not loading  
**Current Status:** Server is running  
**Date:** October 27, 2025

---

## ✅ Current Server Status

### Active Server
- **Port:** 3011 (auto-switched from 3010)
- **Status:** ✅ Running
- **URL:** http://localhost:3011
- **HTTP Response:** 200 OK
- **Vite:** v5.4.19

### Server Output
```
VITE v5.4.19  ready in 374 ms
➜  Local:   http://localhost:3011/
➜  Network: use --host to expose
```

---

## 🔍 Diagnostic Checklist

### Step 1: Verify Server is Running
```bash
curl http://localhost:3011
```
**Expected:** HTML response with status 200  
**Status:** ✅ PASSING

### Step 2: Check Badge Component
```bash
Test-Path "admin-app/src/components/ui/badge.tsx"
```
**Expected:** True  
**Status:** ✅ PASSING

### Step 3: Common Issues

#### Issue A: Wrong URL
**Problem:** Trying to access http://localhost:3010 (old port)  
**Solution:** Use http://localhost:3011 (current port)

#### Issue B: Browser Cache
**Problem:** Browser is caching old broken version  
**Solution:**
1. Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Clear cache:
   - Chrome: `Ctrl + Shift + Delete`
   - Edge: `Ctrl + Shift + Delete`
3. Try incognito/private mode

#### Issue C: JavaScript Errors
**Problem:** Runtime errors in browser console  
**Solution:**
1. Open browser DevTools: `F12`
2. Check Console tab for errors
3. Check Network tab for failed requests

#### Issue D: Authentication Redirect
**Problem:** App immediately redirects to login  
**Expected:** This is normal behavior - admin dashboard requires login

---

## 🎯 Access Instructions

### Option 1: Direct Browser Access
1. Open your browser
2. Navigate to: **http://localhost:3011**
3. You should see the **Login page**

### Option 2: Use Preview Button
1. Look for "Admin Dashboard (Fixed)" preview button in your IDE
2. Click to open preview browser

### Expected First Screen
You should see:
- 🔒 **Lock icon**
- **"Dental Admin Portal"** title
- **Email input field**
- **"Access Portal"** button

### Test Login
Use one of these admin emails:
- `admin@dentalcare.com`
- `manager@dentalcare.com`
- `staff@dentalcare.com`

---

## 🐛 If Still Not Loading

### Check 1: Browser Console Errors

**Open DevTools (F12) and check for:**

1. **Network Errors**
   - Failed to fetch scripts
   - CORS errors
   - 404 errors

2. **JavaScript Errors**
   - Syntax errors
   - Import errors
   - Runtime errors

3. **React Errors**
   - Component render errors
   - Hook errors

### Check 2: Server Terminal Errors

Look for these patterns in terminal output:

**❌ Bad:**
```
Internal server error
Failed to resolve import
Plugin: vite:import-analysis
```

**✅ Good:**
```
VITE v5.4.19  ready
➜  Local:   http://localhost:3011/
```

### Check 3: Component Issues

Verify these files exist:
```bash
admin-app/src/components/ui/badge.tsx ✅
admin-app/src/components/ui/button.tsx
admin-app/src/components/ui/card.tsx
admin-app/src/components/ui/input.tsx
admin-app/src/components/ui/label.tsx
```

---

## 🔄 Fresh Restart Procedure

If nothing works, try a complete restart:

### Step 1: Stop All Servers
1. Find terminals running admin app
2. Press `Ctrl + C` to stop each

### Step 2: Clear Caches
```bash
cd admin-app
Remove-Item -Recurse -Force node_modules\.vite
Remove-Item -Recurse -Force .vite
Remove-Item -Recurse -Force dist
```

### Step 3: Restart Clean
```bash
npm run dev
```

### Step 4: Clear Browser
1. Close all admin dashboard tabs
2. Clear browser cache
3. Open fresh tab to http://localhost:3011

---

## 📊 Expected Behavior

### Initial Load
1. **Server starts** → Shows Vite ready message
2. **Browser opens** → Shows login page
3. **Enter email** → Checks against admin list
4. **Success** → Redirects to dashboard

### After Login
You should see:
- **Sidebar** with navigation links
- **Dashboard** page with stats
- **Header** with user info
- **Cards** showing appointments, patients, etc.

---

## 🆘 Debug Mode

### Enable Verbose Logging

**In browser console:**
```javascript
localStorage.setItem('debug', 'true')
```

**Check Auth State:**
```javascript
console.log('Admin email:', localStorage.getItem('admin_email'))
```

**Clear Auth:**
```javascript
localStorage.clear()
location.reload()
```

---

## 📝 Information Needed for Further Help

If still having issues, please provide:

1. **What you see:**
   - Blank white page?
   - Error message?
   - Partial loading?
   - Loading spinner stuck?

2. **Browser console errors:**
   - Open F12 → Console tab
   - Screenshot or copy error messages

3. **Network tab:**
   - Any failed requests?
   - Status codes?

4. **Which URL:**
   - Are you using 3010 or 3011?
   - Preview button or direct browser?

5. **Terminal output:**
   - Any error messages?
   - What does latest output show?

---

## ✅ Quick Verification

Run these commands to verify everything:

```bash
# Check server is running
curl http://localhost:3011

# Check file exists
Test-Path admin-app/src/components/ui/badge.tsx

# Check process
Get-Process | Where-Object {$_.ProcessName -like "*node*"}
```

---

## 🎯 Most Likely Solution

Based on current status, the issue is likely:

### ✅ Server is working (port 3011)
### ⚠️ You might be accessing wrong URL (port 3010)

**Solution:**
1. Open browser
2. Navigate to: **http://localhost:3011** (not 3010!)
3. Hard refresh if needed: `Ctrl + Shift + R`

---

**Last Updated:** October 27, 2025, 11:43 PM  
**Server Status:** ✅ Running on port 3011  
**Component Status:** ✅ Badge component created  
**Expected Result:** Should be working
