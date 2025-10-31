# 🚀 Quick Setup Guide - Get Running in 10 Minutes

## Prerequisites
- Node.js 18+ installed
- Supabase account with project created
- Terminal/Command Prompt access

---

## Step 1: Configure Backend Environment (2 minutes)

### Get Your Supabase Service Role Key

1. Go to: https://supabase.com/dashboard/project/ypbklvrerxikktkbswad/settings/api
2. Find the **"service_role"** key (NOT the anon key)
3. Click "Copy" button

### Update Backend .env File

Open `backend/.env` and replace this line:
```env
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
```

With your actual key:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwYmtsdnJlcnhpa2t0a2Jzd2FkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDEwNjAxNSwiZXhwIjoyMDc1NjgyMDE1fQ.YOUR_ACTUAL_KEY_HERE
```

⚠️ **Important**: Keep this key secret! Never commit it to git.

---

## Step 2: Apply Database Migration (2 minutes)

### Option A: Via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/ypbklvrerxikktkbswad/sql/new
2. Open file: `supabase/migrations/20251027140000_fix_schema_cache_appointments.sql`
3. Copy **entire content** (Ctrl+A, Ctrl+C)
4. Paste into SQL Editor
5. Click **"Run"** button (or press Ctrl+Enter)
6. Wait for success messages

**Expected Output:**
```
NOTICE: ✅ Appointments table successfully created/recreated
NOTICE: ✅ Table has 26 columns
NOTICE: ✅ Table has 9 RLS policies
NOTICE: 🎉 Migration completed successfully!
```

### Option B: Via Supabase CLI

```bash
cd supabase
supabase db push
```

---

## Step 3: Install Dependencies (2 minutes)

### Install Frontend Dependencies
```bash
npm install
```

### Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

---

## Step 4: Start the Application (1 minute)

### Terminal 1: Start Backend
```bash
cd backend
npm run dev
```

**Expected Output:**
```
🚀 Server started successfully
  port: 3000
  environment: development
  apiPrefix: /api
```

### Terminal 2: Start Frontend
```bash
npm run dev
```

**Expected Output:**
```
VITE v5.x.x ready in xxx ms
➜  Local:   http://localhost:5174/
```

---

## Step 5: Test the System (3 minutes)

### Test 1: Health Check
Open browser or run:
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-27T...",
  "uptime": 123.456,
  "checks": {
    "database": "ok"
  }
}
```

### Test 2: View Dentists
1. Open: http://localhost:5174/dentists
2. Verify dentist cards load with images
3. Click "View Profile" on any dentist

### Test 3: Book Appointment
1. On dentist profile page, scroll to booking form
2. Fill out form:
   - Name: Test User
   - Email: test@example.com
   - Phone: +1 555-123-4567
   - Reason: Routine checkup
   - Date: Tomorrow
   - Time: 10:00 AM
   - Payment: Cash
3. Click "Book Appointment"
4. Verify confirmation displays with booking reference

### Test 4: View Dashboard
1. Sign in (or sign up) at: http://localhost:5174/auth
2. Navigate to: http://localhost:5174/dashboard
3. Verify your appointment appears in the list

---

## ✅ Success Checklist

After completing all steps, verify:

- [ ] Backend server running on port 3000
- [ ] Frontend running on port 5174
- [ ] Health check returns "healthy"
- [ ] Dentists page loads with images
- [ ] Booking form accepts submissions
- [ ] Confirmation displays after booking
- [ ] Dashboard shows appointments

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error**: "SUPABASE_SERVICE_ROLE_KEY is required"
**Solution**: Complete Step 1 - configure the service role key

**Error**: "Port 3000 already in use"
**Solution**: 
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Frontend Won't Start

**Error**: "Port 5174 already in use"
**Solution**: Kill the process or use a different port:
```bash
npm run dev -- --port 5175
```

### Database Errors

**Error**: "relation 'appointments' does not exist"
**Solution**: Complete Step 2 - apply the database migration

**Error**: "permission denied for table appointments"
**Solution**: Verify RLS policies were created (check migration output)

### Booking Form Errors

**Error**: "Failed to create appointment"
**Solution**: 
1. Check backend logs for detailed error
2. Verify migration was applied successfully
3. Check browser console for frontend errors

**Error**: "Slot unavailable"
**Solution**: This is expected if the time slot is already booked. Select a different time.

---

## 🎯 What's Next?

### Optional: Configure Stripe (for card payments)

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy your test keys
3. Update `backend/.env`:
```env
STRIPE_SECRET_KEY=sk_test_51ABC...your_key
STRIPE_WEBHOOK_SECRET=whsec_...your_secret
```
4. Restart backend server

### Optional: Set Up Admin Dashboard

1. Sign up with: karrarmayaly@gmail.com
2. Verify email
3. Navigate to: http://localhost:5174/admin
4. Manage all appointments and dentists

### Optional: Set Up Dentist Portal

1. Run SQL to grant dentist role:
```sql
-- In Supabase SQL Editor
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'dentist'
FROM auth.users
WHERE email = 'your-dentist-email@example.com';
```
2. Sign in with dentist account
3. Navigate to: http://localhost:5174/dentist-portal

---

## 📚 Additional Resources

- **Full Documentation**: See `PRODUCTION_READINESS_REPORT.md`
- **API Documentation**: See `backend/README.md`
- **Troubleshooting**: See `docs/TROUBLESHOOTING_GUIDE.md`
- **Deployment Guide**: See `PRODUCTION_DEPLOYMENT_GUIDE.md`

---

## 🆘 Need Help?

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Review backend logs in terminal
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly
5. Ensure database migration was applied successfully

---

**Estimated Setup Time**: 10 minutes
**Difficulty**: Easy
**Status**: Ready to use after configuration

Good luck! 🚀
