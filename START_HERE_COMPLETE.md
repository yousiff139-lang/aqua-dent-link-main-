# 🏥 Dental Care Connect - Complete Setup & Production Guide

## 📖 Table of Contents

1. [System Overview](#system-overview)
2. [Quick Start (5 Minutes)](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [System Verification](#system-verification)
5. [Testing Guide](#testing-guide)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

---

## System Overview

**Dental Care Connect** is a comprehensive dental appointment booking system with three main components:

### 🌐 **User Website** (Port 5174)
- Browse dentist profiles
- Book appointments
- View appointment history
- AI-powered chatbot booking assistant

### 👨‍⚕️ **Dentist Portal** (Port 5173)
- View patient appointments
- Manage availability
- Update appointment status
- Access patient information

### 👑 **Admin Dashboard** (Port 5174/admin)
- Manage all dentists
- View all appointments
- System-wide oversight
- User management

### 🔧 **Backend API** (Port 3000)
- RESTful API for appointments
- Stripe payment processing
- Authentication & authorization
- Real-time updates

---

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase account (already configured)
- 10 minutes of your time

### 1. Get Service Role Key
```bash
# Go to: https://supabase.com/dashboard
# Project: ypbklvrerxikktkbswad
# Settings → API → Copy "service_role" key
```

### 2. Configure Backend
```bash
cd backend
npm install

# Edit backend/.env and replace:
# YOUR_SERVICE_ROLE_KEY_HERE with your actual key
```

### 3. Apply Database Migrations
```bash
cd supabase
supabase db push

# Or manually run these in Supabase SQL Editor:
# - 20251027000000_fix_appointments_table.sql
# - 20251027000003_add_sample_dentists.sql
```

### 4. Grant Admin Role
```sql
-- Run in Supabase SQL Editor
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'karrarmayaly@gmail.com'
ON CONFLICT DO NOTHING;
```

### 5. Start Everything
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
npm run dev

# Terminal 3: Verify System
npm run verify:system
```

### 6. Test
1. Go to http://localhost:5174
2. Sign in as `karrarmayaly@gmail.com`
3. You should see Admin Dashboard with 6 dentists

---

## Detailed Setup

### Step 1: Environment Configuration

#### Frontend (.env)
Already configured with:
```env
VITE_SUPABASE_URL=https://ypbklvrerxikktkbswad.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
VITE_API_URL=http://localhost:3000
```

#### Backend (backend/.env)
**Action Required**: Update `SUPABASE_SERVICE_ROLE_KEY`

```env
SUPABASE_SERVICE_ROLE_KEY=<paste-your-key-here>
```

Get this key from:
1. Supabase Dashboard → Settings → API
2. Copy the "service_role" key (NOT the anon key)
3. Paste into backend/.env

### Step 2: Database Setup

#### Option A: Automatic (Recommended)
```bash
cd supabase
supabase login
supabase link --project-ref ypbklvrerxikktkbswad
supabase db push
```

#### Option B: Manual
1. Go to Supabase Dashboard → SQL Editor
2. Run these migrations in order:
   - `20251027000000_fix_appointments_table.sql`
   - `20251018000001_add_documents_and_dentist_account.sql`
   - `20251027000003_add_sample_dentists.sql`

### Step 3: Grant Admin Access

Run this SQL in Supabase SQL Editor:

```sql
-- Grant admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'karrarmayaly@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create dentist profile for admin (optional)
INSERT INTO public.dentists (id, name, email, specialization, rating)
SELECT id, 'Admin User', email, 'Administration', 5.0
FROM auth.users
WHERE email = 'karrarmayaly@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT u.email, ur.role
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'karrarmayaly@gmail.com';
```

Expected output:
```
email                    | role
-------------------------|-------
karrarmayaly@gmail.com  | admin
```

### Step 4: Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

### Step 5: Start Services

#### Terminal 1: Backend API
```bash
cd backend
npm run dev
```

Expected output:
```
🚀 Server running on http://localhost:3000
✅ Connected to Supabase
```

#### Terminal 2: Frontend
```bash
npm run dev
```

Expected output:
```
VITE v5.x.x ready in XXX ms
➜  Local:   http://localhost:5174/
```

---

## System Verification

### Automated Verification
```bash
npm run verify:system
```

This checks:
- ✅ Environment variables
- ✅ Backend configuration
- ✅ Supabase connection
- ✅ Database tables
- ✅ Sample dentists data
- ✅ Admin users
- ✅ Backend server status

### Manual Verification

#### 1. Check Backend Health
```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok"}`

#### 2. Check Database Tables
```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('appointments', 'dentists', 'user_roles');
```

Expected: 3 rows returned

#### 3. Check Dentists Count
```sql
SELECT COUNT(*) FROM public.dentists;
```

Expected: 6 dentists

#### 4. Check Admin Users
```sql
SELECT u.email, ur.role
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'admin';
```

Expected: At least 1 row with your email

---

## Testing Guide

### Test 1: Admin Access
1. Go to http://localhost:5174
2. Click "Sign In"
3. Sign in with `karrarmayaly@gmail.com`
4. **Expected**: Redirect to `/admin`
5. **Expected**: See "Admin Dashboard" with 6 dentists

### Test 2: View Dentist Profiles
1. Click "Dentists" in navigation
2. **Expected**: See 6 dentist cards
3. Click "View Profile" on any dentist
4. **Expected**: See detailed profile with education, expertise, availability

### Test 3: Book Appointment (as Patient)
1. Sign out from admin
2. Sign up with new email: `patient@test.com`
3. Go to "Dentists" → Select a dentist → "View Profile"
4. Scroll to "Book Your Appointment"
5. Fill form:
   - Name: Test Patient
   - Email: patient@test.com
   - Phone: 1234567890
   - Date: Tomorrow
   - Time: 10:00 AM
   - Payment: Cash
6. Click "Book Appointment"
7. **Expected**: See confirmation message

### Test 4: Verify in Admin Dashboard
1. Sign out and sign in as admin
2. Go to Admin Dashboard
3. Select the dentist you booked with
4. **Expected**: See the appointment you created

### Test 5: Backend API
```bash
# Test appointments endpoint
curl -X GET http://localhost:3000/api/appointments/dentist/sarah.johnson@dentalcare.com
```

Expected: JSON array of appointments

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All migrations applied to production database
- [ ] Environment variables configured for production
- [ ] Stripe keys updated to live keys (not test)
- [ ] CORS_ORIGIN updated with production URLs
- [ ] JWT_SECRET changed to strong random value
- [ ] Email verification enabled in Supabase
- [ ] RLS policies tested and verified
- [ ] Error monitoring configured (Sentry, etc.)
- [ ] Backup strategy in place
- [ ] SSL certificates configured

### Environment Variables for Production

#### Frontend
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_API_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

#### Backend
```env
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CORS_ORIGIN=https://yourdomain.com,https://dentist.yourdomain.com
JWT_SECRET=<strong-random-secret>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Deployment Steps

#### 1. Deploy Backend (Example: Railway/Render)
```bash
cd backend
npm run build
# Deploy dist/ folder
```

#### 2. Deploy Frontend (Example: Vercel/Netlify)
```bash
npm run build
# Deploy dist/ folder
```

#### 3. Configure Stripe Webhooks
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://api.yourdomain.com/api/payments/webhook`
3. Select events: `checkout.session.completed`, `payment_intent.succeeded`
4. Copy webhook secret to backend env

#### 4. Test Production
- Test user signup/signin
- Test appointment booking
- Test payment processing
- Test admin dashboard
- Test dentist portal

---

## Troubleshooting

### Backend Won't Start

**Error**: `Cannot find module`
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

**Error**: `SUPABASE_SERVICE_ROLE_KEY is not defined`
- Check backend/.env has the service role key
- Key should start with `eyJhbGci...`
- Get from Supabase Dashboard → Settings → API

### Frontend Shows Errors

**Error**: "Failed to load dentists"
```bash
# Check backend is running
curl http://localhost:3000/health

# Check CORS
# Ensure backend/.env has:
CORS_ORIGIN=http://localhost:5174,http://localhost:5173
```

**Error**: "Access Denied" on /admin
```sql
-- Grant admin role again
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'karrarmayaly@gmail.com'
ON CONFLICT DO NOTHING;
```

### Database Issues

**Error**: "Table does not exist"
```bash
# Apply migrations
cd supabase
supabase db push
```

**Error**: "No dentists found"
```bash
# Run sample dentists migration
supabase db push --file migrations/20251027000003_add_sample_dentists.sql
```

### Booking Fails

**Error**: "Slot unavailable"
- Check dentist has availability configured
- Check appointment date is in the future
- Check time slot is not already booked

**Error**: "Payment failed"
- Check Stripe keys are correct
- Check Stripe webhook is configured
- Check backend logs for Stripe errors

### Common SQL Queries for Debugging

```sql
-- Check all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check appointments
SELECT * FROM public.appointments ORDER BY created_at DESC LIMIT 5;

-- Check dentists
SELECT id, name, email, specialization FROM public.dentists;

-- Check user roles
SELECT u.email, ur.role 
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id;

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

---

## Additional Resources

- 📚 [Quick Setup Guide](QUICK_SETUP_GUIDE.md)
- ✅ [Production Readiness Checklist](PRODUCTION_READINESS_CHECKLIST.md)
- 👨‍⚕️ [Dentist Dashboard Setup](DENTIST_DASHBOARD_SETUP.md)
- 🐛 [Troubleshooting Appointments](TROUBLESHOOTING_APPOINTMENTS.md)
- 🔧 [Backend API Documentation](backend/README.md)

---

## Support

### Getting Help

1. **Check Documentation**: Review guides above
2. **Run Verification**: `npm run verify:system`
3. **Check Logs**: 
   - Backend: Terminal running `npm run dev`
   - Frontend: Browser console (F12)
   - Database: Supabase Dashboard → Logs
4. **Check Issues**: Review error messages carefully

### Common Commands

```bash
# Verify system
npm run verify:system

# Start backend
cd backend && npm run dev

# Start frontend
npm run dev

# Apply migrations
cd supabase && supabase db push

# Test database
npm run test:db

# Run all tests
npm test
```

---

## System Status

✅ **Authentication**: Working
✅ **Database Schema**: Complete
✅ **Admin Dashboard**: Implemented
✅ **Dentist Profiles**: Complete
✅ **Booking System**: Functional
✅ **Backend API**: Ready
⚠️ **Stripe Payments**: Needs configuration
⚠️ **Email Notifications**: Needs configuration

---

**Last Updated**: October 27, 2025
**Version**: 1.0.0
**Status**: Development Ready

**Next Steps**:
1. Complete Quick Start above
2. Run `npm run verify:system`
3. Test booking flow
4. Configure Stripe (optional)
5. Deploy to production

---

Made with ❤️ for Dental Care Connect
