import { ErrorCode } from '../types/index.js';

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  static unauthorized(message: string = 'Unauthorized'): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message, 401);
  }

  static forbidden(message: string = 'Forbidden'): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message, 403);
  }

  static notFound(message: string = 'Resource not found'): AppError {
    return new AppError(ErrorCode.NOT_FOUND, message, 404);
  }

  static validation(message: string, details?: Record<string, any>): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details);
  }

  static conflict(message: string): AppError {
    return new AppError(ErrorCode.CONFLICT, message, 409);
  }

  static internal(message: string = 'Internal server error'): AppError {
    return new AppError(ErrorCode.INTERNAL_ERROR, message, 500);
  }

  static slotUnavailable(message: string = 'Time slot is unavailable', details?: Record<string, any>): AppError {
    return new AppError(ErrorCode.SLOT_UNAVAILABLE, message, 409, details);
  }

  static cancellationWindowExpired(message: string = 'Cancellation window has expired'): AppError {
    return new AppError(ErrorCode.CANCELLATION_WINDOW_EXPIRED, message, 400);
  }

  static payment(message: string = 'Payment processing failed'): AppError {
    return new AppError(ErrorCode.PAYMENT_ERROR, message, 402);
  }
}
