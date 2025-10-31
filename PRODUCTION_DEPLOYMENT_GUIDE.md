# 🚀 Production Deployment Guide

## Complete Step-by-Step Deployment for Dental Care Connect

### Prerequisites

- ✅ Migration applied to Supabase
- ✅ All tests passing locally
- ✅ Backend running without errors
- ✅ Frontend working correctly
- ✅ Stripe account set up

---

## PHASE 1: Database Setup (Supabase)

### 1.1 Apply Migration
```sql
-- Run in Supabase SQL Editor
-- File: supabase/migrations/20251027140000_fix_schema_cache_appointments.sql
```

### 1.2 Verify Tables
```sql
-- Check appointments table
SELECT COUNT(*) FROM appointments;

-- Check dentists table
SELECT COUNT(*) FROM dentists;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'appointments';
```

### 1.3 Set Up Storage Buckets
1. Go to Supabase Dashboard → Storage
2. Create buckets:
   - `appointment-documents` (private)
   - `dentist-images` (public)
   - `booking-pdfs` (private)

### 1.4 Configure Auth Settings
1. Go to Authentication → Settings
2. Enable Email provider
3. Configure email templates
4. Set redirect URLs:
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: `https://yourdomain.com/**`

---

## PHASE 2: Backend Deployment

### 2.1 Choose Hosting Platform

**Recommended: Railway.app**
- Free tier available
- Easy deployment
- Automatic HTTPS
- Environment variables support

**Alternative: Render.com**
- Free tier available
- Auto-deploy from GitHub
- Built-in monitoring

### 2.2 Deploy to Railway

#### Step 1: Create Account
1. Go to: https://railway.app
2. Sign up with GitHub
3. Create new project

#### Step 2: Deploy Backend
```bash
# In backend directory
railway login
railway init
railway up
```

#### Step 3: Set Environment Variables
```env
NODE_ENV=production
PORT=3000
API_PREFIX=/api

SUPABASE_URL=https://ypbklvrerxikktkbswad.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

CORS_ORIGIN=https://yourdomain.com,https://admin.yourdomain.com,https://dentist.yourdomain.com

LOG_LEVEL=info

JWT_SECRET=generate_strong_secret_here

STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_SUCCESS_URL=https://yourdomain.com/booking-confirmation?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=https://yourdomain.com/booking-cancelled

DEFAULT_APPOINTMENT_AMOUNT=5000
PAYMENT_CURRENCY=usd
```

#### Step 4: Get Deployment URL
- Railway will provide: `https://your-app.railway.app`
- Note this URL for frontend configuration

### 2.3 Configure Stripe Webhooks

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://your-backend-url.railway.app/api/payments/webhook`
4. Events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy webhook signing secret
6. Add to Railway environment variables as `STRIPE_WEBHOOK_SECRET`

---

## PHASE 3: Frontend Deployment

### 3.1 User Website (Main App)

#### Deploy to Vercel

**Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

**Step 2: Build and Deploy**
```bash
# In root directory
vercel login
vercel
```

**Step 3: Configure Environment Variables**

In Vercel Dashboard → Settings → Environment Variables:
```env
VITE_SUPABASE_PROJECT_ID=ypbklvrerxikktkbswad
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_URL=https://ypbklvrerxikktkbswad.supabase.co
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
VITE_API_URL=https://your-backend-url.railway.app
GEMINI_API_KEY=your_gemini_key
```

**Step 4: Configure Custom Domain**
1. Go to Vercel Dashboard → Domains
2. Add custom domain: `yourdomain.com`
3. Follow DNS configuration instructions

### 3.2 Admin Dashboard

**Step 1: Deploy to Vercel**
```bash
cd admin-app
vercel
```

**Step 2: Configure Environment Variables**
```env
VITE_SUPABASE_PROJECT_ID=ypbklvrerxikktkbswad
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_URL=https://ypbklvrerxikktkbswad.supabase.co
VITE_API_URL=https://your-backend-url.railway.app
```

**Step 3: Configure Custom Domain**
- Add domain: `admin.yourdomain.com`

### 3.3 Dentist Portal

**Step 1: Deploy to Vercel**
```bash
cd dentist-portal
vercel
```

**Step 2: Configure Environment Variables**
```env
VITE_SUPABASE_PROJECT_ID=ypbklvrerxikktkbswad
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_URL=https://ypbklvrerxikktkbswad.supabase.co
VITE_API_URL=https://your-backend-url.railway.app
```

**Step 3: Configure Custom Domain**
- Add domain: `dentist.yourdomain.com`

---

## PHASE 4: Edge Functions Deployment

### 4.1 Deploy Chatbot Function

```bash
cd supabase/functions
supabase functions deploy chat-bot
```

### 4.2 Deploy PDF Generator

```bash
supabase functions deploy generate-appointment-pdf
```

### 4.3 Set Function Secrets

```bash
supabase secrets set OPENAI_API_KEY=your_openai_key
supabase secrets set GEMINI_API_KEY=your_gemini_key
```

---

## PHASE 5: DNS Configuration

### 5.1 Main Domain (yourdomain.com)
```
Type: A
Name: @
Value: [Vercel IP]

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 5.2 Admin Subdomain (admin.yourdomain.com)
```
Type: CNAME
Name: admin
Value: cname.vercel-dns.com
```

### 5.3 Dentist Subdomain (dentist.yourdomain.com)
```
Type: CNAME
Name: dentist
Value: cname.vercel-dns.com
```

---

## PHASE 6: SSL/HTTPS Configuration

### 6.1 Vercel (Automatic)
- SSL certificates automatically provisioned
- HTTPS enforced by default
- No configuration needed

### 6.2 Railway (Automatic)
- SSL certificates automatically provisioned
- HTTPS enforced by default
- No configuration needed

---

## PHASE 7: Monitoring & Analytics

### 7.1 Set Up Error Tracking (Sentry)

**Step 1: Create Sentry Account**
1. Go to: https://sentry.io
2. Create new project for each app

**Step 2: Install Sentry**
```bash
npm install @sentry/react @sentry/tracing
```

**Step 3: Configure Sentry**
```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your_sentry_dsn",
  environment: "production",
  tracesSampleRate: 1.0,
});
```

### 7.2 Set Up Analytics (Google Analytics)

**Step 1: Create GA4 Property**
1. Go to: https://analytics.google.com
2. Create new property

**Step 2: Install GA**
```bash
npm install react-ga4
```

**Step 3: Configure GA**
```typescript
// src/main.tsx
import ReactGA from "react-ga4";

ReactGA.initialize("G-XXXXXXXXXX");
```

### 7.3 Set Up Uptime Monitoring

**Use UptimeRobot (Free)**
1. Go to: https://uptimerobot.com
2. Add monitors for:
   - Main website
   - Admin dashboard
   - Dentist portal
   - Backend API

---

## PHASE 8: Security Hardening

### 8.1 Enable Rate Limiting
- Already configured in backend
- Verify in production

### 8.2 Configure CORS Properly
```typescript
// backend/src/app.ts
const corsOptions = {
  origin: [
    'https://yourdomain.com',
    'https://admin.yourdomain.com',
    'https://dentist.yourdomain.com'
  ],
  credentials: true
};
```

### 8.3 Secure Environment Variables
- Never commit `.env` files
- Use platform secret management
- Rotate keys regularly

### 8.4 Enable Supabase RLS
- Verify all policies active
- Test with different user roles
- Monitor policy violations

---

## PHASE 9: Performance Optimization

### 9.1 Enable CDN
- Vercel CDN enabled by default
- Configure caching headers

### 9.2 Optimize Images
```bash
npm install sharp
```

### 9.3 Enable Compression
- Gzip enabled by default on Vercel
- Brotli compression available

### 9.4 Database Optimization
- Indexes created by migration
- Monitor slow queries in Supabase
- Enable connection pooling

---

## PHASE 10: Testing in Production

### 10.1 Smoke Tests

**Test 1: User Booking**
1. Visit: https://yourdomain.com
2. Browse dentists
3. Book appointment
4. Complete payment
5. Verify confirmation

**Test 2: Admin Dashboard**
1. Visit: https://admin.yourdomain.com
2. Sign in as admin
3. View dentists
4. Manage availability
5. View appointments

**Test 3: Dentist Portal**
1. Visit: https://dentist.yourdomain.com
2. Sign in as dentist
3. View appointments
4. Update appointment status
5. Add notes

### 10.2 Load Testing

Use Artillery or k6:
```bash
npm install -g artillery
artillery quick --count 100 --num 10 https://yourdomain.com
```

### 10.3 Security Testing

Use OWASP ZAP or Burp Suite:
- Test for SQL injection
- Test for XSS
- Test authentication
- Test authorization

---

## PHASE 11: Backup & Recovery

### 11.1 Database Backups
- Supabase automatic daily backups
- Enable point-in-time recovery
- Test restore procedure

### 11.2 Code Backups
- GitHub repository
- Multiple branches
- Tagged releases

### 11.3 Environment Backups
- Document all environment variables
- Store securely (1Password, LastPass)
- Keep offline copy

---

## PHASE 12: Documentation

### 12.1 User Documentation
- Create user guide
- Record video tutorials
- Write FAQ

### 12.2 Admin Documentation
- Admin dashboard guide
- Dentist management guide
- Troubleshooting guide

### 12.3 Developer Documentation
- API documentation
- Database schema
- Deployment guide

---

## PHASE 13: Launch Checklist

### Pre-Launch
- [ ] All migrations applied
- [ ] All tests passing
- [ ] Backend deployed and tested
- [ ] Frontend deployed and tested
- [ ] Edge functions deployed
- [ ] DNS configured
- [ ] SSL certificates active
- [ ] Monitoring set up
- [ ] Analytics configured
- [ ] Backups enabled
- [ ] Documentation complete

### Launch Day
- [ ] Announce launch
- [ ] Monitor error logs
- [ ] Watch performance metrics
- [ ] Be ready for support
- [ ] Collect user feedback

### Post-Launch
- [ ] Review analytics
- [ ] Fix reported bugs
- [ ] Optimize performance
- [ ] Add requested features
- [ ] Update documentation

---

## PHASE 14: Maintenance Plan

### Daily
- Check error logs
- Monitor uptime
- Review user feedback

### Weekly
- Review analytics
- Check performance metrics
- Update dependencies

### Monthly
- Security audit
- Performance optimization
- Feature planning
- User surveys

### Quarterly
- Major updates
- Security patches
- Infrastructure review
- Cost optimization

---

## Support & Resources

### Documentation
- Supabase: https://supabase.com/docs
- Vercel: https://vercel.com/docs
- Railway: https://docs.railway.app
- Stripe: https://stripe.com/docs

### Community
- Supabase Discord
- React Discord
- Stack Overflow

### Professional Support
- Supabase Pro Plan
- Vercel Pro Plan
- Stripe Support

---

## Emergency Contacts

### Critical Issues
1. Check status pages:
   - Supabase: https://status.supabase.com
   - Vercel: https://www.vercel-status.com
   - Stripe: https://status.stripe.com

2. Rollback procedure:
   ```bash
   # Vercel
   vercel rollback
   
   # Railway
   railway rollback
   ```

3. Database restore:
   - Supabase Dashboard → Database → Backups
   - Select backup point
   - Restore

---

## Success Metrics

Track these KPIs:
- Booking conversion rate
- Average booking time
- Payment success rate
- User satisfaction score
- System uptime
- API response times
- Error rate
- User retention

---

## Congratulations! 🎉

Your Dental Care Connect platform is now live in production!

Monitor closely for the first few days and be ready to respond to issues quickly.

Good luck! 🚀
