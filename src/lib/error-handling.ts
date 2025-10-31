/**
 * Error handling utilities for the admin dashboard
 */

/**
 * Check if an error is a network error
 */
export const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  
  // Check for common network error indicators
  return (
    error.message?.includes('Failed to fetch') ||
    error.message?.includes('Network request failed') ||
    error.message?.includes('NetworkError') ||
    error.message?.includes('ERR_INTERNET_DISCONNECTED') ||
    error.message?.includes('ERR_NETWORK') ||
    error.code === 'ECONNREFUSED' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'ETIMEDOUT' ||
    !navigator.onLine
  );
};

/**
 * Get a user-friendly error message based on the error type
 */
export const getUserFriendlyErrorMessage = (error: any, context: string = 'operation'): string => {
  if (!error) return `Failed to complete ${context}. Please try again.`;
  
  // Network errors
  if (isNetworkError(error)) {
    return 'No internet connection. Please check your network and try again.';
  }
  
  // Authentication errors
  if (error.message?.includes('JWT') || error.message?.includes('token')) {
    return 'Your session has expired. Please sign in again.';
  }
  
  // Permission errors
  if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
    return 'You don\'t have permission to perform this action.';
  }
  
  // Database errors
  if (error.message?.includes('violates') || error.message?.includes('constraint')) {
    return 'This action conflicts with existing data. Please check and try again.';
  }
  
  // Timeout errors
  if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
    return 'The request took too long. Please try again.';
  }
  
  // Return the original error message if it's user-friendly, otherwise a generic message
  if (error.message && error.message.length < 100 && !error.message.includes('Error:')) {
    return error.message;
  }
  
  return `Failed to complete ${context}. Please try again.`;
};

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
}

const defaultRetryConfig: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  shouldRetry: (error: any, attempt: number) => {
    // Don't retry on authentication or permission errors
    if (
      error.message?.includes('JWT') ||
      error.message?.includes('token') ||
      error.message?.includes('permission') ||
      error.message?.includes('unauthorized')
    ) {
      return false;
    }
    
    // Retry on network errors and timeouts
    return isNetworkError(error) || error.message?.includes('timeout');
  },
};

/**
 * Retry a function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> => {
  const finalConfig = { ...defaultRetryConfig, ...config };
  let lastError: any;
  
  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (attempt < finalConfig.maxAttempts && finalConfig.shouldRetry(error, attempt)) {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          finalConfig.initialDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
          finalConfig.maxDelay
        );
        
        console.log(`[Retry] Attempt ${attempt} failed, retrying in ${delay}ms...`, error);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Don't retry, throw the error
        throw error;
      }
    }
  }
  
  // All attempts failed
  throw lastError;
};

/**
 * Wrap an async function with error handling and retry logic
 */
export const withErrorHandling = <T>(
  fn: () => Promise<T>,
  options: {
    context?: string;
    retry?: boolean | RetryConfig;
    onError?: (error: any) => void;
  } = {}
): Promise<T> => {
  const { context = 'operation', retry = false, onError } = options;
  
  const wrappedFn = async () => {
    try {
      if (retry) {
        const retryConfig = typeof retry === 'boolean' ? {} : retry;
        return await retryWithBackoff(fn, retryConfig);
      } else {
        return await fn();
      }
    } catch (error) {
      console.error(`[Error] ${context}:`, error);
      
      // Call custom error handler if provided
      if (onError) {
        onError(error);
      }
      
      // Re-throw with user-friendly message
      const userMessage = getUserFriendlyErrorMessage(error, context);
      const enhancedError = new Error(userMessage);
      (enhancedError as any).originalError = error;
      throw enhancedError;
    }
  };
  
  return wrappedFn();
};

/**
 * Check if the user is online
 */
export const checkOnlineStatus = (): boolean => {
  return navigator.onLine;
};

/**
 * Wait for the user to come back online
 */
export const waitForOnline = (timeout: number = 30000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (navigator.onLine) {
      resolve(true);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', onlineHandler);
      resolve(false);
    }, timeout);
    
    const onlineHandler = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', onlineHandler);
      resolve(true);
    };
    
    window.addEventListener('online', onlineHandler);
  });
};
