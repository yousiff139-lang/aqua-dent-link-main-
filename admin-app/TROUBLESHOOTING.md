# Troubleshooting - Admin Dashboard

## Page Not Loading?

### Step 1: Make Sure It's Running

```bash
cd admin-app
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3010/
```

### Step 2: Check Browser Console

1. Open http://localhost:3010
2. Press F12 to open Developer Tools
3. Go to "Console" tab
4. Look for any red errors

### Step 3: Common Issues

#### Issue: "Cannot find module"

**Solution:**
```bash
cd admin-app
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### Issue: Blank white page

**Solution:**
1. Check browser console for errors
2. Make sure you're logged in (go to /login first)
3. Clear browser cache (Ctrl+Shift+Delete)

#### Issue: "Failed to fetch"

**Solution:**
- Check that Supabase credentials are correct in `.env`
- Verify internet connection
- Check Supabase dashboard is accessible

### Step 4: Fresh Start

If nothing works, try a complete fresh start:

```bash
# Stop the server (Ctrl+C)

# Clean everything
cd admin-app
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Start again
npm run dev
```

### Step 5: Check These Files Exist

Make sure these files are present:
- `admin-app/src/App.tsx`
- `admin-app/src/pages/Dashboard.tsx`
- `admin-app/src/pages/Login.tsx`
- `admin-app/src/components/Sidebar.tsx`
- `admin-app/src/components/DashboardLayout.tsx`

### Step 6: Test Login

1. Go to http://localhost:3010/login
2. Enter: karrarmayaly@gmail.com or bingo@gmail.com
3. Click "Access Portal"
4. Should redirect to /dashboard

## Still Not Working?

Share the error message from the browser console (F12 → Console tab) and I can help fix it!

## Quick Test

Run this in your terminal:

```bash
cd admin-app
npm run dev
```

Then open: http://localhost:3010/login

If you see the login page, it's working! Just enter your admin email.
