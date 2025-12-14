# Request Logging Middleware

## Overview

The request logging middleware provides comprehensive logging for all API requests and responses, including request IDs for tracing, user IDs for authentication tracking, and detailed error logging with stack traces.

## Features

1. **Request ID Generation**: Each request gets a unique UUID for tracing through the system
2. **Request Logging**: Logs all incoming requests with method, path, query params, IP, user agent, and user ID
3. **Response Logging**: Logs all outgoing responses with status code, duration, and request ID
4. **User ID Extraction**: Automatically extracts user ID from authenticated requests
5. **Error Logging**: Full stack traces for all errors with request context
6. **Structured Logging**: Uses Winston for structured JSON logging

## Middleware Components

### 1. requestIdMiddleware

Generates a unique UUID for each request and adds it to:
- `req.requestId` - Available throughout the request lifecycle
- `X-Request-ID` response header - Returned to clients for debugging

### 2. requestLoggerMiddleware

Logs incoming requests and outgoing responses with:
- Request ID
- HTTP method
- Path and query parameters
- User ID (if authenticated)
- IP address and user agent
- Response status code
- Request duration in milliseconds

### 3. userIdExtractorMiddleware

Extracts the user ID from authenticated requests (set by auth middleware) and adds it to `req.userId` for easy access in logging.

## Usage

The middleware is automatically applied to all routes in `app.ts`:

```typescript
// Add request ID to all requests
app.use(requestIdMiddleware);

// Log all requests and responses
app.use(requestLoggerMiddleware);

// Extract user ID from authenticated requests
app.use(userIdExtractorMiddleware);
```

## Log Format

### Request Log Example
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
  "userAgent": "Mozilla/5.0...",
  "userId": "user-123"
}
```

### Response Log Example
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
  "userId": "user-123"
}
```

### Error Log Example
```json
{
  "level": "error",
  "message": "Unexpected error",
  "timestamp": "2025-10-24 10:30:46",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "user-123",
  "error": "Database connection failed",
  "stack": "Error: Database connection failed\n    at ...",
  "path": "/api/appointments",
  "method": "POST",
  "body": {...},
  "query": {...},
  "params": {...}
}
```

## Benefits

1. **Debugging**: Request IDs allow tracing a single request through all logs
2. **Monitoring**: Track response times and error rates
3. **Security**: Log user actions for audit trails
4. **Performance**: Identify slow endpoints with duration logging
5. **Troubleshooting**: Full stack traces with request context for errors

## Configuration

Logging level can be configured via the `LOG_LEVEL` environment variable:
- `error`: Only errors
- `warn`: Warnings and errors
- `info`: Info, warnings, and errors (default)
- `debug`: All logs including debug information

## Production Considerations

In production, logs are written to:
- `logs/error.log` - Error level logs only
- `logs/combined.log` - All logs

Log files are automatically rotated when they reach 5MB, keeping the last 5 files.
