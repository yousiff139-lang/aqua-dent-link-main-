# Payment Configuration Guide

This guide provides step-by-step instructions for configuring Stripe payments for the appointment booking system.

## Overview

The appointment booking system uses Stripe Checkout for secure payment processing. This guide covers:
- Setting up Stripe API keys
- Configuring webhook endpoints
- Testing payments locally
- Deploying to production

---

## Prerequisites

- Stripe account (create at [stripe.com](https://stripe.com))
- Backend API running on port 3000
- User Website running on port 5174

---

## Step 1: Get Stripe API Keys

### For Development (Test Mode)

1. Log in to your Stripe Dashboard
2. Navigate to [Developers > API Keys](https://dashboard.stripe.com/test/apikeys)
3. Ensure you're in **Test mode** (toggle in top right)
4. Copy the following keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### For Production (Live Mode)

1. Switch to **Live mode** in Stripe Dashboard
2. Navigate to [Developers > API Keys](https://dashboard.stripe.com/apikeys)
3. Copy the following keys:
   - **Publishable key** (starts with `pk_live_`)
   - **Secret key** (starts with `sk_live_`)

---

## Step 2: Configure Environment Variables

### User Website (.env)

Add the Stripe publishable key to the root `.env` file:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_51QKabc123..."

# Backend API URL
VITE_API_URL="http://localhost:3000"
```

### Backend API (backend/.env)

Add the Stripe secret key and payment configuration:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51QKabc123...
STRIPE_WEBHOOK_SECRET=whsec_abc123...  # We'll get this in Step 3
STRIPE_SUCCESS_URL=http://localhost:5174/booking-confirmation?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:5174/booking-cancelled

# Payment Configuration
DEFAULT_APPOINTMENT_AMOUNT=5000  # $50.00 in cents
PAYMENT_CURRENCY=usd
```

---

## Step 3: Set Up Stripe Webhooks

Webhooks allow Stripe to notify your backend when payment events occur (successful payment, failed payment, etc.).

### Option A: Local Development with Stripe CLI (Recommended)

The Stripe CLI forwards webhook events to your local server.

#### Install Stripe CLI

**macOS (Homebrew):**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows (Scoop):**
```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**Linux:**
```bash
# Download from https://github.com/stripe/stripe-cli/releases/latest
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

#### Login to Stripe

```bash
stripe login
```

This will open your browser to authorize the CLI.

#### Forward Webhooks to Local Server

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

You'll see output like:
```
> Ready! Your webhook signing secret is whsec_abc123xyz... (^C to quit)
```

#### Copy the Webhook Secret

Copy the `whsec_...` secret from the output and add it to `backend/.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_abc123xyz...
```

#### Keep the CLI Running

Leave the `stripe listen` command running while testing payments. It will display webhook events in real-time.

### Option B: Production Webhook Endpoint

For production or if you have a publicly accessible URL:

1. Go to [Developers > Webhooks](https://dashboard.stripe.com/webhooks) in Stripe Dashboard
2. Click **Add endpoint**
3. Enter your endpoint URL:
   - **Development**: `https://your-ngrok-url.ngrok.io/api/payments/webhook`
   - **Production**: `https://api.yourdomain.com/api/payments/webhook`
4. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `checkout.session.expired`
   - ✅ `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to your environment variables

---

## Step 4: Configure Payment Amount

The default appointment payment amount is configured in cents.

### Examples

| Display Amount | Cents | Configuration |
|----------------|-------|---------------|
| $10.00 | 1000 | `DEFAULT_APPOINTMENT_AMOUNT=1000` |
| $25.00 | 2500 | `DEFAULT_APPOINTMENT_AMOUNT=2500` |
| $50.00 | 5000 | `DEFAULT_APPOINTMENT_AMOUNT=5000` |
| $100.00 | 10000 | `DEFAULT_APPOINTMENT_AMOUNT=10000` |

### Dynamic Pricing (Optional)

You can override the default amount when creating a checkout session from the frontend:

```typescript
const response = await axios.post('/api/payments/create-checkout-session', {
  appointmentId: '123',
  amount: 7500, // $75.00
  currency: 'usd',
  dentistName: 'Dr. Smith',
  patientEmail: 'patient@example.com'
});
```

---

## Step 5: Configure CORS

Ensure the backend allows requests from your frontend applications.

In `backend/.env`:

```env
# Development
CORS_ORIGIN=http://localhost:5174,http://localhost:5173

# Production
CORS_ORIGIN=https://yourdomain.com,https://dentist.yourdomain.com
```

---

## Step 6: Test the Payment Flow

### Start All Services

1. **Backend API:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Stripe CLI (if using local webhooks):**
   ```bash
   stripe listen --forward-to localhost:3000/api/payments/webhook
   ```

3. **User Website:**
   ```bash
   npm run dev
   ```

### Test a Payment

1. Navigate to a dentist profile page
2. Fill out the booking form
3. Select **Stripe** as payment method
4. Click **Book Appointment**
5. You'll be redirected to Stripe Checkout
6. Use a [test card number](https://stripe.com/docs/testing):
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - **3D Secure**: `4000 0025 0000 3155`
7. Use any future expiry date (e.g., `12/34`)
8. Use any 3-digit CVC (e.g., `123`)
9. Complete the payment
10. You should be redirected back to the confirmation page

### Verify Webhook Events

In the Stripe CLI terminal, you should see:
```
2025-10-25 10:30:45   --> checkout.session.completed [evt_abc123]
2025-10-25 10:30:45  <--  [200] POST http://localhost:3000/api/payments/webhook
```

Check your backend logs for:
```
[INFO] Webhook event received: checkout.session.completed
[INFO] Payment successful for appointment: 123
```

---

## Step 7: Verify Database Updates

After a successful payment, verify the appointment record is updated:

1. Open Supabase Dashboard
2. Navigate to **Table Editor > appointments**
3. Find your test appointment
4. Verify:
   - `payment_status` = `'paid'`
   - `payment_method` = `'stripe'`
   - `stripe_session_id` is populated
   - `stripe_payment_intent_id` is populated

---

## Troubleshooting

### Issue: "Stripe is not defined"

**Cause**: Stripe publishable key not configured in User Website

**Solution**: Add `VITE_STRIPE_PUBLISHABLE_KEY` to `.env` and restart dev server

### Issue: "Webhook signature verification failed"

**Cause**: Incorrect webhook secret or request not from Stripe

**Solution**: 
- Verify `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe CLI or Dashboard
- Ensure webhook endpoint is receiving raw body (not parsed JSON)
- Check backend logs for detailed error message

### Issue: "CORS error when calling payment API"

**Cause**: Backend CORS not configured for frontend origin

**Solution**: Add frontend URL to `CORS_ORIGIN` in `backend/.env`:
```env
CORS_ORIGIN=http://localhost:5174,http://localhost:5173
```

### Issue: "Payment successful but appointment not updated"

**Cause**: Webhook not received or processed

**Solution**:
- Check Stripe CLI is running and forwarding webhooks
- Check backend logs for webhook processing errors
- Verify appointment ID is stored in Stripe session metadata
- Check database connection and permissions

### Issue: "Redirect URLs not working"

**Cause**: Success/cancel URLs not configured correctly

**Solution**: Verify in `backend/.env`:
```env
STRIPE_SUCCESS_URL=http://localhost:5174/booking-confirmation?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:5174/booking-cancelled
```

Ensure `{CHECKOUT_SESSION_ID}` placeholder is included in success URL.

---

## Production Deployment Checklist

- [ ] Switch to Stripe Live mode
- [ ] Update `STRIPE_SECRET_KEY` with live key (starts with `sk_live_`)
- [ ] Update `VITE_STRIPE_PUBLISHABLE_KEY` with live key (starts with `pk_live_`)
- [ ] Set up production webhook endpoint in Stripe Dashboard
- [ ] Update `STRIPE_WEBHOOK_SECRET` with production webhook secret
- [ ] Update `STRIPE_SUCCESS_URL` with production domain
- [ ] Update `STRIPE_CANCEL_URL` with production domain
- [ ] Update `CORS_ORIGIN` with production domains
- [ ] Test payment flow in production
- [ ] Monitor webhook events in Stripe Dashboard
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure payment amount for production pricing
- [ ] Review and test refund process
- [ ] Set up payment reconciliation process

---

## Security Best Practices

### Never Expose Secret Keys

- ❌ Never commit `.env` files to version control
- ❌ Never expose `STRIPE_SECRET_KEY` in frontend code
- ❌ Never log secret keys in application logs
- ✅ Use environment variables for all secrets
- ✅ Use `.env.example` as a template
- ✅ Store production secrets in secure secret management systems

### Verify Webhook Signatures

The backend automatically verifies webhook signatures using `STRIPE_WEBHOOK_SECRET`. This ensures:
- Webhooks are actually from Stripe
- Webhook data hasn't been tampered with
- Protection against replay attacks

### Use HTTPS in Production

- All production URLs must use HTTPS
- Stripe requires HTTPS for webhook endpoints
- Configure SSL/TLS certificates for your domain

### Implement Idempotency

The backend implements idempotency for webhook processing to prevent:
- Duplicate payment processing
- Race conditions
- Data inconsistencies

---

## Testing with Stripe Test Cards

Stripe provides test card numbers for different scenarios:

| Scenario | Card Number | Description |
|----------|-------------|-------------|
| Success | `4242 4242 4242 4242` | Payment succeeds |
| Decline | `4000 0000 0000 0002` | Card declined |
| Insufficient Funds | `4000 0000 0000 9995` | Insufficient funds |
| Expired Card | `4000 0000 0000 0069` | Expired card |
| Processing Error | `4000 0000 0000 0119` | Processing error |
| 3D Secure | `4000 0025 0000 3155` | Requires authentication |

For all test cards:
- Use any future expiry date (e.g., `12/34`)
- Use any 3-digit CVC (e.g., `123`)
- Use any billing ZIP code (e.g., `12345`)

Full list: [Stripe Testing Documentation](https://stripe.com/docs/testing)

---

## Monitoring and Analytics

### Stripe Dashboard

Monitor payments in real-time:
- [Payments](https://dashboard.stripe.com/payments) - View all transactions
- [Customers](https://dashboard.stripe.com/customers) - View customer data
- [Webhooks](https://dashboard.stripe.com/webhooks) - Monitor webhook delivery
- [Logs](https://dashboard.stripe.com/logs) - View API request logs

### Backend Logs

Check `backend/logs/` for:
- Payment processing logs
- Webhook event logs
- Error logs
- API request logs

### Key Metrics to Monitor

- Payment success rate
- Webhook delivery success rate
- Average payment processing time
- Failed payment reasons
- Refund rate

---

## Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Security Best Practices](https://stripe.com/docs/security)

---

## Support

For payment-related issues:
1. Check this guide and troubleshooting section
2. Review backend logs in `backend/logs/`
3. Check Stripe Dashboard for payment events
4. Review webhook delivery in Stripe Dashboard
5. Contact Stripe Support for payment processing issues
6. Contact development team for integration issues

---

**Last Updated**: October 25, 2025
