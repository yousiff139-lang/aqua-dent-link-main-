/**
 * Unit tests for AppError utility class
 * 
 * Tests error creation and handling for:
 * - Different error types
 * - Error codes and status codes
 * - Error details and metadata
 */

import { describe, it, expect } from 'vitest';
import { AppError } from '../utils/errors.js';
import { ErrorCode } from '../types/index.js';

describe('AppError', () => {
  describe('constructor', () => {
    it('should create error with all properties', () => {
      const error = new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Test error message',
        400,
        { field: 'email' }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
      expect(error.name).toBe('AppError');
    });

    it('should have stack trace', () => {
      const error = new AppError(ErrorCode.INTERNAL_ERROR, 'Test error', 500);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });
  });

  describe('unauthorized', () => {
    it('should create unauthorized error with default message', () => {
      const error = AppError.unauthorized();

      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
    });

    it('should create unauthorized error with custom message', () => {
      const error = AppError.unauthorized('Invalid token');

      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('forbidden', () => {
    it('should create forbidden error with default message', () => {
      const error = AppError.forbidden();

      expect(error.code).toBe(ErrorCode.FORBIDDEN);
      expect(error.message).toBe('Forbidden');
      expect(error.statusCode).toBe(403);
    });

    it('should create forbidden error with custom message', () => {
      const error = AppError.forbidden('Access denied');

      expect(error.code).toBe(ErrorCode.FORBIDDEN);
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('notFound', () => {
    it('should create not found error with default message', () => {
      const error = AppError.notFound();

      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
    });

    it('should create not found error with custom message', () => {
      const error = AppError.notFound('Appointment not found');

      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.message).toBe('Appointment not found');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    it('should create validation error with message', () => {
      const error = AppError.validation('Invalid email format');

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Invalid email format');
      expect(error.statusCode).toBe(400);
      expect(error.details).toBeUndefined();
    });

    it('should create validation error with details', () => {
      const details = {
        field: 'email',
        value: 'invalid-email',
        constraint: 'email format',
      };
      const error = AppError.validation('Invalid email format', details);

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Invalid email format');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
    });
  });

  describe('conflict', () => {
    it('should create conflict error', () => {
      const error = AppError.conflict('Resource already exists');

      expect(error.code).toBe(ErrorCode.CONFLICT);
      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
    });
  });

  describe('internal', () => {
    it('should create internal error with default message', () => {
      const error = AppError.internal();

      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe('Internal server error');
      expect(error.statusCode).toBe(500);
    });

    it('should create internal error with custom message', () => {
      const error = AppError.internal('Database connection failed');

      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe('Database connection failed');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('slotUnavailable', () => {
    it('should create slot unavailable error with default message', () => {
      const error = AppError.slotUnavailable();

      expect(error.code).toBe(ErrorCode.SLOT_UNAVAILABLE);
      expect(error.message).toBe('Time slot is unavailable');
      expect(error.statusCode).toBe(409);
      expect(error.details).toBeUndefined();
    });

    it('should create slot unavailable error with custom message and details', () => {
      const details = {
        alternativeSlots: [
          { date: '2025-12-01', time: '10:30' },
          { date: '2025-12-01', time: '11:00' },
        ],
      };
      const error = AppError.slotUnavailable('Slot already booked', details);

      expect(error.code).toBe(ErrorCode.SLOT_UNAVAILABLE);
      expect(error.message).toBe('Slot already booked');
      expect(error.statusCode).toBe(409);
      expect(error.details).toEqual(details);
    });
  });

  describe('cancellationWindowExpired', () => {
    it('should create cancellation window expired error with default message', () => {
      const error = AppError.cancellationWindowExpired();

      expect(error.code).toBe(ErrorCode.CANCELLATION_WINDOW_EXPIRED);
      expect(error.message).toBe('Cancellation window has expired');
      expect(error.statusCode).toBe(400);
    });

    it('should create cancellation window expired error with custom message', () => {
      const error = AppError.cancellationWindowExpired(
        'Cannot cancel within 24 hours of appointment'
      );

      expect(error.code).toBe(ErrorCode.CANCELLATION_WINDOW_EXPIRED);
      expect(error.message).toBe('Cannot cancel within 24 hours of appointment');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('payment', () => {
    it('should create payment error with default message', () => {
      const error = AppError.payment();

      expect(error.code).toBe(ErrorCode.PAYMENT_ERROR);
      expect(error.message).toBe('Payment processing failed');
      expect(error.statusCode).toBe(402);
    });

    it('should create payment error with custom message', () => {
      const error = AppError.payment('Card declined');

      expect(error.code).toBe(ErrorCode.PAYMENT_ERROR);
      expect(error.message).toBe('Card declined');
      expect(error.statusCode).toBe(402);
    });
  });

  describe('error handling in try-catch', () => {
    it('should be catchable as Error', () => {
      try {
        throw AppError.validation('Test error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
      }
    });

    it('should preserve error properties when caught', () => {
      try {
        throw AppError.slotUnavailable('Slot taken', {
          alternativeSlots: ['10:30', '11:00'],
        });
      } catch (error) {
        if (error instanceof AppError) {
          expect(error.code).toBe(ErrorCode.SLOT_UNAVAILABLE);
          expect(error.statusCode).toBe(409);
          expect(error.details).toEqual({
            alternativeSlots: ['10:30', '11:00'],
          });
        }
      }
    });
  });

  describe('error comparison', () => {
    it('should allow checking error type by code', () => {
      const error = AppError.validation('Test');

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.code === ErrorCode.VALIDATION_ERROR).toBe(true);
      expect(error.code === ErrorCode.NOT_FOUND).toBe(false);
    });

    it('should allow checking error type by status code', () => {
      const error = AppError.notFound();

      expect(error.statusCode).toBe(404);
      expect(error.statusCode === 404).toBe(true);
      expect(error.statusCode === 500).toBe(false);
    });
  });
});
