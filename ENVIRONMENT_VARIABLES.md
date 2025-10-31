# Environment Variables Configuration Guide

This document provides a comprehensive guide to all environment variables required for the Aqua Dent Link platform, including the User Website, Dentist Portal, and Backend API.

## Overview

The platform consists of four main applications:
1. **User Website** (Port 5174) - Patient-facing application
2. **Dentist Portal** (Port 5173) - Dentist management dashboard
3. **Admin App** (Port varies) - Administrative dashboard
4. **Backend API** (Port 3000) - RESTful API server

Each application requires its own `.env` file with specific configuration.

---

## 🚨 Critical Variables - Start Here

Before running the application, you **MUST** configure these essential Supabase variables. Without them, the application will not function.

### VITE_SUPABASE_URL

**Purpose:** The base URL for your Supabase project API endpoint.

**Format:** `https://[project-ref].supabase.co`

**Example:** `https://ypbklvrerxikktkbswad.supabase.co`

**Where to find it:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy the **Project URL**

**Required in:**
- User Website (`.env`) as `VITE_SUPABASE_URL`
- Dentist Portal (`dentist-portal/.env`) as `VITE_SUPABASE_URL`
- Backend (`backend/.env`) as `SUPABASE_URL`

### VITE_SUPABASE_PUBLISHABLE_KEY

**Purpose:** The anonymous/public API key for client-side Supabase access. This key is safe to expose in frontend code.

**Format:** JWT token starting with `eyJhbGc...`

**Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl...`

**Where to find it:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy the **anon public** key under "Project API keys"

**Required in:**
- User Website (`.env`) as `VITE_SUPABASE_PUBLISHABLE_KEY`
- Dentist Portal (`dentist-portal/.env`) as `VITE_SUPABASE_ANON_KEY`
- Backend (`backend/.env`) as `SUPABASE_ANON_KEY`

**⚠️ What happens without these variables:**
- ❌ Users cannot log in or sign up
- ❌ Dentist profiles will not load
- ❌ Appointments cannot be created or viewed
- ❌ Database queries will fail with "schema cache" errors
- ❌ Application will show connection errors

**✅ Quick Setup:**
```bash
# 1. Copy example files
cp .env.example .env
cp backend/.env.example backend/.env
cp dentist-portal/.env dentist-portal/.env

# 2. Get credentials from Supabase Dashboard
# 3. Update all three .env files with your VITE_SUPABASE_URL and keys
# 4. Restart development servers
```

---

## User Website (.env)

Location: `/.env` (root directory)

### Required Variables

| Variable | Description | Example | Required For |
|----------|-------------|---------|--------------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` | Authentication, Database |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anonymous/public key | `eyJhbGc...` | Authentication, Database |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID | `xxx` | Database |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_test_...` | **Payment Processing** |
| `VITE_API_URL` | Backend API base URL | `http://localhost:3000` | **Appointment Booking** |

### Optional Variables

| Variable | Description | Example | Used For |
|----------|-------------|---------|----------|
| `VITE_OPENAI_API_KEY` | OpenAI API key | `sk-proj-...` | AI Chatbot |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` | AI Chatbot |

### Example .env File

```env
# Supabase Configuration
VITE_SUPABASE_PROJECT_ID="your_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_key"
VITE_SUPABASE_URL="https://your-project.supabase.co"

# Stripe Configuration (REQUIRED for payments)
# Get from: https://dashboard.stripe.com/test/apikeys
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key_here"

# Backend API Configuration (REQUIRED for appointments)
VITE_API_URL="http://localhost:3000"

# Optional: AI Integrations
VITE_OPENAI_API_KEY="sk-proj-your-openai-key"
GEMINI_API_KEY="your_gemini_api_key"
```

---

## Dentist Portal (dentist-portal/.env)

Location: `/dentist-portal/.env`

### Required Variables

| Variable | Description | Example | Required For |
|----------|-------------|---------|--------------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` | Authentication, Database |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGc...` | Authentication, Database |
| `VITE_API_URL` | Backend API base URL | `http://localhost:3000/api` | **Appointment Management** |
| `VITE_APP_NAME` | Application name | `Dentist Portal` | Branding |

### Example .env File

```env
# Backend API Configuration (REQUIRED for appointments)
VITE_API_URL=http://localhost:3000/api

# Application Configuration
VITE_APP_NAME=Dentist Portal

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## Admin App (admin-app/.env)

Location: `/admin-app/.env`

### Required Variables

| Variable | Description | Example | Required For |
|----------|-------------|---------|--------------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` | Authentication, Database |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anonymous/public key | `eyJhbGc...` | Authentication, Database |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID | `xxx` | Database |

### Example .env File

```env
# Supabase Configuration
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_key"
VITE_SUPABASE_PROJECT_ID="your_project_id"
```

---

## Backend API (backend/.env)

Location: `/backend/.env`

### Required Variables

| Variable | Description | Example | Required For |
|----------|-------------|---------|--------------|
| `NODE_ENV` | Environment mode | `development` or `production` | Server Configuration |
| `PORT` | Server port | `3000` | Server Configuration |
| `API_PREFIX` | API route prefix | `/api` | Routing |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` | Database |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGc...` | Database |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGc...` | Database Admin |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `http://localhost:5174,http://localhost:5173` | **Security** |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_...` | **Payment Processing** |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` | **Payment Webhooks** |
| `JWT_SECRET` | JWT token signing secret | `your-secret-key` | Authentication |

### Payment Configuration

| Variable | Description | Example | Notes |
|----------|-------------|---------|-------|
| `DEFAULT_APPOINTMENT_AMOUNT` | Default payment amount in cents | `5000` | $50.00 = 5000 cents |
| `PAYMENT_CURRENCY` | Payment currency code | `usd` | ISO 4217 currency code |
| `STRIPE_SUCCESS_URL` | Redirect URL after successful payment | `http://localhost:5174/booking-confirmation?session_id={CHECKOUT_SESSION_ID}` | Must include `{CHECKOUT_SESSION_ID}` |
| `STRIPE_CANCEL_URL` | Redirect URL after cancelled payment | `http://localhost:5174/booking-cancelled` | User cancels payment |

### Optional Variables

| Variable | Description | Example | Used For |
|----------|-------------|---------|----------|
| `LOG_LEVEL` | Logging level | `info`, `debug`, `warn`, `error` | Logging |
| `CACHE_TTL` | Cache time-to-live in seconds | `3600` | Caching |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | Future caching |

### Example .env File

```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_PREFIX=/api

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# CORS Configuration
# Include User Website (5174) and Dentist Portal (5173) origins
CORS_ORIGIN=http://localhost:5174,http://localhost:5173,http://localhost:8080,http://localhost:3010

# Stripe Configuration (REQUIRED for payments)
# Get from: https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_SUCCESS_URL=http://localhost:5174/booking-confirmation?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:5174/booking-cancelled

# Payment Configuration
DEFAULT_APPOINTMENT_AMOUNT=5000  # Amount in cents ($50.00)
PAYMENT_CURRENCY=usd

# Security
JWT_SECRET=your-jwt-secret-change-in-production

# Logging
LOG_LEVEL=info

# Cache Configuration (Optional)
CACHE_TTL=3600
```

---

## Getting API Keys

### Supabase (REQUIRED - Critical for all functionality)

Supabase provides the PostgreSQL database and authentication backend. These credentials are **mandatory** for the application to work.

#### Step-by-Step Guide:

1. **Create a Supabase Account & Project:**
   - Visit [supabase.com](https://supabase.com)
   - Click "Start your project" or "Sign In"
   - Create a new account or log in with GitHub
   - Click "New Project"
   - Choose an organization (or create one)
   - Fill in:
     - **Project Name:** e.g., "Aqua Dent Link"
     - **Database Password:** Choose a strong password (save this!)
     - **Region:** Choose closest to your users
   - Click "Create new project"
   - Wait 2-3 minutes for project setup

2. **Locate Your API Credentials:**
   - Once project is ready, click the **Settings** icon (⚙️) in the left sidebar
   - Click **API** in the settings menu
   - You'll see the "Project API keys" section

3. **Copy Required Values:**

   | Supabase Dashboard Field | Environment Variable | Where to Use |
   |-------------------------|---------------------|--------------|
   | **URL** (under "Project URL") | `VITE_SUPABASE_URL` | User Website `.env` |
   | **URL** (under "Project URL") | `VITE_SUPABASE_URL` | Dentist Portal `.env` |
   | **URL** (under "Project URL") | `SUPABASE_URL` | Backend `.env` |
   | **anon public** (under "Project API keys") | `VITE_SUPABASE_PUBLISHABLE_KEY` | User Website `.env` |
   | **anon public** (under "Project API keys") | `VITE_SUPABASE_ANON_KEY` | Dentist Portal `.env` |
   | **anon public** (under "Project API keys") | `SUPABASE_ANON_KEY` | Backend `.env` |
   | **service_role** (under "Project API keys") | `SUPABASE_SERVICE_ROLE_KEY` | Backend `.env` only |
   | **Project ref** (from URL, e.g., `xxxxx` in `https://xxxxx.supabase.co`) | `VITE_SUPABASE_PROJECT_ID` | User Website `.env` |

4. **Important Notes:**
   - ⚠️ **anon/public key** is safe to expose in frontend code (it's public)
   - 🔒 **service_role key** must be kept secret (backend only, has admin privileges)
   - 📋 The **Project URL** is the same value for all three applications
   - 🔑 The **anon public key** is the same value for all three applications (just different variable names)

5. **Verify Your Setup:**
   ```bash
   # Check that your .env files have the correct format
   # User Website (.env)
   VITE_SUPABASE_URL="https://xxxxx.supabase.co"  # Should start with https://
   VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGc..."     # Should start with eyJ
   
   # Backend (backend/.env)
   SUPABASE_URL=https://xxxxx.supabase.co         # Same URL as above
   SUPABASE_ANON_KEY=eyJhbGc...                   # Same key as PUBLISHABLE_KEY
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...           # Different key (service_role)
   ```

### Stripe

1. Create an account at [stripe.com](https://stripe.com)
2. Go to [Dashboard > Developers > API Keys](https://dashboard.stripe.com/test/apikeys)
3. Copy the following:
   - **Publishable key** (starts with `pk_test_`) → `VITE_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** (starts with `sk_test_`) → `STRIPE_SECRET_KEY`

#### Setting Up Stripe Webhooks

1. Go to **Developers > Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Enter endpoint URL: `http://your-domain/api/payments/webhook`
   - For local testing: `http://localhost:3000/api/payments/webhook`
   - For production: `https://api.yourdomain.com/api/payments/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`) → `STRIPE_WEBHOOK_SECRET`

#### Testing Stripe Locally

For local development, use the Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/payments/webhook

# Copy the webhook signing secret from the output
# Use it as STRIPE_WEBHOOK_SECRET in backend/.env
```

### OpenAI (Optional)

1. Create an account at [platform.openai.com](https://platform.openai.com)
2. Go to **API Keys** section
3. Click **Create new secret key**
4. Copy the key → `VITE_OPENAI_API_KEY`

### Google Gemini (Optional)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click **Create API Key**
3. Copy the key → `GEMINI_API_KEY`

---

## CORS Configuration

The backend `CORS_ORIGIN` variable must include all frontend origins that need to access the API.

### Development

```env
CORS_ORIGIN=http://localhost:5174,http://localhost:5173,http://localhost:8080,http://localhost:3010
```

- `http://localhost:5174` - User Website
- `http://localhost:5173` - Dentist Portal
- `http://localhost:8080` - Legacy User Website port
- `http://localhost:3010` - Legacy Admin port

### Production

```env
CORS_ORIGIN=https://yourdomain.com,https://dentist.yourdomain.com,https://admin.yourdomain.com
```

Replace with your actual production domains.

---

## Payment Amount Configuration

The `DEFAULT_APPOINTMENT_AMOUNT` is specified in **cents** (smallest currency unit).

### Examples

| Amount | Cents | Configuration |
|--------|-------|---------------|
| $10.00 | 1000 | `DEFAULT_APPOINTMENT_AMOUNT=1000` |
| $25.00 | 2500 | `DEFAULT_APPOINTMENT_AMOUNT=2500` |
| $50.00 | 5000 | `DEFAULT_APPOINTMENT_AMOUNT=5000` |
| $100.00 | 10000 | `DEFAULT_APPOINTMENT_AMOUNT=10000` |

### Dynamic Pricing

The default amount can be overridden when creating a checkout session from the frontend. This allows for:
- Different pricing for different services
- Promotional pricing
- Custom appointment fees

---

## Security Best Practices

### Development vs Production

- **Development**: Use test keys (prefix: `pk_test_`, `sk_test_`)
- **Production**: Use live keys (prefix: `pk_live_`, `sk_live_`)

### Secret Management

1. **Never commit `.env` files** to version control
2. Use `.env.example` files as templates
3. Store production secrets in secure secret management systems:
   - AWS Secrets Manager
   - Azure Key Vault
   - HashiCorp Vault
   - Environment variables in hosting platform

### JWT Secret

Generate a strong random secret for production:

```bash
# Generate a random 64-character secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Rotate Keys Regularly

- Rotate API keys every 90 days
- Rotate JWT secrets when team members leave
- Monitor API key usage for suspicious activity

---

## Troubleshooting

### Common Issues

#### 1. CORS Errors

**Error**: `Access to fetch at 'http://localhost:3000/api/...' from origin 'http://localhost:5174' has been blocked by CORS policy`

**Solution**: Ensure `CORS_ORIGIN` in backend/.env includes the frontend origin:
```env
CORS_ORIGIN=http://localhost:5174,http://localhost:5173
```

#### 2. Stripe Webhook Signature Verification Failed

**Error**: `Webhook signature verification failed`

**Solution**: 
- Ensure `STRIPE_WEBHOOK_SECRET` matches the webhook signing secret from Stripe Dashboard
- For local testing, use Stripe CLI and copy the webhook secret from its output

#### 3. Payment Redirect Not Working

**Error**: User not redirected after payment

**Solution**: 
- Verify `STRIPE_SUCCESS_URL` and `STRIPE_CANCEL_URL` are correct
- Ensure URLs include `{CHECKOUT_SESSION_ID}` placeholder in success URL
- Check that frontend routes exist for these URLs

#### 4. API Connection Failed

**Error**: `Network Error` or `Failed to fetch`

**Solution**:
- Verify `VITE_API_URL` points to the correct backend URL
- Ensure backend server is running on the specified port
- Check firewall/network settings

---

## Environment-Specific Configuration

### Development

```env
NODE_ENV=development
VITE_API_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe CLI)
LOG_LEVEL=debug
```

### Staging

```env
NODE_ENV=staging
VITE_API_URL=https://api-staging.yourdomain.com
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
LOG_LEVEL=info
```

### Production

```env
NODE_ENV=production
VITE_API_URL=https://api.yourdomain.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
LOG_LEVEL=warn
```

---

## Quick Setup Checklist

### Initial Setup
- [ ] Copy `.env.example` to `.env` in root directory (User Website)
- [ ] Copy `backend/.env.example` to `backend/.env`
- [ ] Copy `dentist-portal/.env.example` to `dentist-portal/.env`
- [ ] Copy `admin-app/.env.example` to `admin-app/.env`

### Supabase Configuration (REQUIRED)
- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Copy `VITE_SUPABASE_URL` to all four `.env` files
- [ ] Copy `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_ANON_KEY` to all four `.env` files
- [ ] Copy `SUPABASE_SERVICE_ROLE_KEY` to `backend/.env` only
- [ ] Verify database tables exist (appointments, dentists, user_roles)

### Payment Configuration (REQUIRED for bookings)
- [ ] Create Stripe account and add API keys
- [ ] Add `VITE_STRIPE_PUBLISHABLE_KEY` to User Website `.env`
- [ ] Add `STRIPE_SECRET_KEY` to `backend/.env`
- [ ] Set up Stripe webhook endpoint
- [ ] Add `STRIPE_WEBHOOK_SECRET` to `backend/.env`
- [ ] Configure payment amount and currency in `backend/.env`

### Security & CORS
- [ ] Configure CORS origins for all frontends in `backend/.env`
- [ ] Generate strong JWT secret for production
- [ ] Verify RLS policies are enabled in Supabase

### Testing
- [ ] Start all applications and verify they connect to Supabase
- [ ] Test user authentication (login/signup)
- [ ] Test dentist profile loading
- [ ] Test appointment booking flow
- [ ] Test payment flow end-to-end
- [ ] Verify webhook events are received
- [ ] Test CORS from all frontend applications
- [ ] Check browser console for any connection errors

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Express CORS Documentation](https://expressjs.com/en/resources/middleware/cors.html)

---

## Support

For issues or questions:
1. Check this documentation first
2. Review application logs in `backend/logs/`
3. Check Stripe Dashboard for payment events
4. Review Supabase logs for database issues
5. Contact the development team

---

**Last Updated**: October 25, 2025
