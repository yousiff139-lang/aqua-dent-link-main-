# Production Readiness Checklist for Dental Care Connect

## 🚨 Critical Issues (Must Fix Before Production)

### 1. Backend Not Running
**Issue**: The backend API server needs to be started for the booking system to work.

**Fix**:
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

**Verify**: Backend should be running on `http://localhost:3000`

### 2. Environment Variables Missing
**Issue**: Backend `.env` file needs proper configuration.

**Required Variables**:
```env
# Backend .env
SUPABASE_URL=https://ypbklvrerxikktkbswad.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=<get-from-supabase-dashboard>
CORS_ORIGIN=http://localhost:5174,http://localhost:5173
JWT_SECRET=<generate-random-secret>
STRIPE_SECRET_KEY=<your-stripe-key>
STRIPE_WEBHOOK_SECRET=<your-webhook-secret>
```

**Action**: Copy from frontend `.env` and add missing keys from Supabase Dashboard → Settings → API

### 3. Database Migrations Not Applied
**Issue**: Latest schema changes may not be in your database.

**Fix**:
```bash
# Apply all migrations
cd supabase
supabase db push

# Or apply specific migration
supabase db push --file migrations/20251027000000_fix_appointments_table.sql
```

**Verify**: Check Supabase Dashboard → Database → Tables for `appointments` and `dentists` tables

### 4. Admin Role Not Granted
**Issue**: Your email (karrarmayaly@gmail.com) may not have admin role yet.

**Fix**: Run this SQL in Supabase SQL Editor:
```sql
-- Grant admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'karrarmayaly@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify
SELECT u.email, ur.role
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'karrarmayaly@gmail.com';
```

## ⚠️ High Priority Issues

### 5. Dentist Data Missing
**Issue**: No dentists in database for users to book with.

**Fix**: Run this SQL to add sample dentists:
```sql
-- Insert sample dentists (will create in next step)
```

### 6. Backend API Routes Not Tested
**Issue**: Appointment booking endpoints may not be working.

**Test**:
```bash
# Test health endpoint
curl http://localhost:3000/health

# Test appointments endpoint (requires auth)
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "patient_name": "Test Patient",
    "patient_email": "test@example.com",
    "patient_phone": "1234567890",
    "dentist_email": "dentist@example.com",
    "appointment_date": "2025-11-01",
    "appointment_time": "10:00",
    "payment_method": "cash"
  }'
```

### 7. CORS Configuration
**Issue**: Frontend may be blocked by CORS if backend CORS_ORIGIN is wrong.

**Fix**: Ensure backend `.env` has:
```env
CORS_ORIGIN=http://localhost:5174,http://localhost:5173,http://localhost:8080
```

## 📋 Medium Priority Issues

### 8. Error Handling in Frontend
**Issue**: Some components may not handle API errors gracefully.

**Recommendation**: Add error boundaries and better error messages.

### 9. Loading States
**Issue**: Users may not see loading indicators during API calls.

**Recommendation**: Ensure all async operations show loading spinners.

### 10. Stripe Integration
**Issue**: Payment processing may not be configured.

**Action**: 
- Get Stripe test keys from https://dashboard.stripe.com/test/apikeys
- Add to backend `.env`
- Test payment flow

## ✅ Working Features

1. ✅ Authentication (Sign up/Sign in)
2. ✅ Admin email detection
3. ✅ Database schema (appointments, dentists, user_roles)
4. ✅ RLS policies
5. ✅ Admin dashboard UI
6. ✅ Dentist profiles
7. ✅ Booking form UI
8. ✅ Navbar with role-based navigation

## 🔧 Quick Start Guide

### Step 1: Start Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### Step 2: Apply Migrations
```bash
cd supabase
supabase db push
```

### Step 3: Grant Admin Role
Run SQL in Supabase Dashboard (see #4 above)

### Step 4: Add Sample Dentists
Run SQL to insert dentists (see #5 above)

### Step 5: Test Booking Flow
1. Go to http://localhost:5174
2. Sign in as patient
3. Browse dentists
4. Try booking an appointment
5. Check if appointment appears in database

### Step 6: Test Admin Dashboard
1. Sign in as karrarmayaly@gmail.com
2. Navigate to /admin
3. Verify you can see dentists and appointments

## 🧪 Testing Checklist

- [ ] Backend server starts without errors
- [ ] Frontend connects to backend API
- [ ] User can sign up and sign in
- [ ] Admin user redirects to /admin
- [ ] Regular user redirects to /dashboard
- [ ] Dentists list loads from database
- [ ] Booking form submits successfully
- [ ] Appointment appears in database
- [ ] Admin can view all appointments
- [ ] Dentist can view their appointments
- [ ] RLS policies prevent unauthorized access

## 📚 Documentation Links

- [Backend API Documentation](backend/README.md)
- [Database Schema](supabase/migrations/)
- [Admin Setup Guide](DENTIST_DASHBOARD_SETUP.md)
- [Troubleshooting](TROUBLESHOOTING_APPOINTMENTS.md)

## 🆘 Common Errors & Solutions

### Error: "Failed to load appointments"
**Cause**: Backend not running or wrong API URL
**Fix**: Start backend, check VITE_API_URL in frontend .env

### Error: "Access Denied" on /admin
**Cause**: User doesn't have admin role
**Fix**: Run SQL to grant admin role (see #4)

### Error: "Dentist not found"
**Cause**: No dentists in database
**Fix**: Insert sample dentists (see #5)

### Error: "CORS policy blocked"
**Cause**: Backend CORS_ORIGIN doesn't include frontend URL
**Fix**: Update backend .env CORS_ORIGIN

### Error: "Table 'appointments' does not exist"
**Cause**: Migrations not applied
**Fix**: Run `supabase db push`

## 📞 Next Steps

1. **Immediate**: Fix critical issues #1-4
2. **Today**: Test booking flow end-to-end
3. **This Week**: Add sample data and test all features
4. **Before Production**: Security audit, performance testing, error monitoring

---

**Last Updated**: October 27, 2025
**Status**: 🟡 Development - Not Production Ready
**Blockers**: Backend not running, migrations not applied, admin role not granted
