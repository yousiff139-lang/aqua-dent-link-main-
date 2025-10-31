import { logger } from './logger';

/**
 * Custom error class for booking-related errors
 * Provides structured error information for better error handling and user feedback
 */
export class BookingError extends Error {
  public readonly code?: string;
  public readonly details?: any;
  public readonly userMessage: string;

  constructor(
    message: string,
    code?: string,
    details?: any,
    userMessage?: string
  ) {
    super(message);
    this.name = 'BookingError';
    this.code = code;
    this.details = details;
    this.userMessage = userMessage || message;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BookingError);
    }
  }
}

/**
 * Database error codes from PostgreSQL
 */
export const DB_ERROR_CODES = {
  UNDEFINED_TABLE: '42P01',        // Table does not exist
  INSUFFICIENT_PRIVILEGE: '42501', // Permission denied
  UNIQUE_VIOLATION: '23505',       // Unique constraint violation
  FOREIGN_KEY_VIOLATION: '23503',  // Foreign key constraint violation
  NOT_NULL_VIOLATION: '23502',     // Not null constraint violation
  CHECK_VIOLATION: '23514',        // Check constraint violation
} as const;

/**
 * Handles database errors and converts them to user-friendly BookingError instances
 * Classifies errors by PostgreSQL error codes and provides appropriate messages
 * 
 * @param error - The error object from Supabase or database operation
 * @returns Never returns - always throws a BookingError
 * @throws {BookingError} Always throws with classified error information
 */
export function handleDatabaseError(error: any): never {
  // Log the full error details using the comprehensive logger
  logger.error('Database error encountered', error, {
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  });

  // Schema error - table doesn't exist
  if (error?.code === DB_ERROR_CODES.UNDEFINED_TABLE) {
    throw new BookingError(
      `Database schema error: ${error.message}`,
      'SCHEMA_ERROR',
      { 
        originalError: error,
        tableName: error?.details || 'unknown',
      },
      'System configuration error. Our technical team has been notified. Please try again later or contact support.'
    );
  }

  // RLS policy violation or insufficient privileges
  if (error?.code === DB_ERROR_CODES.INSUFFICIENT_PRIVILEGE) {
    throw new BookingError(
      `Permission denied: ${error.message}`,
      'PERMISSION_DENIED',
      { originalError: error },
      'You do not have permission to perform this action. Please ensure you are logged in and try again.'
    );
  }

  // Unique constraint violation - typically means slot is already booked
  if (error?.code === DB_ERROR_CODES.UNIQUE_VIOLATION) {
    const constraintName = error?.details || '';
    let userMessage = 'This time slot is already booked. Please choose another time.';
    
    // Check if it's a booking reference duplicate (shouldn't happen but handle it)
    if (constraintName.includes('booking_reference')) {
      userMessage = 'A booking conflict occurred. Please try again.';
    }
    
    throw new BookingError(
      `Unique constraint violation: ${error.message}`,
      'SLOT_UNAVAILABLE',
      { 
        originalError: error,
        constraint: constraintName,
      },
      userMessage
    );
  }

  // Foreign key violation - invalid dentist_id or patient_id
  if (error?.code === DB_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    throw new BookingError(
      `Invalid reference: ${error.message}`,
      'INVALID_REFERENCE',
      { originalError: error },
      'The selected dentist is no longer available. Please select another dentist.'
    );
  }

  // Not null violation - missing required field
  if (error?.code === DB_ERROR_CODES.NOT_NULL_VIOLATION) {
    const column = error?.details || 'field';
    throw new BookingError(
      `Missing required field: ${error.message}`,
      'MISSING_FIELD',
      { 
        originalError: error,
        column,
      },
      `Required information is missing. Please fill in all required fields and try again.`
    );
  }

  // Check constraint violation - invalid status, payment method, etc.
  if (error?.code === DB_ERROR_CODES.CHECK_VIOLATION) {
    throw new BookingError(
      `Invalid data: ${error.message}`,
      'INVALID_DATA',
      { originalError: error },
      'Some of the information provided is invalid. Please check your entries and try again.'
    );
  }

  // Network or connection errors
  if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
    throw new BookingError(
      `Network error: ${error.message}`,
      'NETWORK_ERROR',
      { originalError: error },
      'Unable to connect to the server. Please check your internet connection and try again.'
    );
  }

  // Authentication errors
  if (error?.message?.includes('JWT') || error?.message?.includes('auth')) {
    throw new BookingError(
      `Authentication error: ${error.message}`,
      'AUTH_ERROR',
      { originalError: error },
      'Your session has expired. Please sign in again to continue.'
    );
  }

  // Generic database error
  throw new BookingError(
    error?.message || 'An unexpected database error occurred',
    'DATABASE_ERROR',
    { originalError: error },
    'An unexpected error occurred while processing your request. Please try again. If the problem persists, contact support.'
  );
}

/**
 * Handles general application errors and converts them to BookingError instances
 * 
 * @param error - Any error object
 * @param context - Optional context about where the error occurred
 * @returns BookingError instance
 */
export function handleApplicationError(error: any, context?: string): BookingError {
  // Log error with context using the comprehensive logger
  logger.error('Application error encountered', error, { context });

  // If it's already a BookingError, return it
  if (error instanceof BookingError) {
    return error;
  }

  // If it's a standard Error
  if (error instanceof Error) {
    return new BookingError(
      error.message,
      'APPLICATION_ERROR',
      { originalError: error, context },
      'An error occurred while processing your request. Please try again.'
    );
  }

  // Unknown error type
  return new BookingError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    { originalError: error, context },
    'An unexpected error occurred. Please try again.'
  );
}

/**
 * Formats an error for display to the user
 * Extracts the user-friendly message from BookingError or provides a default
 * 
 * @param error - Any error object
 * @returns User-friendly error message string
 */
export function formatErrorForUser(error: any): string {
  if (error instanceof BookingError) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Checks if an error is a specific type of BookingError
 * 
 * @param error - Any error object
 * @param code - The error code to check for
 * @returns True if the error matches the specified code
 */
export function isErrorCode(error: any, code: string): boolean {
  return error instanceof BookingError && error.code === code;
}
