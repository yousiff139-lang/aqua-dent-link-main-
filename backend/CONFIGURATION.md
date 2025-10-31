# Backend Configuration Guide

Quick reference for configuring the backend API server.

## Environment Variables

All configuration is managed through environment variables in `backend/.env`.

### Required Variables

```env
# Server
NODE_ENV=development
PORT=3000
API_PREFIX=/api

# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Security
CORS_ORIGIN=http://localhost:5174,http://localhost:5173
JWT_SECRET=your-secret-key

# Payments (Required for appointment booking)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=http://localhost:5174/booking-confirmation?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:5174/booking-cancelled
DEFAULT_APPOINTMENT_AMOUNT=5000
PAYMENT_CURRENCY=usd
```

## CORS Configuration

The `CORS_ORIGIN` variable controls which frontend applications can access the API.

### Development
```env
CORS_ORIGIN=http://localhost:5174,http://localhost:5173,http://localhost:8080,http://localhost:3010
```

- Port 5174: User Website (patient-facing)
- Port 5173: Dentist Portal
- Port 8080: Legacy User Website
- Port 3010: Legacy Admin Portal

### Production
```env
CORS_ORIGIN=https://yourdomain.com,https://dentist.yourdomain.com,https://admin.yourdomain.com
```

## Payment Configuration

### Amount in Cents

The `DEFAULT_APPOINTMENT_AMOUNT` is specified in cents (smallest currency unit):

| Amount | Cents |
|--------|-------|
| $10.00 | 1000 |
| $25.00 | 2500 |
| $50.00 | 5000 |
| $100.00 | 10000 |

### Stripe Keys

- **Development**: Use test keys (prefix: `sk_test_`, `pk_test_`)
- **Production**: Use live keys (prefix: `sk_live_`, `pk_live_`)

Get keys from: [Stripe Dashboard > API Keys](https://dashboard.stripe.com/test/apikeys)

### Webhook Secret

For local development, use Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Copy the `whsec_...` secret from the output.

For production, set up a webhook endpoint in Stripe Dashboard and copy the signing secret.

## Quick Start

1. Copy environment template:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your credentials

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Server will be available at `http://localhost:3000`

## Verification

### Health Check

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

### Test API Endpoint

```bash
curl http://localhost:3000/api/appointments/dentist/test@example.com
```

## Logging

Logs are written to:
- Console (development)
- `logs/error.log` (errors only)
- `logs/combined.log` (all logs)

Log levels: `error`, `warn`, `info`, `debug`

Set level in `.env`:
```env
LOG_LEVEL=info
```

## Common Issues

### CORS Errors

**Error**: `Access-Control-Allow-Origin` error in browser console

**Solution**: Add frontend origin to `CORS_ORIGIN` in `.env`

### Database Connection Failed

**Error**: `Invalid Supabase credentials`

**Solution**: Verify `SUPABASE_URL` and keys in `.env`

### Stripe Webhook Verification Failed

**Error**: `Webhook signature verification failed`

**Solution**: 
- Ensure `STRIPE_WEBHOOK_SECRET` is correct
- For local dev, use Stripe CLI
- Check webhook endpoint receives raw body

## Additional Documentation

- [Full Environment Variables Guide](../ENVIRONMENT_VARIABLES.md)
- [Payment Configuration Guide](../PAYMENT_CONFIGURATION_GUIDE.md)
- [API Documentation](./README.md)

## Support

For configuration issues:
1. Check this guide
2. Review logs in `logs/` directory
3. Verify environment variables
4. Check Supabase/Stripe dashboards
5. Contact development team
