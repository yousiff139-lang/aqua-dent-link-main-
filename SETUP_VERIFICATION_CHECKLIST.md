# Setup Verification Checklist

Use this checklist to verify that all environment variables and configuration are properly set up for the appointment booking and payment system.

## Prerequisites

- [ ] Node.js and npm installed
- [ ] Supabase account created
- [ ] Stripe account created
- [ ] All dependencies installed (`npm install` in root, backend, and dentist-portal)

---

## Environment Files

### User Website

- [ ] `.env` file exists in root directory
- [ ] `VITE_SUPABASE_URL` is set
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` is set
- [ ] `VITE_SUPABASE_PROJECT_ID` is set
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` is set (starts with `pk_test_` or `pk_live_`)
- [ ] `VITE_API_URL` is set to `http://localhost:3000`

### Backend API

- [ ] `backend/.env` file exists
- [ ] `NODE_ENV` is set to `development`
- [ ] `PORT` is set to `3000`
- [ ] `SUPABASE_URL` is set
- [ ] `SUPABASE_ANON_KEY` is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set
- [ ] `CORS_ORIGIN` includes `http://localhost:5174,http://localhost:5173`
- [ ] `STRIPE_SECRET_KEY` is set (starts with `sk_test_` or `sk_live_`)
- [ ] `STRIPE_WEBHOOK_SECRET` is set (starts with `whsec_`)
- [ ] `STRIPE_SUCCESS_URL` is set with `{CHECKOUT_SESSION_ID}` placeholder
- [ ] `STRIPE_CANCEL_URL` is set
- [ ] `DEFAULT_APPOINTMENT_AMOUNT` is set (in cents)
- [ ] `PAYMENT_CURRENCY` is set to `usd`
- [ ] `JWT_SECRET` is set

### Dentist Portal

- [ ] `dentist-portal/.env` file exists
- [ ] `VITE_API_URL` is set to `http://localhost:3000/api`
- [ ] `VITE_SUPABASE_URL` is set
- [ ] `VITE_SUPABASE_ANON_KEY` is set

---

## Stripe Configuration

### API Keys

- [ ] Stripe account is in Test mode (for development)
- [ ] Publishable key copied from Stripe Dashboard
- [ ] Secret key copied from Stripe Dashboard
- [ ] Keys match the environment (test keys for dev, live keys for prod)

### Webhook Setup

Choose one option:

**Option A: Stripe CLI (Recommended for Local Development)**
- [ ] Stripe CLI installed
- [ ] Logged in to Stripe CLI (`stripe login`)
- [ ] Webhook forwarding running (`stripe listen --forward-to localhost:3000/api/payments/webhook`)
- [ ] Webhook secret copied from CLI output to `STRIPE_WEBHOOK_SECRET`

**Option B: Webhook Endpoint (Production or Public URL)**
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Endpoint URL configured: `https://your-domain/api/payments/webhook`
- [ ] Events selected: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`
- [ ] Webhook signing secret copied to `STRIPE_WEBHOOK_SECRET`

---

## CORS Configuration

- [ ] Backend `CORS_ORIGIN` includes User Website origin (`http://localhost:5174`)
- [ ] Backend `CORS_ORIGIN` includes Dentist Portal origin (`http://localhost:5173`)
- [ ] Origins are comma-separated with no spaces (or spaces are trimmed in code)
- [ ] Production origins added for production deployment

---

## Payment Amount Configuration

- [ ] `DEFAULT_APPOINTMENT_AMOUNT` is set in cents (e.g., 5000 = $50.00)
- [ ] `PAYMENT_CURRENCY` is set to correct currency code (e.g., `usd`)
- [ ] Amount matches your pricing requirements

---

## Services Running

- [ ] Backend API is running (`cd backend && npm run dev`)
- [ ] Backend is accessible at `http://localhost:3000`
- [ ] User Website is running (`npm run dev`)
- [ ] User Website is accessible at `http://localhost:5174`
- [ ] Dentist Portal is running (`cd dentist-portal && npm run dev`)
- [ ] Dentist Portal is accessible at `http://localhost:5173`
- [ ] Stripe CLI is running (if using local webhooks)

---

## Verification Tests

### 1. Backend Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-25T10:30:00.000Z",
  "uptime": 123.45,
  "checks": {
    "database": "ok"
  }
}
```

- [ ] Health check returns 200 status
- [ ] Database status is "ok"

### 2. CORS Test

Open browser console on User Website (`http://localhost:5174`) and run:
```javascript
fetch('http://localhost:3000/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

- [ ] No CORS errors in console
- [ ] Response received successfully

### 3. Stripe Integration Test

1. Navigate to a dentist profile page on User Website
2. Fill out the booking form
3. Select "Stripe" as payment method
4. Click "Book Appointment"

- [ ] No JavaScript errors in console
- [ ] Redirected to Stripe Checkout page
- [ ] Stripe Checkout displays correct amount
- [ ] Stripe Checkout displays dentist/appointment details

### 4. Test Payment Flow

Use Stripe test card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

- [ ] Payment completes successfully
- [ ] Redirected back to confirmation page
- [ ] Confirmation page displays appointment details
- [ ] Appointment appears in Dentist Portal

### 5. Webhook Verification

Check Stripe CLI output (if using local webhooks):
- [ ] `checkout.session.completed` event received
- [ ] Webhook returns 200 status
- [ ] No errors in webhook processing

Check backend logs:
- [ ] Webhook event logged
- [ ] Payment status updated
- [ ] No errors in logs

### 6. Database Verification

Check Supabase Dashboard > Table Editor > appointments:
- [ ] New appointment record exists
- [ ] `payment_status` is `'paid'`
- [ ] `payment_method` is `'stripe'`
- [ ] `stripe_session_id` is populated
- [ ] `stripe_payment_intent_id` is populated

---

## Common Issues and Solutions

### Issue: CORS Error

**Symptoms**: `Access-Control-Allow-Origin` error in browser console

**Solutions**:
- [ ] Verify `CORS_ORIGIN` in `backend/.env` includes frontend origin
- [ ] Restart backend server after changing `.env`
- [ ] Check for typos in origin URLs
- [ ] Ensure no trailing slashes in origin URLs

### Issue: Stripe Not Defined

**Symptoms**: `Stripe is not defined` error in console

**Solutions**:
- [ ] Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set in `.env`
- [ ] Restart User Website dev server after changing `.env`
- [ ] Check key starts with `pk_test_` or `pk_live_`
- [ ] Clear browser cache

### Issue: Webhook Signature Verification Failed

**Symptoms**: `Webhook signature verification failed` in backend logs

**Solutions**:
- [ ] Verify `STRIPE_WEBHOOK_SECRET` matches Stripe CLI output or Dashboard
- [ ] Ensure Stripe CLI is running and forwarding to correct URL
- [ ] Check webhook endpoint is receiving raw body (not parsed JSON)
- [ ] Restart backend server after changing webhook secret

### Issue: Payment Successful but Appointment Not Updated

**Symptoms**: Payment completes but appointment status doesn't change

**Solutions**:
- [ ] Check Stripe CLI is running and forwarding webhooks
- [ ] Check backend logs for webhook processing errors
- [ ] Verify appointment ID is in Stripe session metadata
- [ ] Check database connection and permissions
- [ ] Verify webhook events are configured in Stripe Dashboard

### Issue: API Connection Failed

**Symptoms**: `Network Error` or `Failed to fetch` in console

**Solutions**:
- [ ] Verify backend is running on port 3000
- [ ] Check `VITE_API_URL` in frontend `.env` files
- [ ] Ensure no firewall blocking localhost connections
- [ ] Check backend logs for errors
- [ ] Verify database connection is working

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Switch Stripe to Live mode
- [ ] Update all Stripe keys to live keys (`sk_live_`, `pk_live_`)
- [ ] Set up production webhook endpoint in Stripe Dashboard
- [ ] Update `STRIPE_WEBHOOK_SECRET` with production webhook secret
- [ ] Update `STRIPE_SUCCESS_URL` with production domain
- [ ] Update `STRIPE_CANCEL_URL` with production domain
- [ ] Update `CORS_ORIGIN` with production domains
- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `JWT_SECRET` for production
- [ ] Set up SSL/TLS certificates (HTTPS required)
- [ ] Test complete payment flow in production
- [ ] Monitor webhook delivery in Stripe Dashboard
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure logging for production
- [ ] Set up database backups
- [ ] Review security best practices

---

## Documentation References

- [Environment Variables Guide](./ENVIRONMENT_VARIABLES.md)
- [Payment Configuration Guide](./PAYMENT_CONFIGURATION_GUIDE.md)
- [Backend Configuration Guide](./backend/CONFIGURATION.md)
- [Main README](./README.md)

---

## Support

If you encounter issues not covered in this checklist:

1. Review the detailed documentation guides
2. Check application logs
3. Review Stripe Dashboard for payment events
4. Check Supabase Dashboard for database issues
5. Contact the development team

---

**Last Updated**: October 25, 2025
