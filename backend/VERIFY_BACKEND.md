# Backend Verification Guide

## 🔍 Backend System Check

### 1. Environment Variables Setup

Create `backend/.env` file with these values:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_PREFIX=/api

# Supabase Configuration (REQUIRED)
SUPABASE_URL=https://ypbklvrerxikktkbswad.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwYmtsdnJlcnhpa2t0a2Jzd2FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDYwMTUsImV4cCI6MjA3NTY4MjAxNX0.e8Gt-zzSlsWN208RJ-FUMLn-L9lkWNFsVEkqCfNGJJ8
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# CORS Configuration
CORS_ORIGIN=http://localhost:5174,http://localhost:5173,http://localhost:8080

# Logging
LOG_LEVEL=info

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-jwt-secret-change-in-production

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_SUCCESS_URL=http://localhost:5174/booking-confirmation?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:5174/booking-cancelled

# Payment Configuration
DEFAULT_APPOINTMENT_AMOUNT=5000
PAYMENT_CURRENCY=usd
```

### 2. Get Service Role Key

1. Go to: https://supabase.com/dashboard/project/ypbklvrerxikktkbswad/settings/api
2. Find "Service Role Key" (secret)
3. Copy and paste into `SUPABASE_SERVICE_ROLE_KEY`

### 3. Start Backend Server

```bash
cd backend
npm install
npm run dev
```

Expected output:
```
🚀 Server started successfully
  port: 3000
  environment: development
  apiPrefix: /api
```

### 4. Test API Endpoints

#### Test 1: Health Check
```bash
curl http://localhost:3000/api/health
```

Expected: `{"status":"ok"}`

#### Test 2: Create Appointment (Public)
```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patient_name": "Test Patient",
    "patient_email": "test@example.com",
    "patient_phone": "+1234567890",
    "dentist_email": "dentist@example.com",
    "appointment_date": "2025-11-01",
    "appointment_time": "10:00",
    "symptoms": "Tooth pain",
    "payment_method": "cash"
  }'
```

Expected: `{"success":true,"data":{...}}`

#### Test 3: Get Appointments (Authenticated)
```bash
# First get auth token from Supabase
# Then:
curl http://localhost:3000/api/appointments/patient/test@example.com \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Common Issues & Solutions

#### Issue: "SUPABASE_SERVICE_ROLE_KEY is required"
**Solution**: Add service role key to `.env` file

#### Issue: "CORS error"
**Solution**: Add your frontend URL to `CORS_ORIGIN` in `.env`

#### Issue: "Port 3000 already in use"
**Solution**: Change `PORT=3001` in `.env` or kill process on port 3000

#### Issue: "Cannot find module"
**Solution**: Run `npm install` in backend directory

### 6. Backend API Routes

All routes are prefixed with `/api`:

**Appointments:**
- `POST /api/appointments` - Create appointment (public)
- `GET /api/appointments/dentist/:email` - Get dentist appointments (auth)
- `GET /api/appointments/patient/:email` - Get patient appointments (auth)
- `GET /api/appointments/:id` - Get appointment by ID (auth)
- `PUT /api/appointments/:id` - Update appointment (auth)
- `DELETE /api/appointments/:id` - Cancel appointment (auth)

**Payments:**
- `POST /api/payments/create-checkout-session` - Create Stripe session
- `POST /api/payments/webhook` - Stripe webhook handler

**Dentists:**
- `GET /api/dentists` - Get all dentists (public)
- `GET /api/dentists/:id` - Get dentist by ID (public)
- `POST /api/auth/dentist/login` - Dentist login

**Availability:**
- `GET /api/availability/:dentistId` - Get dentist availability
- `POST /api/availability` - Create availability slot (dentist)
- `DELETE /api/availability/:id` - Delete availability slot (dentist)

### 7. Monitoring & Logs

Backend uses Winston logger. Check logs for:
- Request/response logging
- Error tracking
- Performance metrics

Log levels: `error`, `warn`, `info`, `debug`

### 8. Production Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `JWT_SECRET`
- [ ] Use production Stripe keys
- [ ] Update `CORS_ORIGIN` with production URLs
- [ ] Set up proper logging (e.g., LogRocket, Sentry)
- [ ] Enable rate limiting
- [ ] Set up SSL/TLS
- [ ] Configure database connection pooling
- [ ] Set up monitoring and alerts
- [ ] Test all endpoints with production data
- [ ] Review and test RLS policies
- [ ] Set up automated backups

### 9. Performance Optimization

- Database indexes are created by migration
- Connection pooling configured in Supabase client
- Rate limiting enabled (100 requests per 15 minutes)
- Request logging for monitoring
- Error tracking and retry logic

### 10. Security Checklist

- [ ] Service role key kept secret
- [ ] JWT tokens verified on all protected routes
- [ ] Input validation using Zod schemas
- [ ] SQL injection prevention (Supabase handles this)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Stripe webhook signature verification
- [ ] RLS policies enforced at database level
- [ ] Sensitive data encrypted at rest
- [ ] HTTPS enforced in production
