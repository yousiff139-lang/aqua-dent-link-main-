# 🚀 Dental Care Connect - Build & Start Guide

**Based on:** Backend Integration and Chatbot Logic Report  
**Date:** October 27, 2025  
**System:** Production Ready

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [x] **Node.js** v18+ installed (`node --version`)
- [x] **npm** or **pnpm** installed (`npm --version`)
- [x] **Supabase Project** created and configured
- [x] **Git** for version control (optional)

---

## 🔧 Step 1: Environment Setup

### 1.1 Verify Environment Variables

**Frontend (.env):**
```bash
✅ VITE_SUPABASE_URL=https://ypbklvrerxikktkbswad.supabase.co
✅ VITE_SUPABASE_PUBLISHABLE_KEY=[your-anon-key]
✅ VITE_API_URL=http://localhost:3000
⚠️ VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... (Replace with real key)
```

**Backend (backend/.env):**
```bash
✅ SUPABASE_URL=https://ypbklvrerxikktkbswad.supabase.co
✅ SUPABASE_ANON_KEY=[your-anon-key]
⚠️ SUPABASE_SERVICE_ROLE_KEY=[REQUIRED - Get from Supabase Dashboard]
✅ CORS_ORIGIN=http://localhost:5174,http://localhost:5173,http://localhost:3010
✅ PORT=3000
```

### 1.2 Get Missing Keys

**Service Role Key (Required):**
1. Go to: https://supabase.com/dashboard/project/ypbklvrerxikktkbswad
2. Navigate to: **Settings** → **API**
3. Copy: **service_role** key (⚠️ Keep secret!)
4. Update: `backend/.env` → `SUPABASE_SERVICE_ROLE_KEY`

**Stripe Keys (Optional - for payments):**
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy: **Secret key** and **Publishable key**
3. Update both `.env` files

---

## 📦 Step 2: Install Dependencies

### 2.1 Backend Dependencies

```bash
cd backend
npm install
```

**What gets installed:**
- `express` - Web framework
- `@supabase/supabase-js` - Database client
- `zod` - Input validation
- `winston` - Logging
- `stripe` - Payment processing
- `cors` - Cross-origin handling
- `typescript` - Type safety

### 2.2 Frontend (Main App) Dependencies

```bash
cd ..
npm install
```

**What gets installed:**
- `react` + `react-dom` - UI framework
- `@tanstack/react-query` - Data fetching
- `@supabase/supabase-js` - Real-time sync
- `react-router-dom` - Routing
- `shadcn/ui` components - UI library
- `zod` - Form validation

### 2.3 Admin Dashboard Dependencies

```bash
cd admin-app
npm install
```

### 2.4 Dentist Portal Dependencies

```bash
cd ../dentist-portal
npm install
```

---

## 🗄️ Step 3: Database Setup (Supabase)

### 3.1 Verify Tables Exist

Run verification script:
```bash
cd ..
npm run verify:schema
```

**Expected tables:**
- ✅ `appointments`
- ✅ `profiles`
- ✅ `dentists`
- ✅ `chatbot_conversations`
- ✅ `availability_slots`
- ✅ `payments`

### 3.2 Apply Migrations (if needed)

If tables are missing:
```bash
npm run migrate
```

### 3.3 Enable Row-Level Security (RLS)

Go to Supabase Dashboard → **Authentication** → **Policies**

Verify these policies exist on `appointments` table:
- ✅ `patients_view_own` - Patients see their appointments
- ✅ `dentists_view_own` - Dentists see their appointments
- ✅ `admins_view_all` - Admins see everything
- ✅ `allow_guest_bookings` - Allow anonymous bookings
- ✅ `users_update_own` - Users update their appointments

---

## 🏗️ Step 4: Build the System

### 4.1 Build Backend

```bash
cd backend
npm run build
```

**Output:** `backend/dist/` folder with compiled JavaScript

**Expected result:**
```
✓ Compiled successfully
✓ Generated type definitions
✓ Build completed in ~15s
```

### 4.2 Build Frontend (Production)

```bash
cd ..
npm run build
```

**Output:** `dist/` folder with optimized assets

### 4.3 Build Admin Dashboard

```bash
cd admin-app
npm run build
```

### 4.4 Build Dentist Portal

```bash
cd ../dentist-portal
npm run build
```

---

## 🚀 Step 5: Start the System

### 5.1 Start Backend API (Terminal 1)

```bash
cd backend
npm run dev
```

**Expected output:**
```
[INFO] Starting Dental Care Connect API...
[INFO] Environment: development
[INFO] Port: 3000
[INFO] CORS Origins: http://localhost:5174,http://localhost:5173,http://localhost:3010
[INFO] Database: Connected to Supabase
[INFO] ✓ Server running at http://localhost:3000
[INFO] ✓ Health check: http://localhost:3000/health
```

**Verify backend is running:**
```bash
# Open new terminal
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-27T...",
  "uptime": 5.234,
  "checks": {
    "database": "ok"
  }
}
```

### 5.2 Start Public Website (Terminal 2)

```bash
# From project root
npm run dev
```

**Expected output:**
```
VITE v5.4.19  ready in 1234 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

**Access:** http://localhost:5173

### 5.3 Start Admin Dashboard (Terminal 3)

```bash
cd admin-app
npm run dev
```

**Expected output:**
```
➜  Local:   http://localhost:3010/
```

**Access:** http://localhost:3010

### 5.4 Start Dentist Portal (Terminal 4)

```bash
cd dentist-portal
npm run dev
```

**Expected output:**
```
➜  Local:   http://localhost:5174/
```

**Access:** http://localhost:5174

---

## ✅ Step 6: Verify System is Working

### 6.1 Check Backend Health

```bash
curl http://localhost:3000/health
```

### 6.2 Test API Endpoints

**Get dentist appointments:**
```bash
curl http://localhost:3000/api/appointments/dentist/dr.sarah@dentalcare.com \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6.3 Test Real-time Sync

1. Open **Admin Dashboard** (http://localhost:3010)
2. Open **Public Website** (http://localhost:5173)
3. Create a booking on public site
4. Watch it appear instantly on admin dashboard ⚡

### 6.4 Test Chatbot

1. Go to public website
2. Click "Book Appointment" or chatbot icon
3. Type: "I have tooth pain"
4. Chatbot should recommend: **Dr. Sarah Al-Rashid (Endodontist)**

---

## 🎯 Quick Start Commands (All-in-One)

### Option A: Using separate terminals

**Terminal 1 - Backend:**
```bash
cd backend && npm run dev
```

**Terminal 2 - Public Site:**
```bash
npm run dev
```

**Terminal 3 - Admin:**
```bash
cd admin-app && npm run dev
```

**Terminal 4 - Dentist Portal:**
```bash
cd dentist-portal && npm run dev
```

### Option B: Using PowerShell (Windows)

Create a start script `start-all.ps1`:
```powershell
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm run dev"
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd admin-app; npm run dev"
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd dentist-portal; npm run dev"
```

Run:
```bash
.\start-all.ps1
```

---

## 🔍 Troubleshooting

### Issue 1: Backend fails to start

**Error:** `SUPABASE_SERVICE_ROLE_KEY is required`

**Solution:**
1. Get service role key from Supabase Dashboard
2. Update `backend/.env`
3. Restart backend

### Issue 2: CORS errors in browser

**Error:** `Access-Control-Allow-Origin`

**Solution:**
1. Check `backend/.env` → `CORS_ORIGIN` includes your frontend URL
2. Restart backend
3. Clear browser cache

### Issue 3: Real-time not working

**Error:** Appointments not appearing instantly

**Solution:**
1. Check Supabase Dashboard → **Database** → **Replication** is enabled
2. Verify `appointments` table has replication enabled
3. Check browser console for WebSocket errors

### Issue 4: Database connection failed

**Error:** `Database check: error`

**Solution:**
1. Verify `SUPABASE_URL` is correct
2. Check `SUPABASE_SERVICE_ROLE_KEY` is valid
3. Test connection: `npm run verify:schema`

### Issue 5: Port already in use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**

**Option A: Kill process**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

**Option B: Use different port**
Update `backend/.env`:
```
PORT=3001
```

---

## 📊 System Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Frontend Applications (React + Vite)           │
│  ┌────────────┬────────────┬─────────────┐     │
│  │ Public Site│   Admin    │   Dentist   │     │
│  │ :5173      │   :3010    │   :5174     │     │
│  └────────────┴────────────┴─────────────┘     │
└──────────────────────┬──────────────────────────┘
                       │
                       │ REST API + WebSocket
                       ▼
┌─────────────────────────────────────────────────┐
│  Backend API (Express + TypeScript)             │
│  http://localhost:3000                          │
│  ┌───────────────────────────────────────────┐  │
│  │ • JWT Authentication                       │  │
│  │ • Rate Limiting                            │  │
│  │ • Input Validation (Zod)                   │  │
│  │ • Error Handling                           │  │
│  └───────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────┘
                       │
                       │ Supabase Client
                       ▼
┌─────────────────────────────────────────────────┐
│  Supabase PostgreSQL + Realtime                 │
│  https://ypbklvrerxikktkbswad.supabase.co      │
│  ┌───────────────────────────────────────────┐  │
│  │ Tables: appointments, profiles, dentists  │  │
│  │ Auth: JWT + RLS Policies                  │  │
│  │ Realtime: WebSocket subscriptions         │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 🔐 Security Checklist

Before going to production:

- [ ] Replace all test API keys with production keys
- [ ] Update `CORS_ORIGIN` to production domains
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS (SSL certificates)
- [ ] Review RLS policies in Supabase
- [ ] Set up daily database backups
- [ ] Configure rate limiting for production
- [ ] Add monitoring (e.g., Sentry, LogRocket)
- [ ] Test all payment flows end-to-end

---

## 📚 Next Steps

1. **Create test accounts:**
   - Patient account
   - Dentist account
   - Admin account

2. **Populate test data:**
   ```bash
   npm run test:booking
   ```

3. **Test booking flow:**
   ```bash
   npm run test:e2e
   ```

4. **Deploy to production:**
   - See: `PRODUCTION_DEPLOYMENT_GUIDE.md`

---

## 📞 Support & Resources

- **Backend Report:** `DENTAL_CARE_CONNECT_BACKEND_INTEGRATION_CHATBOT_REPORT.md`
- **API Documentation:** Section 6 of report
- **Troubleshooting:** `TROUBLESHOOTING.md`
- **Supabase Docs:** https://supabase.com/docs

---

**System Status:** ✅ Ready to Build and Start

**Estimated Setup Time:** 15-20 minutes

**Last Updated:** October 27, 2025
