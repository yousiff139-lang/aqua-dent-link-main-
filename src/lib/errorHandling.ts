/**
 * Error handling utilities for booking system
 * Provides centralized error handling, logging, and user-friendly error messages
 */

/**
 * Custom error class for booking-related errors
 */
export class BookingError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

/**
 * Error codes for different types of errors
 */
export enum ErrorCode {
  // Authentication errors
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_FAILED = 'AUTH_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_FILE = 'INVALID_FILE',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // Business logic errors
  SLOT_UNAVAILABLE = 'SLOT_UNAVAILABLE',
  CANCELLATION_NOT_ALLOWED = 'CANCELLATION_NOT_ALLOWED',
  BOOKING_EXPIRED = 'BOOKING_EXPIRED',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  SERVER_ERROR = 'SERVER_ERROR',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  QUERY_FAILED = 'QUERY_FAILED',
  
  // External service errors
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  NOTIFICATION_ERROR = 'NOTIFICATION_ERROR',
  
  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Get user-friendly error message based on error code
 */
export const getUserFriendlyMessage = (code: ErrorCode): string => {
  const messages: Record<ErrorCode, string> = {
    [ErrorCode.AUTH_REQUIRED]: 'Please sign in to continue',
    [ErrorCode.AUTH_FAILED]: 'Authentication failed. Please try signing in again',
    [ErrorCode.UNAUTHORIZED]: 'You do not have permission to perform this action',
    
    [ErrorCode.VALIDATION_FAILED]: 'Please check your input and try again',
    [ErrorCode.INVALID_INPUT]: 'Some information is missing or invalid',
    [ErrorCode.INVALID_FILE]: 'The selected file is not valid',
    
    [ErrorCode.NOT_FOUND]: 'The requested resource was not found',
    [ErrorCode.ALREADY_EXISTS]: 'This resource already exists',
    [ErrorCode.CONFLICT]: 'There was a conflict with your request',
    
    [ErrorCode.SLOT_UNAVAILABLE]: 'This time slot is no longer available',
    [ErrorCode.CANCELLATION_NOT_ALLOWED]: 'This appointment cannot be cancelled at this time',
    [ErrorCode.BOOKING_EXPIRED]: 'Your booking session has expired',
    
    [ErrorCode.NETWORK_ERROR]: 'Network connection error. Please check your internet connection',
    [ErrorCode.TIMEOUT]: 'Request timed out. Please try again',
    [ErrorCode.SERVER_ERROR]: 'Server error. Please try again later',
    
    [ErrorCode.DATABASE_ERROR]: 'Database error. Please try again',
    [ErrorCode.QUERY_FAILED]: 'Failed to retrieve data. Please try again',
    
    [ErrorCode.AI_SERVICE_ERROR]: 'AI service is temporarily unavailable',
    [ErrorCode.STORAGE_ERROR]: 'File storage error. Please try again',
    [ErrorCode.NOTIFICATION_ERROR]: 'Failed to send notification',
    
    [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again',
  };

  return messages[code] || messages[ErrorCode.UNKNOWN_ERROR];
};

/**
 * Parse error and return standardized error object
 */
export const parseError = (error: any): BookingError => {
  // If it's already a BookingError, return it
  if (error instanceof BookingError) {
    return error;
  }

  // Handle Supabase errors
  if (error?.code) {
    const supabaseCode = error.code;
    
    // Authentication errors
    if (supabaseCode === 'PGRST301' || supabaseCode === '401') {
      return new BookingError(
        error.message || 'Authentication required',
        ErrorCode.AUTH_REQUIRED,
        getUserFriendlyMessage(ErrorCode.AUTH_REQUIRED),
        error
      );
    }
    
    // Not found errors
    if (supabaseCode === 'PGRST116' || supabaseCode === '404') {
      return new BookingError(
        error.message || 'Resource not found',
        ErrorCode.NOT_FOUND,
        getUserFriendlyMessage(ErrorCode.NOT_FOUND),
        error
      );
    }
    
    // Conflict errors
    if (supabaseCode === '23505' || supabaseCode === 'PGRST409') {
      return new BookingError(
        error.message || 'Resource already exists',
        ErrorCode.ALREADY_EXISTS,
        getUserFriendlyMessage(ErrorCode.ALREADY_EXISTS),
        error
      );
    }
    
    // Database errors
    return new BookingError(
      error.message || 'Database error',
      ErrorCode.DATABASE_ERROR,
      getUserFriendlyMessage(ErrorCode.DATABASE_ERROR),
      error
    );
  }

  // Handle network errors
  if (error?.name === 'NetworkError' || error?.message?.includes('network')) {
    return new BookingError(
      error.message || 'Network error',
      ErrorCode.NETWORK_ERROR,
      getUserFriendlyMessage(ErrorCode.NETWORK_ERROR),
      error
    );
  }

  // Handle timeout errors
  if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
    return new BookingError(
      error.message || 'Request timeout',
      ErrorCode.TIMEOUT,
      getUserFriendlyMessage(ErrorCode.TIMEOUT),
      error
    );
  }

  // Handle validation errors
  if (error?.message?.includes('Validation failed')) {
    return new BookingError(
      error.message,
      ErrorCode.VALIDATION_FAILED,
      getUserFriendlyMessage(ErrorCode.VALIDATION_FAILED),
      error
    );
  }

  // Default unknown error
  return new BookingError(
    error?.message || 'Unknown error',
    ErrorCode.UNKNOWN_ERROR,
    getUserFriendlyMessage(ErrorCode.UNKNOWN_ERROR),
    error
  );
};

/**
 * Log error to console (can be extended to send to logging service)
 */
export const logError = (error: BookingError, context?: string): void => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    context,
    code: error.code,
    message: error.message,
    userMessage: error.userMessage,
    details: error.details,
    stack: error.stack,
  };

  console.error('[BookingError]', logEntry);

  // TODO: Send to external logging service (e.g., Sentry, LogRocket)
  // sendToLoggingService(logEntry);
};

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  retryableErrors: ErrorCode[];
}

/**
 * Default retry configuration
 */
export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  retryableErrors: [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.TIMEOUT,
    ErrorCode.SERVER_ERROR,
    ErrorCode.DATABASE_ERROR,
  ],
};

/**
 * Retry a function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> => {
  const finalConfig = { ...defaultRetryConfig, ...config };
  let lastError: BookingError | null = null;
  let delay = finalConfig.delayMs;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const parsedError = parseError(error);
      lastError = parsedError;

      // Check if error is retryable
      const isRetryable = finalConfig.retryableErrors.includes(parsedError.code as ErrorCode);
      const isLastAttempt = attempt === finalConfig.maxAttempts;

      if (!isRetryable || isLastAttempt) {
        throw parsedError;
      }

      // Log retry attempt
      console.warn(`[Retry] Attempt ${attempt}/${finalConfig.maxAttempts} failed. Retrying in ${delay}ms...`, {
        error: parsedError.message,
        code: parsedError.code,
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Increase delay for next attempt (exponential backoff)
      delay *= finalConfig.backoffMultiplier;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new BookingError(
    'Retry failed',
    ErrorCode.UNKNOWN_ERROR,
    getUserFriendlyMessage(ErrorCode.UNKNOWN_ERROR)
  );
};

/**
 * Wrap async function with error handling
 */
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: string
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const parsedError = parseError(error);
      logError(parsedError, context);
      throw parsedError;
    }
  };
};

/**
 * Create a timeout promise
 */
export const createTimeout = (ms: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new BookingError(
        `Operation timed out after ${ms}ms`,
        ErrorCode.TIMEOUT,
        getUserFriendlyMessage(ErrorCode.TIMEOUT)
      ));
    }, ms);
  });
};

/**
 * Wrap promise with timeout
 */
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> => {
  return Promise.race([promise, createTimeout(timeoutMs)]);
};

/**
 * Safe async wrapper that catches errors and returns result object
 */
export const safeAsync = async <T>(
  fn: () => Promise<T>
): Promise<{ data: T | null; error: BookingError | null }> => {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    const parsedError = parseError(error);
    return { data: null, error: parsedError };
  }
};
