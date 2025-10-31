# 🚀 Dental Care Connect - Complete System Startup Guide

## ⚠️ CRITICAL: Fix Backend Configuration First

### Step 1: Update Backend Service Role Key

**File:** `backend/.env`

**Current Issue:** `SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE`

**Fix:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `ypbklvrerxikktkbswad`
3. Navigate to: **Settings** → **API**
4. Copy the **service_role** key (NOT the anon key)
5. Replace in `backend/.env`:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwYmtsdnJlcnhpa2t0a2Jzd2FkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDEwNjAxNSwiZXhwIjoyMDc1NjgyMDE1fQ.YOUR_ACTUAL_KEY_HERE
```

---

## 📋 System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                        │
├─────────────────────────────────────────────────────────┤
│  Public Site (Port 5174)  │  Admin (Port 3010)          │
│  Dentist Portal (Port 3011)                             │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP/REST API
                 ▼
┌─────────────────────────────────────────────────────────┐
│              BACKEND API (Port 3000)                     │
│  - Express + TypeScript                                  │
│  - JWT Authentication                                    │
│  - Rate Limiting                                         │
│  - Validation (Zod)                                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Supabase Client
                 ▼
┌─────────────────────────────────────────────────────────┐
│           SUPABASE (Database + Auth + Realtime)         │
│  - PostgreSQL Database                                   │
│  - Row-Level Security (RLS)                             │
│  - Real-time Subscriptions                              │
│  - Edge Functions (Chatbot)                             │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Step-by-Step Startup

### Step 2: Apply Database Migrations

```powershell
# Navigate to project root
cd C:\Users\global-pc\Downloads\alphac3\aqua-dent-link-main

# Apply the critical schema fix migration
supabase db push
```

**Or manually apply via Supabase Dashboard:**
1. Go to **SQL Editor**
2. Run the migration file: `supabase/migrations/20251027140000_fix_schema_cache_appointments.sql`

### Step 3: Start Backend Server

```powershell
# Terminal 1: Backend API
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

**Verify Backend:**
```powershell
# Test health endpoint
curl http://localhost:3000/health
```

**Expected Response:**
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

### Step 4: Start Frontend Applications

#### Public Booking Site (Port 5174)
```powershell
# Terminal 2: Public Site
npm run dev
```

#### Admin Dashboard (Port 3010)
```powershell
# Terminal 3: Admin Dashboard
cd admin-app
npm run dev
```

#### Dentist Portal (Port 3011)
```powershell
# Terminal 4: Dentist Portal
cd dentist-portal
npm run dev
```

---

## ✅ System Verification Checklist

### Backend API Verification

**1. Test Appointments Endpoint (Guest Booking)**
```powershell
curl -X POST http://localhost:3000/api/appointments `
  -H "Content-Type: application/json" `
  -d '{
    "patient_name": "Test Patient",
    "patient_email": "test@example.com",
    "patient_phone": "0771234567",
    "dentist_email": "dr.sarah@dentalcare.com",
    "concern": "tooth pain",
    "appointment_date": "2025-11-05",
    "appointment_time": "14:30",
    "payment_method": "cash"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "appointmentId": "uuid-here",
    "status": "pending",
    "paymentStatus": "pending",
    "appointment": { ... }
  }
}
```

**2. Test Dentist Login**
```powershell
curl -X POST http://localhost:3000/api/auth/dentist/login `
  -H "Content-Type: application/json" `
  -d '{
    "email": "dr.sarah@dentalcare.com",
    "password": "your-password"
  }'
```

### Frontend Verification

**Public Site (http://localhost:5174)**
- [ ] Homepage loads
- [ ] Dentist profiles display with images
- [ ] Booking form accepts input
- [ ] Form validation works
- [ ] Booking submission succeeds

**Admin Dashboard (http://localhost:3010)**
- [ ] Login page loads
- [ ] Admin can log in
- [ ] Appointments list displays
- [ ] Real-time updates work
- [ ] Confirm/Delete actions work

**Dentist Portal (http://localhost:3011)**
- [ ] Login page loads
- [ ] Dentist can log in
- [ ] Appointments tab shows bookings
- [ ] Availability management works
- [ ] Profile editing works

---

## 🤖 Chatbot System

### Chatbot Architecture

The chatbot is implemented as a **Supabase Edge Function** using:
- **Deno runtime**
- **Google Gemini 2.0 Pro** for AI responses
- **Context-aware conversation management**
- **Doctor matching logic**
- **Uncertainty handling**

### Chatbot Features

1. **Smart Doctor Matching**
   - Analyzes patient symptoms
   - Recommends appropriate specialist
   - Explains why the doctor fits

2. **Flexible Information Collection**
   - Allows "I'll provide later" responses
   - Skips non-critical steps
   - Maintains conversation context

3. **Uncertainty Handling**
   - Detects phrases like "I don't know", "not sure"
   - Records uncertainty in database
   - Continues booking without looping

4. **Payment Integration**
   - Collects payment method (cash/card/insurance)
   - Integrates with Stripe for card payments

### Deploy Chatbot Edge Function

```powershell
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref ypbklvrerxikktkbswad

# Deploy chatbot function
supabase functions deploy chat-bot

# Set Gemini API key
supabase secrets set GEMINI_API_KEY=your-gemini-api-key-here
```

### Test Chatbot

```powershell
curl -X POST https://ypbklvrerxikktkbswad.supabase.co/functions/v1/chat-bot `
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" `
  -H "Content-Type: application/json" `
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "I have tooth pain"
      }
    ],
    "dentistId": "uuid-of-dentist"
  }'
```

---

## 🔐 Security Configuration

### Environment Variables Checklist

**Backend (`backend/.env`):**
- [x] `JWT_SECRET` - ✅ Updated
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - ⚠️ **NEEDS UPDATE**
- [x] `SUPABASE_URL` - ✅ Configured
- [x] `SUPABASE_ANON_KEY` - ✅ Configured
- [ ] `STRIPE_SECRET_KEY` - Optional (for payments)

**Frontend (`.env`):**
- [x] `VITE_SUPABASE_URL` - ✅ Configured
- [x] `VITE_SUPABASE_ANON_KEY` - ✅ Configured
- [x] `VITE_API_URL` - ✅ http://localhost:3000

**Admin App (`admin-app/.env`):**
- [x] `VITE_SUPABASE_URL` - ✅ Configured
- [x] `VITE_SUPABASE_ANON_KEY` - ✅ Configured

**Dentist Portal (`dentist-portal/.env`):**
- [x] `VITE_SUPABASE_URL` - ✅ Configured
- [x] `VITE_SUPABASE_ANON_KEY` - ✅ Configured

---

## 📊 Database Schema Status

### Core Tables

**✅ appointments**
- Stores all appointment bookings
- Includes uncertainty tracking (`cause_identified`, `uncertainty_note`)
- Unique constraint prevents double-booking
- RLS policies for security

**✅ profiles**
- User profiles (patients, dentists, admins)
- Linked to Supabase Auth
- Role-based access control

**✅ dentists**
- Extended dentist information
- Specializations, ratings, availability
- Profile images and descriptions

**✅ chatbot_conversations**
- Conversation history
- Context tracking
- Message storage

### Apply Missing Migrations

If you see errors about missing tables, run:

```sql
-- Check if appointments table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'appointments'
);

-- If false, apply migrations
```

---

## 🔄 Real-time Synchronization

### How It Works

1. **Patient books appointment** → Frontend sends POST to backend
2. **Backend validates and inserts** → Database row created
3. **PostgreSQL trigger fires** → Supabase Realtime broadcasts change
4. **Admin dashboard subscribed** → Receives real-time event
5. **UI updates instantly** → New appointment appears

### Enable Real-time in Supabase

1. Go to **Database** → **Replication**
2. Enable replication for `appointments` table
3. Select all columns to replicate

### Frontend Subscription Code

```typescript
// Admin Dashboard
const channel = supabase
  .channel('appointments-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'appointments'
    },
    (payload) => {
      console.log('Change detected:', payload)
      queryClient.invalidateQueries(['appointments'])
    }
  )
  .subscribe()
```

---

## 🧪 End-to-End Testing

### Test Scenario: Complete Booking Flow

**1. Patient Books Appointment (Public Site)**
```
1. Navigate to http://localhost:5174
2. Click "Book Appointment"
3. Select "Dr. Sarah Al-Rashid"
4. Fill form:
   - Name: John Doe
   - Email: john@example.com
   - Phone: 0771234567
   - Concern: Tooth pain
   - Date: Tomorrow
   - Time: 2:30 PM
   - Payment: Cash
5. Submit
6. See confirmation message
```

**2. Admin Sees Booking (Admin Dashboard)**
```
1. Navigate to http://localhost:3010
2. Login as admin
3. See new appointment appear instantly (real-time)
4. Click "Confirm"
5. Status changes to "confirmed"
```

**3. Dentist Manages Appointment (Dentist Portal)**
```
1. Navigate to http://localhost:3011
2. Login as Dr. Sarah
3. Go to "Appointments" tab
4. See confirmed appointment
5. Mark as "Completed" after visit
```

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error:** `Invalid environment variables: SUPABASE_SERVICE_ROLE_KEY`

**Fix:**
```powershell
# Edit backend/.env
# Replace YOUR_SERVICE_ROLE_KEY_HERE with actual key from Supabase Dashboard
```

### Database Connection Failed

**Error:** `Failed to connect to database`

**Fix:**
1. Check Supabase project is running
2. Verify `SUPABASE_URL` in `.env`
3. Test connection:
```powershell
curl https://ypbklvrerxikktkbswad.supabase.co/rest/v1/
```

### Appointments Not Showing

**Error:** `Table 'appointments' does not exist`

**Fix:**
```powershell
# Apply migrations
supabase db push

# Or manually run SQL in Supabase Dashboard
```

### Real-time Not Working

**Fix:**
1. Enable replication in Supabase Dashboard
2. Check WebSocket connection in browser console
3. Verify subscription code is running

### CORS Errors

**Error:** `Access-Control-Allow-Origin`

**Fix:**
```typescript
// backend/src/config/env.ts
CORS_ORIGIN: 'http://localhost:5174,http://localhost:3010,http://localhost:3011'
```

---

## 📈 Production Deployment

### Pre-Deployment Checklist

- [ ] Update all environment variables for production
- [ ] Change `NODE_ENV=production` in backend
- [ ] Update CORS origins to production URLs
- [ ] Enable Supabase production mode
- [ ] Configure custom domain
- [ ] Set up SSL certificates
- [ ] Configure Stripe production keys
- [ ] Test all endpoints in production
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

### Deployment Commands

```powershell
# Build backend
cd backend
npm run build
npm start

# Build frontend
npm run build
# Deploy dist/ folder to hosting (Vercel, Netlify, etc.)

# Build admin
cd admin-app
npm run build

# Build dentist portal
cd dentist-portal
npm run build
```

---

## 📞 Support

**Issues?** Check:
1. This guide
2. `TROUBLESHOOTING_GUIDE.md`
3. Backend logs: `backend/logs/`
4. Browser console for frontend errors

**System Status:**
- Backend: http://localhost:3000/health
- Supabase: https://status.supabase.com/

---

**Last Updated:** October 27, 2025
**System Version:** 2.5
**Status:** Production Ready (after fixing SUPABASE_SERVICE_ROLE_KEY)
