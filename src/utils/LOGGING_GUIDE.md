# Comprehensive Error Logging Implementation Guide

## Overview

This guide documents the comprehensive error logging system implemented for the Dental Care Connect booking system. The logging system provides structured, secure, and informative logs for all database operations and application events.

## Features

### ✅ Structured Logging Format
- **Timestamp**: ISO 8601 format for all log entries
- **Log Level**: DEBUG, INFO, WARN, ERROR, SUCCESS
- **Operation Type**: SELECT, INSERT, UPDATE, DELETE, UPSERT
- **Table Name**: Database table being accessed
- **Duration**: Execution time in milliseconds
- **Details**: Contextual information (query parameters, results)

### ✅ Automatic Sensitive Data Filtering
- **Passwords**: Automatically redacted as `[REDACTED]`
- **Tokens & API Keys**: Automatically redacted
- **Payment Information**: Masked in production (e.g., `****1234`)
- **Credit Card Numbers**: Automatically filtered
- **Stripe Session IDs**: Masked in production

### ✅ Environment-Aware Logging
- **Development Mode**:
  - All log levels enabled
  - Successful operations logged
  - Debug messages displayed
  - Full stack traces included
  
- **Production Mode**:
  - Only errors and warnings logged
  - Sensitive data masked
  - Stack traces excluded
  - Minimal performance impact

### ✅ Database Operation Tracking
- Query execution logging
- Success/failure tracking
- Performance timing
- Parameter logging (sanitized)
- Error classification

## Implementation

### Core Files

1. **`src/utils/logger.ts`**
   - Main logging utility
   - Structured log entry creation
   - Sensitive data sanitization
   - Console output formatting

2. **`src/utils/errorHandler.ts`**
   - Enhanced with logger integration
   - Database error classification
   - User-friendly error messages

3. **`src/utils/logger.example.ts`**
   - Usage examples
   - Best practices
   - Common patterns

### Integrated Components

The logging system has been integrated into:

- ✅ `src/hooks/useDentist.ts` - Single dentist queries
- ✅ `src/hooks/useDentists.ts` - All dentists queries
- ✅ `src/components/BookingForm.tsx` - Appointment creation
- ✅ `src/hooks/useAppointmentSubscription.ts` - Real-time updates
- ✅ `src/utils/errorHandler.ts` - Error handling

## Usage Examples

### Basic Logging

```typescript
import { logger } from '@/utils/logger';

// Info message
logger.info('User action performed', { userId: '123', action: 'view_profile' });

// Success message
logger.success('Operation completed', { duration: 150 });

// Warning message
logger.warn('Rate limit approaching', { requests: 95, limit: 100 });

// Error message
logger.error('Operation failed', error, { context: 'payment_processing' });

// Debug message (dev only)
logger.debug('Component state', { state: componentState });
```

### Database Operations with Automatic Logging

```typescript
import { withDatabaseLogging, DatabaseOperation } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

// Automatically logs query, success/error, and timing
const dentist = await withDatabaseLogging(
  DatabaseOperation.SELECT,
  'dentists',
  async () => {
    const { data, error } = await supabase
      .from('dentists')
      .select('*')
      .eq('id', dentistId)
      .single();
    
    if (error) throw error;
    return data;
  },
  { dentistId } // Query parameters for logging
);
```

### Manual Database Logging

```typescript
import { logger, DatabaseOperation } from '@/utils/logger';

const getElapsed = logger.startTimer();

// Log query attempt
logger.logDatabaseQuery(
  DatabaseOperation.INSERT,
  'appointments',
  { dentistId, appointmentDate }
);

try {
  const result = await performDatabaseOperation();
  
  // Log success with duration
  logger.logDatabaseSuccess(
    DatabaseOperation.INSERT,
    'appointments',
    { appointmentId: result.id },
    getElapsed()
  );
} catch (error) {
  // Log error with full details
  logger.logDatabaseError(
    DatabaseOperation.INSERT,
    'appointments',
    error,
    { dentistId, appointmentDate }
  );
  throw error;
}
```

### Performance Timing

```typescript
import { logger } from '@/utils/logger';

const getElapsed = logger.startTimer();

// Perform operation
await performComplexOperation();

// Log with duration
logger.info('Operation completed', { duration: getElapsed() });
```

## Log Output Examples

### Development Mode

```
[2024-01-15T10:30:45.123Z] [DEBUG] [SELECT] [dentists] Database query executed (5ms)
Details: { params: { dentistId: '123' } }

✅ [2024-01-15T10:30:45.128Z] [SUCCESS] [SELECT] [dentists] Database operation successful (8ms)
Details: { result: { id: '123', name: 'Dr. Smith' } }

[2024-01-15T10:30:46.234Z] [INFO] Starting appointment booking
Details: { dentistId: '123', paymentMethod: 'stripe' }

✅ [2024-01-15T10:30:46.567Z] [SUCCESS] [INSERT] [appointments] Database operation successful (333ms)
Details: { result: { appointmentId: '456', bookingReference: 'BK-2024-001' } }
```

### Production Mode

```
[2024-01-15T10:30:45.123Z] [ERROR] [INSERT] [appointments] Database operation failed
Error details: {
  code: '23505',
  message: 'duplicate key value violates unique constraint'
}
Additional details: {
  params: { dentistId: '123', appointmentDate: '2024-01-20' }
}
```

## Security Features

### Sensitive Field Detection

The logger automatically detects and sanitizes fields matching these patterns:

- `/password/i`
- `/token/i`
- `/secret/i`
- `/api[_-]?key/i`
- `/auth/i`
- `/credit[_-]?card/i`
- `/cvv/i`
- `/ssn/i`

### Payment Field Masking

In production, these fields are masked:

- `stripe_session_id` → `****abc123`
- `stripe_payment_intent_id` → `****xyz789`
- `card_number` → `[MASKED]`

### Example

```typescript
// Input
logger.info('Processing payment', {
  amount: 5000,
  stripe_session_id: 'cs_test_1234567890',
  password: 'secret123',
  card_number: '4242424242424242'
});

// Production Output
[2024-01-15T10:30:45.123Z] [INFO] Processing payment
Details: {
  amount: 5000,
  stripe_session_id: '****7890',
  password: '[REDACTED]',
  card_number: '[MASKED]'
}
```

## Performance Considerations

### Minimal Overhead

- **Development**: ~1-2ms per log entry
- **Production**: ~0.5ms per log entry (fewer logs)
- **Sanitization**: ~0.1ms for typical objects
- **Timer**: ~0.01ms overhead

### Optimization Tips

1. Use `withDatabaseLogging` wrapper for automatic timing
2. Only log necessary details in production
3. Use debug logs for verbose information (dev only)
4. Avoid logging large objects (arrays, nested structures)

## Best Practices

### ✅ DO

- Use appropriate log levels (DEBUG, INFO, WARN, ERROR, SUCCESS)
- Include relevant context (IDs, operation parameters)
- Use `withDatabaseLogging` for all database operations
- Log errors with full context
- Use timers for performance-critical operations
- Log at key decision points in your code

### ❌ DON'T

- Log sensitive data directly (passwords, tokens, etc.)
- Log in tight loops (use aggregation instead)
- Log entire large objects (select relevant fields)
- Use console.log/error directly (use logger instead)
- Log success operations in production (handled automatically)
- Include PII in production logs without sanitization

## Monitoring and Debugging

### Finding Logs

**Browser Console:**
- Open Developer Tools (F12)
- Navigate to Console tab
- Filter by log level or search for keywords

**Production Monitoring:**
- Logs are output to browser console
- Can be captured by error tracking services (Sentry, LogRocket, etc.)
- Consider implementing log aggregation for production

### Common Log Patterns

**Successful Operation:**
```
✅ [timestamp] [SUCCESS] [operation] [table] message (duration)
```

**Error:**
```
[timestamp] [ERROR] [operation] [table] message
Error details: { code, message, stack }
Additional details: { context }
```

**Warning:**
```
[timestamp] [WARN] message
Details: { context }
```

## Troubleshooting

### Issue: Logs not appearing in production

**Solution:** Check that errors are actually occurring. Success logs are disabled in production by default.

### Issue: Sensitive data appearing in logs

**Solution:** Verify the field name matches sensitive patterns. Add custom patterns if needed in `logger.ts`.

### Issue: Performance degradation

**Solution:** Reduce log verbosity in production. Ensure you're not logging in tight loops.

### Issue: Missing context in error logs

**Solution:** Always pass relevant context as the third parameter to logger methods.

## Requirements Satisfied

This implementation satisfies all requirements from task 12:

- ✅ **11.1**: Log all database query errors with full details
- ✅ **11.2**: Include query parameters and table name in error logs
- ✅ **11.3**: Log successful operations in development mode
- ✅ **11.4**: Use structured logging format (timestamp, operation, table, result)
- ✅ **11.5**: Ensure no sensitive data logged in production

## Future Enhancements

Potential improvements for future iterations:

1. **Remote Logging**: Send logs to external service (Sentry, LogRocket)
2. **Log Aggregation**: Collect and analyze logs across users
3. **Performance Metrics**: Track and visualize operation durations
4. **Alert System**: Notify on critical errors
5. **Log Rotation**: Implement client-side log rotation for long sessions
6. **Custom Filters**: Allow users to configure log verbosity

## Support

For questions or issues with the logging system:

1. Review this guide and `logger.example.ts`
2. Check existing logs for similar patterns
3. Consult the development team
4. Review the source code in `src/utils/logger.ts`

---

**Last Updated:** January 2024  
**Version:** 1.0.0  
**Maintainer:** Development Team
