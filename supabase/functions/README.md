# Edge Functions - Chatbot Booking System

## Overview

This directory contains Supabase Edge Functions for the AI-powered chatbot booking system. These serverless functions handle conversational booking, document generation, and appointment management.

## Functions

### 1. chat-bot
**Purpose:** AI-powered conversational interface for booking appointments

**Features:**
- Natural language conversation using Google Gemini AI
- Step-by-step booking flow
- Symptom collection and uncertainty detection
- Document upload support
- Time slot selection
- Booking confirmation

**Endpoint:** `/functions/v1/chat-bot`

**Documentation:** See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md#1-chat-bot)

### 2. generate-booking-summary
**Purpose:** Generate PDF and Excel documents for appointment summaries

**Features:**
- Professional PDF booking summaries
- Excel appointment sheets
- Patient information compilation
- Document references
- Uncertainty note highlighting

**Endpoint:** `/functions/v1/generate-booking-summary`

**Documentation:** See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md#2-generate-booking-summary)

### 3. generate-appointment-excel
**Purpose:** Legacy CSV generation for appointments

**Features:**
- Simple CSV export
- Basic appointment data
- Email attachment support

**Endpoint:** `/functions/v1/generate-appointment-excel`

**Documentation:** See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md#3-generate-appointment-excel)

## Shared Modules

### _shared/security.ts
Common security utilities:
- JWT verification
- Rate limiting
- Input sanitization
- CORS handling
- Error responses
- Request logging

### _shared/documentCache.ts
Document caching utilities:
- Cache management
- TTL handling
- Memory optimization

### _shared/documentOptimization.ts
Document optimization utilities:
- File compression
- Image optimization
- PDF optimization

### _shared/jobQueue.ts
Background job queue:
- Async task processing
- Retry logic
- Job scheduling

## Quick Start

### Prerequisites

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```

3. **Link your project:**
   ```bash
   supabase link --project-ref <your-project-ref>
   ```

### Local Development

Run functions locally:

```bash
# Start all functions
supabase functions serve

# Start specific function
supabase functions serve chat-bot

# With environment variables
supabase functions serve --env-file .env.local
```

Test locally:

```bash
curl http://localhost:54321/functions/v1/chat-bot \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```

### Deployment

#### Using Deployment Script (Recommended)

**Linux/Mac:**
```bash
chmod +x scripts/deploy-edge-functions.sh
./scripts/deploy-edge-functions.sh
```

**Windows:**
```cmd
scripts\deploy-edge-functions.bat
```

#### Manual Deployment

Deploy all functions:
```bash
supabase functions deploy
```

Deploy specific function:
```bash
supabase functions deploy chat-bot
supabase functions deploy generate-booking-summary
supabase functions deploy generate-appointment-excel
```

### Environment Variables

Set required secrets:

```bash
# Required for all functions
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set SUPABASE_ANON_KEY=your-anon-key

# Required for chat-bot
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

List secrets:
```bash
supabase secrets list
```

## Testing

### Unit Tests

Run tests locally:
```bash
deno test --allow-all
```

### Integration Tests

Test deployed functions:

```bash
# Test chat-bot
curl -X POST https://your-project.supabase.co/functions/v1/chat-bot \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"I want to book"}],"dentistId":"uuid","dentistName":"Dr. Test"}'

# Test generate-booking-summary
curl -X POST https://your-project.supabase.co/functions/v1/generate-booking-summary \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"appointmentId":"uuid","generatePdf":true}'
```

## Monitoring

### View Logs

```bash
# View recent logs
supabase functions logs chat-bot

# Follow logs in real-time
supabase functions logs chat-bot --follow

# Filter by error level
supabase functions logs chat-bot --level error
```

### Metrics

View metrics in Supabase Dashboard:
1. Go to Edge Functions
2. Select function
3. Click "Metrics" tab

## Troubleshooting

### Common Issues

**Function returns 500 error:**
- Check logs: `supabase functions logs <function-name>`
- Verify environment variables are set
- Check for missing dependencies

**CORS errors:**
- Verify CORS headers in function code
- Ensure OPTIONS requests are handled

**Authentication errors:**
- Verify JWT token is valid
- Check RLS policies
- Ensure correct authorization header

**Rate limit exceeded:**
- Wait for rate limit window to reset
- Adjust rate limits if needed
- Implement request queuing

### Getting Help

- **Documentation:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Deployment Guide:** [../../docs/EDGE_FUNCTIONS_DEPLOYMENT_GUIDE.md](../../docs/EDGE_FUNCTIONS_DEPLOYMENT_GUIDE.md)
- **Supabase Docs:** https://supabase.com/docs/guides/functions
- **Discord:** https://discord.supabase.com

## Development Guidelines

### Code Style

- Use TypeScript for type safety
- Follow Deno conventions
- Add JSDoc comments for functions
- Handle errors gracefully
- Log important events

### Security

- ✅ Always verify JWT tokens
- ✅ Sanitize all inputs
- ✅ Use parameterized queries
- ✅ Implement rate limiting
- ✅ Never expose secrets
- ✅ Follow principle of least privilege

### Performance

- ✅ Minimize cold starts
- ✅ Use shared modules efficiently
- ✅ Implement caching where appropriate
- ✅ Optimize database queries
- ✅ Monitor execution time

### Testing

- ✅ Write unit tests for utilities
- ✅ Test error handling
- ✅ Test edge cases
- ✅ Verify security measures
- ✅ Load test before production

## Architecture

```
supabase/functions/
├── chat-bot/
│   └── index.ts              # Main chatbot logic
├── generate-booking-summary/
│   └── index.ts              # PDF/Excel generation
├── generate-appointment-excel/
│   └── index.ts              # Legacy CSV generation
└── _shared/
    ├── security.ts           # Security utilities
    ├── documentCache.ts      # Caching utilities
    ├── documentOptimization.ts # Optimization utilities
    └── jobQueue.ts           # Job queue utilities
```

## API Versioning

Current version: **v1**

Endpoints follow the pattern:
```
https://<project-ref>.supabase.co/functions/v1/<function-name>
```

## Rate Limits

| Function | Limit | Window |
|----------|-------|--------|
| chat-bot | 100 requests | 1 minute |
| generate-booking-summary | 20 requests | 1 minute |
| generate-appointment-excel | 20 requests | 1 minute |

## Dependencies

### Runtime
- Deno (provided by Supabase)
- Supabase JS Client
- Google Gemini AI API

### Libraries
- jsPDF (PDF generation)
- ExcelJS (Excel generation)
- Standard Deno modules

## Contributing

### Adding a New Function

1. Create function directory:
   ```bash
   mkdir supabase/functions/my-function
   ```

2. Create index.ts:
   ```typescript
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
   
   serve(async (req) => {
     // Your function logic
   });
   ```

3. Test locally:
   ```bash
   supabase functions serve my-function
   ```

4. Deploy:
   ```bash
   supabase functions deploy my-function
   ```

### Updating Existing Functions

1. Make changes to function code
2. Test locally
3. Deploy to staging first
4. Test in staging
5. Deploy to production
6. Monitor logs

## License

See project LICENSE file.

## Support

For issues or questions:
- Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- Review [EDGE_FUNCTIONS_DEPLOYMENT_GUIDE.md](../../docs/EDGE_FUNCTIONS_DEPLOYMENT_GUIDE.md)
- Contact support team

---

*Last Updated: October 25, 2025*
*Version: 1.0.0*
