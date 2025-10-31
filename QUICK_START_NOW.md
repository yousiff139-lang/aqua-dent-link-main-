# 🚀 Quick Start Guide - Get Running in 5 Minutes

## Prerequisites
- Node.js installed
- Supabase account with project created
- Git repository cloned

## Step-by-Step Setup

### 1️⃣ Apply Database Migration (2 minutes) - CRITICAL

**This is the ONLY thing blocking your system!**

1. Open: https://supabase.com/dashboard/project/ypbklvrerxikktkbswad/sql/new
2. Open file: `supabase/migrations/20251027140000_fix_schema_cache_appointments.sql`
3. Copy ALL content (Ctrl+A, Ctrl+C)
4. Paste into Supabase SQL Editor (Ctrl+V)
5. Click **RUN** button
6. Wait for success messages

**Expected output:**
```
✅ Appointments table successfully created/recreated
✅ Table has 26 columns
✅ Table has 9 RLS policies
🎉 Migration completed successfully!
```

### 2️⃣ Get Supabase Service Role Key (1 minute)

1. Go to: https://supabase.com/dashboard/project/ypbklvrerxikktkbswad/settings/api
2. Copy the **service_role** key (NOT anon key)
3. Open `backend/.env`
4. Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your key

### 3️⃣ Install Dependencies (1 minute)

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

### 4️⃣ Start Backend Server (30 seconds)

```bash
cd backend
npm run dev
```

**Expected output:**
```
Server running on http://localhost:3000
Connected to Supabase
```

Keep this terminal open!

### 5️⃣ Start Frontend (30 seconds)

Open a NEW terminal:

```bash
npm run dev
```

**Expected output:**
```
VITE ready in XXX ms
Local: http://localhost:5173
```

### 6️⃣ Test the System (1 minute)

1. Open browser: http://localhost:5173
2. Click "Dentists" in navigation
3. Click on any dentist
4. Scroll to booking form
5. Fill out form:
   - Name: Test Patient
   - Email: test@example.com
   - Phone: 555-123-4567
   - Reason: Dental checkup
   - Date: Tomorrow
   - Time: 10:00 AM
   - Payment: Cash
6. Click "Book Appointment"

**Expected result:** ✅ "Appointment booked successfully!"

---

## Verification Checklist

Run this to verify everything is configured:

```bash
node scripts/verify-system-ready.js
```

---

## Quick Test Commands

### Test Backend API
```bash
curl http://localhost:3000/api/health
```

Expected: `{"status":"ok"}`

### Test Database Connection
Open Supabase SQL Editor and run:
```sql
SELECT COUNT(*) FROM appointments;
```

Expected: Returns a number (0 or more)

---

## Common Issues

### Issue: "Failed to load appointments"
**Fix**: Apply database migration (Step 1)

### Issue: Backend won't start
**Fix**: 
1. Check `backend/.env` has service role key
2. Run `cd backend && npm install`

### Issue: CORS error
**Fix**: Verify backend is running on port 3000

### Issue: "Table does not exist"
**Fix**: Apply database migration (Step 1)

---

## What's Next?

After successful setup:

1. **Create Admin Account**
   - Sign up with: karrarmayaly@gmail.com
   - Access admin dashboard: http://localhost:5173/admin

2. **Test Dentist Portal**
   - Login with dentist account
   - Access: http://localhost:5173/dentist-portal

3. **Test Patient Dashboard**
   - Sign up as patient
   - Book appointment
   - View in dashboard: http://localhost:5173/dashboard

---

## Production Deployment

See `PRODUCTION_SETUP_CHECKLIST.md` for complete deployment guide.

---

## Support

If you encounter issues:
1. Check browser console (F12)
2. Check backend terminal for errors
3. Verify Supabase logs
4. Review `PRODUCTION_SETUP_CHECKLIST.md`

---

**Total Setup Time: ~5 minutes**

**Status After Setup:**
- ✅ Database configured
- ✅ Backend API running
- ✅ Frontend running
- ✅ Booking system working
- ✅ Admin dashboard accessible
- ✅ Dentist portal accessible
