# Edge Functions Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the chatbot booking system edge functions to Supabase. Follow these instructions carefully to ensure successful deployment.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Deploying Edge Functions](#deploying-edge-functions)
4. [Configuring Environment Variables](#configuring-environment-variables)
5. [Testing Deployed Functions](#testing-deployed-functions)
6. [Troubleshooting](#troubleshooting)
7. [Monitoring and Logs](#monitoring-and-logs)
8. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Tools

Before deploying, ensure you have:

✅ **Supabase CLI** installed
```bash
# Install via npm
npm install -g supabase

# Or via Homebrew (macOS)
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

✅ **Supabase Account** with project created
- Sign up at https://supabase.com
- Create a new project or use existing one
- Note your project reference ID

✅ **Git** installed and repository cloned
```bash
git clone <your-repository-url>
cd <your-project-directory>
```

✅ **Access Credentials**
- Supabase project URL
- Supabase service role key
- API keys for AI services (Gemini)

---

## Environment Setup

### 1. Login to Supabase CLI

```bash
# Login to Supabase
supabase login

# This will open a browser window for authentication
# Follow the prompts to authenticate
```

### 2. Link Your Project

```bash
# Link to your Supabase project
supabase link --project-ref <your-project-ref>

# Example:
# supabase link --project-ref abcdefghijklmnop
```

To find your project reference:
1. Go to Supabase Dashboard
2. Select your project
3. Go to Settings → General
4. Copy "Reference ID"

### 3. Verify Project Structure

Ensure your project has the correct structure:

```
your-project/
├── supabase/
│   ├── functions/
│   │   ├── chat-bot/
│   │   │   └── index.ts
│   │   ├── generate-booking-summary/
│   │   │   └── index.ts
│   │   ├── generate-appointment-excel/
│   │   │   └── index.ts
│   │   └── _shared/
│   │       ├── security.ts
│   │       ├── documentCache.ts
│   │       ├── documentOptimization.ts
│   │       └── jobQueue.ts
│   └── config.toml
```

---

## Deploying Edge Functions

### Deploy All Functions

To deploy all edge functions at once:

```bash
# Navigate to project root
cd <your-project-directory>

# Deploy all functions
supabase functions deploy
```

### Deploy Individual Functions

To deploy specific functions:

#### 1. Deploy chat-bot Function

```bash
supabase functions deploy chat-bot
```

Expected output:
```
Deploying chat-bot (project ref: abcdefghijklmnop)
Bundling chat-bot
Deploying chat-bot (100%)
Deployed chat-bot to https://abcdefghijklmnop.supabase.co/functions/v1/chat-bot
```

#### 2. Deploy generate-booking-summary Function

```bash
supabase functions deploy generate-booking-summary
```

Expected output:
```
Deploying generate-booking-summary (project ref: abcdefghijklmnop)
Bundling generate-booking-summary
Deploying generate-booking-summary (100%)
Deployed generate-booking-summary to https://abcdefghijklmnop.supabase.co/functions/v1/generate-booking-summary
```

#### 3. Deploy generate-appointment-excel Function

```bash
supabase functions deploy generate-appointment-excel
```

Expected output:
```
Deploying generate-appointment-excel (project ref: abcdefghijklmnop)
Bundling generate-appointment-excel
Deploying generate-appointment-excel (100%)
Deployed generate-appointment-excel to https://abcdefghijklmnop.supabase.co/functions/v1/generate-appointment-excel
```

### Verify Deployment

Check deployed functions:

```bash
supabase functions list
```

Expected output:
```
┌─────────────────────────────┬─────────┬──────────────────────┐
│ NAME                        │ VERSION │ CREATED AT           │
├─────────────────────────────┼─────────┼──────────────────────┤
│ chat-bot                    │ 1       │ 2025-10-25 14:30:00  │
│ generate-booking-summary    │ 1       │ 2025-10-25 14:31:00  │
│ generate-appointment-excel  │ 1       │ 2025-10-25 14:32:00  │
└─────────────────────────────┴─────────┴──────────────────────┘
```

---

## Configuring Environment Variables

### Required Environment Variables

Each edge function requires specific environment variables. Set them in the Supabase Dashboard.

### Setting Environment Variables

#### Via Supabase Dashboard

1. Go to Supabase Dashboard
2. Select your project
3. Navigate to **Settings** → **Edge Functions**
4. Click **"Add Secret"**
5. Add each variable below

#### Required Variables

##### For All Functions

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

##### For chat-bot Function

```bash
GEMINI_API_KEY=your-gemini-api-key
```

**How to get Gemini API Key:**
1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy the key
4. Add to Supabase secrets

##### Optional Variables

```bash
# For enhanced logging
LOG_LEVEL=info

# For rate limiting customization
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

#### Via Supabase CLI

Alternatively, set secrets via CLI:

```bash
# Set individual secret
supabase secrets set GEMINI_API_KEY=your-api-key

# Set multiple secrets from file
echo "GEMINI_API_KEY=your-api-key" > .env.secrets
supabase secrets set --env-file .env.secrets

# List all secrets (values are hidden)
supabase secrets list
```

### Verify Environment Variables

After setting variables, verify they're configured:

```bash
supabase secrets list
```

Expected output:
```
┌──────────────────────────────┬────────────────────┐
│ NAME                         │ DIGEST             │
├──────────────────────────────┼────────────────────┤
│ SUPABASE_URL                 │ abc123...          │
│ SUPABASE_SERVICE_ROLE_KEY    │ def456...          │
│ SUPABASE_ANON_KEY            │ ghi789...          │
│ GEMINI_API_KEY               │ jkl012...          │
└──────────────────────────────┴────────────────────┘
```

---

## Testing Deployed Functions

### 1. Test chat-bot Function

#### Using curl

```bash
# Get your JWT token first (from Supabase Auth)
TOKEN="your-jwt-token"

# Test chat-bot
curl -X POST \
  https://your-project-ref.supabase.co/functions/v1/chat-bot \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "I want to book an appointment"
      }
    ],
    "dentistId": "123e4567-e89b-12d3-a456-426614174000",
    "dentistName": "Dr. Test"
  }'
```

Expected response:
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Hello! I'll help you book an appointment..."
    }
  }],
  "conversationId": "uuid-here",
  "conversationState": {...}
}
```

#### Using Supabase Dashboard

1. Go to **Edge Functions** in dashboard
2. Select **chat-bot**
3. Click **"Invoke Function"**
4. Enter test payload
5. Click **"Send Request"**
6. View response

### 2. Test generate-booking-summary Function

```bash
# Test generate-booking-summary
curl -X POST \
  https://your-project-ref.supabase.co/functions/v1/generate-booking-summary \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "existing-appointment-uuid",
    "generatePdf": true,
    "generateExcel": true
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {...},
  "pdfUrl": "https://storage.supabase.co/...",
  "excelUrl": "https://storage.supabase.co/..."
}
```

### 3. Test generate-appointment-excel Function

```bash
# Test generate-appointment-excel
curl -X POST \
  https://your-project-ref.supabase.co/functions/v1/generate-appointment-excel \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "existing-appointment-uuid"
  }'
```

### Automated Testing Script

Create a test script `test-functions.sh`:

```bash
#!/bin/bash

# Configuration
PROJECT_REF="your-project-ref"
TOKEN="your-jwt-token"
BASE_URL="https://$PROJECT_REF.supabase.co/functions/v1"

echo "Testing Edge Functions..."

# Test chat-bot
echo "1. Testing chat-bot..."
RESPONSE=$(curl -s -X POST "$BASE_URL/chat-bot" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}],"dentistId":"test-id","dentistName":"Test"}')

if echo "$RESPONSE" | grep -q "conversationId"; then
  echo "✅ chat-bot: PASSED"
else
  echo "❌ chat-bot: FAILED"
  echo "$RESPONSE"
fi

# Test generate-booking-summary
echo "2. Testing generate-booking-summary..."
# Add test for generate-booking-summary

# Test generate-appointment-excel
echo "3. Testing generate-appointment-excel..."
# Add test for generate-appointment-excel

echo "Testing complete!"
```

Run the script:
```bash
chmod +x test-functions.sh
./test-functions.sh
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Deployment Fails

**Error:**
```
Error: Failed to deploy function
```

**Solutions:**
1. Check Supabase CLI is up to date:
   ```bash
   supabase --version
   npm update -g supabase
   ```

2. Verify project is linked:
   ```bash
   supabase link --project-ref <your-ref>
   ```

3. Check for syntax errors in function code:
   ```bash
   deno check supabase/functions/chat-bot/index.ts
   ```

#### Issue 2: Function Returns 500 Error

**Error:**
```json
{
  "error": "Internal Server Error"
}
```

**Solutions:**
1. Check function logs:
   ```bash
   supabase functions logs chat-bot
   ```

2. Verify environment variables are set:
   ```bash
   supabase secrets list
   ```

3. Check for missing dependencies

#### Issue 3: CORS Errors

**Error:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solutions:**
1. Verify CORS headers in function code:
   ```typescript
   const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
   };
   ```

2. Handle OPTIONS requests:
   ```typescript
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
   ```

#### Issue 4: Authentication Errors

**Error:**
```json
{
  "error": "Authentication required"
}
```

**Solutions:**
1. Verify JWT token is valid
2. Check token is included in Authorization header
3. Ensure token hasn't expired
4. Verify RLS policies allow access

#### Issue 5: Missing Environment Variables

**Error:**
```
GEMINI_API_KEY is not configured
```

**Solutions:**
1. Set the missing variable:
   ```bash
   supabase secrets set GEMINI_API_KEY=your-key
   ```

2. Redeploy the function:
   ```bash
   supabase functions deploy chat-bot
   ```

### Getting Help

**Check Logs:**
```bash
# View recent logs
supabase functions logs chat-bot

# Follow logs in real-time
supabase functions logs chat-bot --follow

# Filter by error level
supabase functions logs chat-bot --level error
```

**Supabase Support:**
- Documentation: https://supabase.com/docs
- Discord: https://discord.supabase.com
- GitHub Issues: https://github.com/supabase/supabase

---

## Monitoring and Logs

### Viewing Logs

#### Via Supabase Dashboard

1. Go to **Edge Functions** in dashboard
2. Select function
3. Click **"Logs"** tab
4. View real-time logs

#### Via CLI

```bash
# View logs for specific function
supabase functions logs chat-bot

# Follow logs in real-time
supabase functions logs chat-bot --follow

# View last 100 lines
supabase functions logs chat-bot --tail 100

# Filter by time
supabase functions logs chat-bot --since 1h
```

### Log Levels

Functions log at different levels:
- **INFO**: General information
- **WARN**: Warnings
- **ERROR**: Errors
- **DEBUG**: Detailed debugging info

### Monitoring Metrics

Track function performance:
- **Invocations**: Number of function calls
- **Errors**: Error rate
- **Duration**: Average execution time
- **Memory**: Memory usage

Access metrics in Supabase Dashboard:
1. Go to **Edge Functions**
2. Select function
3. Click **"Metrics"** tab

---

## Rollback Procedures

### Rolling Back to Previous Version

If a deployment causes issues:

#### 1. List Function Versions

```bash
supabase functions list --show-versions
```

#### 2. Rollback to Specific Version

```bash
# Rollback to previous version
supabase functions rollback chat-bot --version 1
```

#### 3. Verify Rollback

```bash
# Check current version
supabase functions list

# Test function
curl -X POST https://your-project-ref.supabase.co/functions/v1/chat-bot \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Emergency Rollback

If you need to quickly disable a function:

```bash
# Delete function (can be redeployed later)
supabase functions delete chat-bot

# Confirm deletion
# Type function name to confirm
```

To restore:
```bash
# Redeploy from code
supabase functions deploy chat-bot
```

---

## Deployment Checklist

Use this checklist for each deployment:

### Pre-Deployment

- [ ] Code reviewed and tested locally
- [ ] All tests passing
- [ ] Environment variables documented
- [ ] Dependencies up to date
- [ ] CORS headers configured
- [ ] Error handling implemented
- [ ] Logging added

### Deployment

- [ ] Supabase CLI installed and updated
- [ ] Project linked correctly
- [ ] Environment variables set
- [ ] Functions deployed successfully
- [ ] Deployment verified in dashboard

### Post-Deployment

- [ ] Functions tested with curl/Postman
- [ ] Logs checked for errors
- [ ] Metrics monitored
- [ ] Frontend integration tested
- [ ] Documentation updated
- [ ] Team notified

### Rollback Plan

- [ ] Previous version noted
- [ ] Rollback procedure documented
- [ ] Emergency contacts identified
- [ ] Monitoring alerts configured

---

## Best Practices

### Development Workflow

1. **Local Development**
   ```bash
   # Run functions locally
   supabase functions serve chat-bot
   ```

2. **Testing**
   ```bash
   # Test locally before deploying
   curl http://localhost:54321/functions/v1/chat-bot \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"test": true}'
   ```

3. **Staging Deployment**
   - Deploy to staging project first
   - Test thoroughly
   - Then deploy to production

4. **Production Deployment**
   - Deploy during low-traffic periods
   - Monitor logs closely
   - Have rollback plan ready

### Security Best Practices

✅ **Never commit secrets to Git**
```bash
# Add to .gitignore
echo ".env.secrets" >> .gitignore
```

✅ **Rotate API keys regularly**
```bash
# Update secrets
supabase secrets set GEMINI_API_KEY=new-key
```

✅ **Use service role key only in edge functions**
- Never expose service role key to frontend
- Use anon key for client-side requests

✅ **Implement rate limiting**
- Protect against abuse
- Configure appropriate limits

### Performance Optimization

✅ **Minimize cold starts**
- Keep functions warm with periodic pings
- Optimize import statements

✅ **Cache when possible**
- Use shared modules for common code
- Implement caching strategies

✅ **Monitor performance**
- Track execution time
- Optimize slow functions

---

## Conclusion

You've successfully deployed the chatbot booking system edge functions! 

**Key Points:**
- ✅ All functions deployed
- ✅ Environment variables configured
- ✅ Functions tested and verified
- ✅ Monitoring and logs set up
- ✅ Rollback procedures documented

**Next Steps:**
1. Integrate functions with frontend
2. Monitor performance and logs
3. Gather user feedback
4. Iterate and improve

**Need Help?**
- Check logs for errors
- Review troubleshooting section
- Contact Supabase support
- Consult API documentation

---

*Last Updated: October 25, 2025*
*Version: 1.0.0*
