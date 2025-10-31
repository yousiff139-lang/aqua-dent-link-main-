# Edge Functions Security Documentation

This document describes the security measures implemented in the Supabase Edge Functions for the chatbot booking system.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Rate Limiting](#rate-limiting)
3. [Input Sanitization](#input-sanitization)
4. [CORS Configuration](#cors-configuration)
5. [Error Handling](#error-handling)
6. [Logging & Monitoring](#logging--monitoring)
7. [Best Practices](#best-practices)

## Authentication & Authorization

### JWT Verification

All edge functions verify JWT tokens before processing requests:

```typescript
const user = await verifyJWT(req, supabase);
```

**Features:**
- Validates Bearer token format
- Verifies token with Supabase Auth
- Extracts user information (id, email, role)
- Returns 401 for invalid/missing tokens

### Role-Based Access Control

Functions can verify user roles:

```typescript
const isAdmin = await verifyUserRole(supabase, userId, 'admin');
const isDentist = await verifyUserRole(supabase, userId, 'dentist');
```

**Supported Roles:**
- `admin` - Full system access
- `dentist` - Access to their appointments and patient data
- `patient` - Access to their own data only

### Row Level Security (RLS)

Database tables enforce RLS policies:

- **chatbot_conversations**: Users can only access their own conversations
- **time_slot_reservations**: Users can only manage their own reservations
- **dentist_availability**: Public read, dentist write
- **appointment_documents**: Access based on appointment ownership

## Rate Limiting

### Configuration

Rate limits are enforced per user/IP:

| Function | Max Requests | Window |
|----------|-------------|--------|
| chat-bot | 100 | 1 minute |
| generate-booking-summary | 20 | 1 minute |
| Other functions | 60 | 1 minute |

### Implementation

```typescript
const rateLimitCheck = checkRateLimit(getClientIdentifier(req, user.id), {
  maxRequests: 100,
  windowMs: 60000
});

if (rateLimitCheck.limited) {
  return createRateLimitResponse(rateLimitCheck.resetTime);
}
```

### Response Headers

Rate limit responses include:
- `Retry-After`: Seconds until reset
- `X-RateLimit-Reset`: ISO timestamp of reset time
- HTTP 429 status code

## Input Sanitization

### String Sanitization

All string inputs are sanitized to prevent XSS and injection attacks:

```typescript
const sanitized = sanitizeString(userInput);
```

**Protections:**
- Removes `<` and `>` characters
- Strips `javascript:` protocol
- Removes event handlers (`onclick=`, etc.)
- Limits string length to 10,000 characters

### Object Sanitization

Entire request bodies are sanitized:

```typescript
const sanitizedBody = sanitizeObject(rawBody);
```

### Validation Functions

- `isValidUUID(uuid)` - Validates UUID format
- `isValidEmail(email)` - Validates email format
- `isValidPhoneNumber(phone)` - Validates phone number format

### Required Fields

Functions validate required fields:

```typescript
validateRequiredFields(body, ['appointmentId', 'dentistId']);
```

## CORS Configuration

### Headers

Standard CORS headers are applied to all responses:

```typescript
{
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400'
}
```

### Preflight Requests

OPTIONS requests are handled automatically:

```typescript
if (req.method === 'OPTIONS') {
  return handleCorsPreflightRequest();
}
```

## Error Handling

### Standardized Error Responses

All errors return consistent format:

```json
{
  "error": "ErrorName",
  "message": "User-friendly error message",
  "timestamp": "2025-10-25T14:30:00.000Z",
  "requestId": "uuid-here"
}
```

### Status Codes

- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### Error Logging

Errors are logged with context:

```typescript
logError(error, { userId, requestId, function: 'chat-bot' });
```

**Note:** Stack traces are only included in development environment.

## Logging & Monitoring

### Request Logging

All requests are logged with:
- Timestamp
- HTTP method and URL
- User ID
- IP address
- User agent
- Request ID

### Audit Logging

Sensitive operations are logged to `security_audit_log` table:
- User ID
- Action (INSERT, UPDATE, DELETE)
- Table name
- Record ID
- Old and new data (JSONB)
- Timestamp

### Document Access Logging

Document access is tracked in `document_access_log` table:
- User ID
- Document name and type
- Appointment ID
- Access type (view, download, upload, delete)
- IP address and user agent
- Timestamp

## Best Practices

### 1. Always Verify Authentication

```typescript
const user = await verifyJWT(req, supabase);
```

### 2. Check Rate Limits Early

```typescript
const rateLimitCheck = checkRateLimit(getClientIdentifier(req, user.id));
if (rateLimitCheck.limited) {
  return createRateLimitResponse(rateLimitCheck.resetTime);
}
```

### 3. Sanitize All Inputs

```typescript
const sanitizedBody = sanitizeObject(await validateRequestBody(req));
```

### 4. Validate Required Fields

```typescript
validateRequiredFields(body, ['field1', 'field2']);
```

### 5. Use Proper Error Responses

```typescript
return createErrorResponse(error, 400, requestId);
```

### 6. Log Important Operations

```typescript
logRequest(req, user.id, { requestId, function: 'function-name' });
logError(error, { userId, requestId });
```

### 7. Implement Role Checks

```typescript
const hasAccess = await verifyUserRole(supabase, userId, 'dentist');
if (!hasAccess) {
  throw new Error('Insufficient permissions');
}
```

### 8. Use Signed URLs for Documents

```typescript
const { signedUrl } = await generateSignedDocumentUrl(path, appointmentId, 3600);
```

### 9. Validate UUIDs

```typescript
if (!isValidUUID(appointmentId)) {
  throw new Error('Invalid appointmentId format');
}
```

### 10. Handle CORS Properly

```typescript
if (req.method === 'OPTIONS') {
  return handleCorsPreflightRequest();
}
```

## Security Checklist

Before deploying an edge function, ensure:

- [ ] JWT verification is implemented
- [ ] Rate limiting is configured
- [ ] Input sanitization is applied
- [ ] Required fields are validated
- [ ] UUIDs are validated
- [ ] CORS headers are set
- [ ] Error responses are standardized
- [ ] Request logging is enabled
- [ ] Sensitive operations are audited
- [ ] Role-based access is enforced (if applicable)
- [ ] Document access uses signed URLs (if applicable)

## Environment Variables

Required environment variables:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `GEMINI_API_KEY` - API key for AI service (chat-bot function)
- `ENVIRONMENT` - Set to 'production' or 'development'

## Testing Security

### Test Authentication

```bash
# Missing token
curl -X POST https://your-project.supabase.co/functions/v1/chat-bot

# Invalid token
curl -X POST https://your-project.supabase.co/functions/v1/chat-bot \
  -H "Authorization: Bearer invalid-token"

# Valid token
curl -X POST https://your-project.supabase.co/functions/v1/chat-bot \
  -H "Authorization: Bearer your-valid-token" \
  -H "Content-Type: application/json" \
  -d '{"messages": []}'
```

### Test Rate Limiting

```bash
# Send 101 requests in quick succession
for i in {1..101}; do
  curl -X POST https://your-project.supabase.co/functions/v1/chat-bot \
    -H "Authorization: Bearer your-token" \
    -H "Content-Type: application/json" \
    -d '{"messages": []}'
done
```

### Test Input Validation

```bash
# Missing required field
curl -X POST https://your-project.supabase.co/functions/v1/generate-booking-summary \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{}'

# Invalid UUID
curl -X POST https://your-project.supabase.co/functions/v1/generate-booking-summary \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"appointmentId": "not-a-uuid"}'
```

## Incident Response

If a security issue is detected:

1. **Immediate Actions:**
   - Review `security_audit_log` table
   - Check `document_access_log` for unauthorized access
   - Review edge function logs in Supabase dashboard

2. **Investigation:**
   - Identify affected users and data
   - Determine attack vector
   - Assess scope of breach

3. **Mitigation:**
   - Revoke compromised tokens
   - Update rate limits if needed
   - Apply additional RLS policies
   - Deploy security patches

4. **Prevention:**
   - Update security policies
   - Enhance monitoring
   - Conduct security audit
   - Update documentation

## Contact

For security concerns, contact the development team or file a security issue in the project repository.
