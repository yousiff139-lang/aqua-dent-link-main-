import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BookingError,
  handleDatabaseError,
  handleApplicationError,
  formatErrorForUser,
  isErrorCode,
  DB_ERROR_CODES,
} from './errorHandler';

describe('BookingError', () => {
  it('should create a BookingError with all properties', () => {
    const error = new BookingError(
      'Test error',
      'TEST_CODE',
      { detail: 'test' },
      'User message'
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(BookingError);
    expect(error.name).toBe('BookingError');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.details).toEqual({ detail: 'test' });
    expect(error.userMessage).toBe('User message');
  });

  it('should use message as userMessage when userMessage is not provided', () => {
    const error = new BookingError('Test error', 'TEST_CODE');
    expect(error.userMessage).toBe('Test error');
  });
});

describe('handleDatabaseError', () => {
  beforeEach(() => {
    // Clear console.error mock before each test
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should handle schema errors (42P01)', () => {
    const dbError = {
      code: DB_ERROR_CODES.UNDEFINED_TABLE,
      message: 'relation "appointment" does not exist',
      details: 'appointment',
    };

    expect(() => handleDatabaseError(dbError)).toThrow(BookingError);
    
    try {
      handleDatabaseError(dbError);
    } catch (error) {
      expect(error).toBeInstanceOf(BookingError);
      expect((error as BookingError).code).toBe('SCHEMA_ERROR');
      expect((error as BookingError).userMessage).toContain('System configuration error');
      expect(console.error).toHaveBeenCalled();
    }
  });

  it('should handle permission errors (42501)', () => {
    const dbError = {
      code: DB_ERROR_CODES.INSUFFICIENT_PRIVILEGE,
      message: 'permission denied for table appointments',
    };

    expect(() => handleDatabaseError(dbError)).toThrow(BookingError);
    
    try {
      handleDatabaseError(dbError);
    } catch (error) {
      expect(error).toBeInstanceOf(BookingError);
      expect((error as BookingError).code).toBe('PERMISSION_DENIED');
      expect((error as BookingError).userMessage).toContain('do not have permission');
    }
  });

  it('should handle unique constraint violations (23505)', () => {
    const dbError = {
      code: DB_ERROR_CODES.UNIQUE_VIOLATION,
      message: 'duplicate key value violates unique constraint',
      details: 'appointments_time_slot_unique',
    };

    expect(() => handleDatabaseError(dbError)).toThrow(BookingError);
    
    try {
      handleDatabaseError(dbError);
    } catch (error) {
      expect(error).toBeInstanceOf(BookingError);
      expect((error as BookingError).code).toBe('SLOT_UNAVAILABLE');
      expect((error as BookingError).userMessage).toContain('already booked');
    }
  });

  it('should handle foreign key violations (23503)', () => {
    const dbError = {
      code: DB_ERROR_CODES.FOREIGN_KEY_VIOLATION,
      message: 'insert or update on table violates foreign key constraint',
    };

    expect(() => handleDatabaseError(dbError)).toThrow(BookingError);
    
    try {
      handleDatabaseError(dbError);
    } catch (error) {
      expect(error).toBeInstanceOf(BookingError);
      expect((error as BookingError).code).toBe('INVALID_REFERENCE');
      expect((error as BookingError).userMessage).toContain('no longer available');
    }
  });

  it('should handle not null violations (23502)', () => {
    const dbError = {
      code: DB_ERROR_CODES.NOT_NULL_VIOLATION,
      message: 'null value in column violates not-null constraint',
      details: 'patient_name',
    };

    expect(() => handleDatabaseError(dbError)).toThrow(BookingError);
    
    try {
      handleDatabaseError(dbError);
    } catch (error) {
      expect(error).toBeInstanceOf(BookingError);
      expect((error as BookingError).code).toBe('MISSING_FIELD');
      expect((error as BookingError).userMessage).toContain('Required information is missing');
    }
  });

  it('should handle check constraint violations (23514)', () => {
    const dbError = {
      code: DB_ERROR_CODES.CHECK_VIOLATION,
      message: 'new row violates check constraint',
    };

    expect(() => handleDatabaseError(dbError)).toThrow(BookingError);
    
    try {
      handleDatabaseError(dbError);
    } catch (error) {
      expect(error).toBeInstanceOf(BookingError);
      expect((error as BookingError).code).toBe('INVALID_DATA');
      expect((error as BookingError).userMessage).toContain('information provided is invalid');
    }
  });

  it('should handle network errors', () => {
    const networkError = {
      message: 'fetch failed: network error',
    };

    expect(() => handleDatabaseError(networkError)).toThrow(BookingError);
    
    try {
      handleDatabaseError(networkError);
    } catch (error) {
      expect(error).toBeInstanceOf(BookingError);
      expect((error as BookingError).code).toBe('NETWORK_ERROR');
      expect((error as BookingError).userMessage).toContain('check your internet connection');
    }
  });

  it('should handle authentication errors', () => {
    const authError = {
      message: 'JWT expired',
    };

    expect(() => handleDatabaseError(authError)).toThrow(BookingError);
    
    try {
      handleDatabaseError(authError);
    } catch (error) {
      expect(error).toBeInstanceOf(BookingError);
      expect((error as BookingError).code).toBe('AUTH_ERROR');
      expect((error as BookingError).userMessage).toContain('session has expired');
    }
  });

  it('should handle generic database errors', () => {
    const genericError = {
      message: 'Unknown database error',
    };

    expect(() => handleDatabaseError(genericError)).toThrow(BookingError);
    
    try {
      handleDatabaseError(genericError);
    } catch (error) {
      expect(error).toBeInstanceOf(BookingError);
      expect((error as BookingError).code).toBe('DATABASE_ERROR');
      expect((error as BookingError).userMessage).toContain('unexpected error occurred');
    }
  });

  it('should log error details to console', () => {
    const dbError = {
      code: '42P01',
      message: 'test error',
      details: 'test details',
    };

    try {
      handleDatabaseError(dbError);
    } catch {
      // The logger outputs multiple console.error calls with formatted message and details
      expect(console.error).toHaveBeenCalled();
      
      // Check that the error was logged (the logger formats it differently)
      const calls = (console.error as any).mock.calls;
      const hasErrorLog = calls.some((call: any[]) => 
        call.some((arg: any) => 
          typeof arg === 'string' && arg.includes('Database error encountered')
        )
      );
      expect(hasErrorLog).toBe(true);
    }
  });
});

describe('handleApplicationError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should return existing BookingError unchanged', () => {
    const bookingError = new BookingError('Test', 'TEST_CODE');
    const result = handleApplicationError(bookingError);
    
    expect(result).toBe(bookingError);
  });

  it('should convert standard Error to BookingError', () => {
    const error = new Error('Standard error');
    const result = handleApplicationError(error, 'test context');
    
    expect(result).toBeInstanceOf(BookingError);
    expect(result.message).toBe('Standard error');
    expect(result.code).toBe('APPLICATION_ERROR');
    expect(result.details).toEqual({ originalError: error, context: 'test context' });
  });

  it('should handle unknown error types', () => {
    const unknownError = { weird: 'object' };
    const result = handleApplicationError(unknownError);
    
    expect(result).toBeInstanceOf(BookingError);
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.userMessage).toContain('unexpected error');
  });

  it('should log error with context', () => {
    const error = new Error('Test error');
    handleApplicationError(error, 'booking submission');
    
    // The logger outputs multiple console.error calls with formatted message and details
    expect(console.error).toHaveBeenCalled();
    
    // Check that the error was logged (the logger formats it differently)
    const calls = (console.error as any).mock.calls;
    const hasErrorLog = calls.some((call: any[]) => 
      call.some((arg: any) => 
        typeof arg === 'string' && arg.includes('Application error encountered')
      )
    );
    expect(hasErrorLog).toBe(true);
  });
});

describe('formatErrorForUser', () => {
  it('should extract userMessage from BookingError', () => {
    const error = new BookingError('Internal', 'CODE', {}, 'User friendly message');
    const result = formatErrorForUser(error);
    
    expect(result).toBe('User friendly message');
  });

  it('should use message from standard Error', () => {
    const error = new Error('Error message');
    const result = formatErrorForUser(error);
    
    expect(result).toBe('Error message');
  });

  it('should return string errors as-is', () => {
    const result = formatErrorForUser('String error');
    expect(result).toBe('String error');
  });

  it('should provide default message for unknown error types', () => {
    const result = formatErrorForUser({ weird: 'object' });
    expect(result).toBe('An unexpected error occurred. Please try again.');
  });
});

describe('isErrorCode', () => {
  it('should return true for matching error code', () => {
    const error = new BookingError('Test', 'SCHEMA_ERROR');
    expect(isErrorCode(error, 'SCHEMA_ERROR')).toBe(true);
  });

  it('should return false for non-matching error code', () => {
    const error = new BookingError('Test', 'SCHEMA_ERROR');
    expect(isErrorCode(error, 'PERMISSION_DENIED')).toBe(false);
  });

  it('should return false for non-BookingError', () => {
    const error = new Error('Test');
    expect(isErrorCode(error, 'SCHEMA_ERROR')).toBe(false);
  });

  it('should return false for BookingError without code', () => {
    const error = new BookingError('Test');
    expect(isErrorCode(error, 'SCHEMA_ERROR')).toBe(false);
  });
});
