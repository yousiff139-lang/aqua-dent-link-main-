/**
 * Examples of using the comprehensive logging utility
 * This file demonstrates various logging patterns for database operations
 * and application events.
 */

import { logger, DatabaseOperation, withDatabaseLogging } from './logger';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Example 1: Basic logging methods
// ============================================================================

export function basicLoggingExamples() {
  // Log informational messages
  logger.info('User navigated to dentist profile page', {
    dentistId: '123',
    timestamp: Date.now(),
  });

  // Log success messages
  logger.success('Form validation passed', {
    formName: 'bookingForm',
    fieldsValidated: 5,
  });

  // Log warnings
  logger.warn('API rate limit approaching', {
    currentRequests: 95,
    limit: 100,
  });

  // Log errors
  logger.error('Failed to load user preferences', new Error('Network timeout'), {
    userId: '456',
    retryAttempt: 2,
  });

  // Log debug messages (only in development)
  logger.debug('Component rendered', {
    componentName: 'BookingForm',
    props: { dentistId: '123' },
  });
}

// ============================================================================
// Example 2: Database query logging with withDatabaseLogging wrapper
// ============================================================================

export async function fetchDentistWithLogging(dentistId: string) {
  return withDatabaseLogging(
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
}

// ============================================================================
// Example 3: Manual database operation logging
// ============================================================================

export async function createAppointmentWithManualLogging(appointmentData: any) {
  const getElapsed = logger.startTimer();

  // Log the query attempt
  logger.logDatabaseQuery(
    DatabaseOperation.INSERT,
    'appointments',
    {
      dentistId: appointmentData.dentist_id,
      appointmentDate: appointmentData.appointment_date,
      paymentMethod: appointmentData.payment_method,
    }
  );

  try {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single();

    if (error) throw error;

    const duration = getElapsed();

    // Log success with duration
    logger.logDatabaseSuccess(
      DatabaseOperation.INSERT,
      'appointments',
      { appointmentId: data.id },
      duration
    );

    return data;
  } catch (error) {
    // Log error with full details
    logger.logDatabaseError(
      DatabaseOperation.INSERT,
      'appointments',
      error,
      {
        dentistId: appointmentData.dentist_id,
        appointmentDate: appointmentData.appointment_date,
      }
    );

    throw error;
  }
}

// ============================================================================
// Example 4: Logging in React Query hooks
// ============================================================================

export function useAppointmentsWithLogging(patientId: string) {
  // The logging is automatically handled by withDatabaseLogging
  // This example shows the pattern used in useDentist.ts and useDentists.ts
  
  return withDatabaseLogging(
    DatabaseOperation.SELECT,
    'appointments',
    async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    { patientId, orderBy: 'appointment_date ASC' }
  );
}

// ============================================================================
// Example 5: Logging with sensitive data (automatically sanitized)
// ============================================================================

export async function processPaymentWithLogging(paymentData: {
  amount: number;
  stripe_session_id: string;
  card_number: string;
  password: string; // This will be redacted
}) {
  // The logger automatically sanitizes sensitive fields
  logger.info('Processing payment', paymentData);
  // Output: stripe_session_id will be masked, password will be [REDACTED]

  try {
    // Payment processing logic here
    logger.success('Payment processed successfully', {
      amount: paymentData.amount,
      stripe_session_id: paymentData.stripe_session_id, // Will be masked in production
    });
  } catch (error) {
    logger.error('Payment processing failed', error, {
      amount: paymentData.amount,
      // Sensitive data is automatically filtered
    });
  }
}

// ============================================================================
// Example 6: Logging real-time subscription events
// ============================================================================

export function setupRealtimeLogging() {
  const channel = supabase
    .channel('appointments-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'appointments',
      },
      (payload) => {
        logger.success('Real-time: New appointment created', {
          appointmentId: payload.new?.id,
          table: 'appointments',
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'appointments',
      },
      (payload) => {
        logger.info('Real-time: Appointment updated', {
          appointmentId: payload.new?.id,
          changes: payload.new,
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.success('Real-time subscription active', {
          channel: 'appointments-changes',
        });
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('Real-time subscription failed', null, {
          channel: 'appointments-changes',
          status,
        });
      }
    });

  return channel;
}

// ============================================================================
// Example 7: Logging with timing measurements
// ============================================================================

export async function performComplexOperation() {
  const getElapsed = logger.startTimer();

  logger.info('Starting complex operation');

  try {
    // Step 1
    await fetchDentistWithLogging('123');
    logger.debug('Step 1 complete', { elapsed: getElapsed() });

    // Step 2
    await createAppointmentWithManualLogging({
      dentist_id: '123',
      appointment_date: '2024-01-01',
    });
    logger.debug('Step 2 complete', { elapsed: getElapsed() });

    const totalDuration = getElapsed();
    logger.success('Complex operation completed', { duration: totalDuration });
  } catch (error) {
    const totalDuration = getElapsed();
    logger.error('Complex operation failed', error, {
      duration: totalDuration,
      failedAt: 'unknown',
    });
    throw error;
  }
}

// ============================================================================
// Example 8: Logging in error boundaries
// ============================================================================

export function logComponentError(
  error: Error,
  errorInfo: { componentStack: string }
) {
  logger.error('React component error', error, {
    componentStack: errorInfo.componentStack,
    errorBoundary: true,
  });
}

// ============================================================================
// Example 9: Logging API calls
// ============================================================================

export async function callExternalAPI(endpoint: string, data: any) {
  const getElapsed = logger.startTimer();

  logger.info('Calling external API', {
    endpoint,
    method: 'POST',
  });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const duration = getElapsed();

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    logger.success('API call successful', {
      endpoint,
      status: response.status,
      duration,
    });

    return result;
  } catch (error) {
    const duration = getElapsed();

    logger.error('API call failed', error, {
      endpoint,
      duration,
    });

    throw error;
  }
}

// ============================================================================
// Best Practices Summary
// ============================================================================

/**
 * BEST PRACTICES:
 * 
 * 1. Use withDatabaseLogging for all database operations
 *    - Automatically logs query, success, and errors
 *    - Includes timing information
 *    - Sanitizes sensitive data
 * 
 * 2. Use appropriate log levels:
 *    - DEBUG: Development-only detailed information
 *    - INFO: General informational messages
 *    - SUCCESS: Successful operations (shown in dev)
 *    - WARN: Warning conditions that don't prevent operation
 *    - ERROR: Error conditions that need attention
 * 
 * 3. Include context in log details:
 *    - User IDs, entity IDs
 *    - Operation parameters
 *    - Timing information
 *    - Error codes and messages
 * 
 * 4. Never log sensitive data directly:
 *    - Passwords, tokens, API keys
 *    - Credit card numbers
 *    - Payment intent IDs (masked in production)
 *    - The logger handles this automatically
 * 
 * 5. Use timers for performance monitoring:
 *    - const getElapsed = logger.startTimer()
 *    - Log duration with operations
 *    - Identify slow operations
 * 
 * 6. Log at appropriate points:
 *    - Before starting operations
 *    - After successful completion
 *    - On errors (with full context)
 *    - At key decision points
 * 
 * 7. Production vs Development:
 *    - Success logs only in development
 *    - Debug logs only in development
 *    - Sensitive data masked in production
 *    - Error logs always enabled
 */
