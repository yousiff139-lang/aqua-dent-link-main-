# API Request/Response Logging Implementation

## Overview

This document describes the implementation of comprehensive API request/response logging for the backend application, as specified in Task 21 of the appointment booking and payment system.

## Implementation Summary

### 1. Request Logging Middleware (`src/middleware/request-logger.ts`)

Created three middleware functions to handle logging:

#### a. `requestIdMiddleware`
- Generates a unique UUID for each incoming request using Node's `crypto.randomUUID()`
- Attaches the request ID to `req.requestId` for use throughout the request lifecycle
- Adds `X-Request-ID` header to responses for client-side tracing
- Enables end-to-end request tracing across distributed systems

#### b. `requestLoggerMiddleware`
- Logs all incoming requests with:
  - Request ID
  - HTTP method (GET, POST, PUT, DELETE, etc.)
  - Full path including query parameters
  - Query parameters object
  - Client IP address
  - User agent string
  - User ID (if authenticated)
  - Timestamp

- Logs all outgoing responses with:
  - Request ID (matching the incoming request)
  - HTTP method
  - Path
  - Status code (200, 201, 400, 500, etc.)
  - Duration in milliseconds
  - User ID (if authenticated)
  - Timestamp

#### c. `userIdExtractorMiddleware`
- Extracts user ID from authenticated requests
- Works with the existing authentication middleware
- Attaches user ID to `req.userId` for easy access in logging
- Handles both Supabase and custom JWT authentication

### 2. Enhanced Logger Configuration (`src/config/logger.ts`)

Updated the Winston logger configuration to:

- **Capture full stack traces**: Added proper error formatting with `winston.format.errors({ stack: true })`
- **Improved console output**: Enhanced development console format to display stack traces
- **Structured logging**: Maintains JSON format for production logs
- **Metadata filtering**: Filters out service name from console output for cleaner logs

### 3. Enhanced Error Handler (`src/middleware/error-handler.ts`)

Updated error logging to include:

- **Request ID**: For tracing errors back to specific requests
- **User ID**: For identifying which user encountered the error
- **Full context**: Request body, query parameters, and params
- **Stack traces**: Complete error stack traces for debugging

All three error types now include enhanced logging:
- Application errors (AppError)
- Validation errors (Zod)
- Unexpected errors

### 4. Application Integration (`src/app.ts`)

Integrated the logging middleware in the correct order:

1. CORS and body parsing
2. **Request ID middleware** - First to ensure all logs have request IDs
3. **Request logger middleware** - Logs all requests/responses
4. **User ID extractor middleware** - Extracts user info for logging
5. Rate limiting
6. API routes
7. Error handlers

## Features Implemented

✅ **Request ID for tracing**: Every request gets a unique UUID
✅ **Request logging**: All API requests logged with timestamp, method, path, user ID
✅ **Response logging**: All API responses logged with status code and duration
✅ **Error logging**: Errors logged with full stack traces
✅ **Winston logger**: Using structured logging with Winston
✅ **User ID tracking**: User IDs extracted and logged for authenticated requests

## Log Examples

### Incoming Request Log
```json
{
  "level": "info",
  "message": "Incoming request",
  "timestamp": "2025-10-24 10:30:45",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "method": "POST",
  "path": "/api/appointments",
  "query": {},
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "userId": "user-123",
  "service": "realtime-sync-backend"
}
```

### Outgoing Response Log
```json
{
  "level": "info",
  "message": "Outgoing response",
  "timestamp": "2025-10-24 10:30:46",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "method": "POST",
  "path": "/api/appointments",
  "statusCode": 201,
  "duration": "145ms",
  "userId": "user-123",
  "service": "realtime-sync-backend"
}
```

### Error Log with Stack Trace
```json
{
  "level": "error",
  "message": "Unexpected error",
  "timestamp": "2025-10-24 10:30:46",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "user-123",
  "error": "Database connection failed",
  "stack": "Error: Database connection failed\n    at AppointmentsService.createAppointment (/app/src/services/appointments.service.ts:45:11)\n    at async /app/src/controllers/appointments.controller.ts:23:20",
  "path": "/api/appointments",
  "method": "POST",
  "body": {
    "patient_name": "John Doe",
    "patient_email": "john@example.com"
  },
  "query": {},
  "params": {},
  "service": "realtime-sync-backend"
}
```

## Benefits

1. **Debugging**: Request IDs enable tracing a single request through all logs
2. **Performance Monitoring**: Duration logging helps identify slow endpoints
3. **Security Auditing**: User IDs track who performed what actions
4. **Error Diagnosis**: Full stack traces with request context for troubleshooting
5. **Production Support**: Structured logs can be easily parsed and analyzed
6. **Client-Side Tracing**: X-Request-ID header allows clients to reference specific requests

## Configuration

### Environment Variables

- `LOG_LEVEL`: Controls logging verbosity (error, warn, info, debug)
- `NODE_ENV`: Determines log format (development = colorized console, production = JSON)

### Log Files (Production Only)

- `logs/error.log`: Error-level logs only
- `logs/combined.log`: All logs

Both files auto-rotate at 5MB, keeping the last 5 files.

## Testing

To verify the logging implementation:

1. Start the backend server: `npm run dev`
2. Make an API request to any endpoint
3. Check the console output for:
   - "Incoming request" log with request details
   - "Outgoing response" log with status and duration
   - Request ID in both logs matching
4. Make a request that causes an error
5. Verify error log includes full stack trace and request context

## Requirements Satisfied

This implementation satisfies all requirements from Task 21:

- ✅ Implement request logging middleware in backend
- ✅ Log all API requests with timestamp, method, path, user ID
- ✅ Log all API responses with status code and duration
- ✅ Log errors with full stack traces
- ✅ Use Winston logger for structured logging
- ✅ Add request ID for tracing
- ✅ Requirements: 13.5 (Error handling and user feedback)

## Future Enhancements

Potential improvements for future iterations:

1. **Log aggregation**: Send logs to external service (e.g., Datadog, Splunk)
2. **Performance metrics**: Track average response times per endpoint
3. **Alert system**: Trigger alerts for high error rates
4. **Request body logging**: Optionally log request bodies (with PII filtering)
5. **Response body logging**: Optionally log response bodies for debugging
6. **Correlation IDs**: Support distributed tracing across multiple services
