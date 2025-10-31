import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { ErrorResponse, ErrorCode } from '../types/index.js';
import { ZodError } from 'zod';

/**
 * Global error handling middleware
 * Must be registered after all routes
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Handle AppError (our custom errors)
  if (error instanceof AppError) {
    const errorResponse: ErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
      },
    };

    logger.warn('Application error', {
      requestId: (req as any).requestId || 'unknown',
      userId: (req as any).userId || 'anonymous',
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      path: req.path,
      method: req.method,
      details: error.details,
    });

    res.status(error.statusCode).json(errorResponse);
    return;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const errorResponse: ErrorResponse = {
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: {
          issues: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        },
        timestamp: new Date().toISOString(),
      },
    };

    logger.warn('Validation error', {
      requestId: (req as any).requestId || 'unknown',
      userId: (req as any).userId || 'anonymous',
      path: req.path,
      method: req.method,
      errors: error.errors,
    });

    res.status(400).json(errorResponse);
    return;
  }

  // Handle unexpected errors with full stack trace
  logger.error('Unexpected error', {
    requestId: (req as any).requestId || 'unknown',
    userId: (req as any).userId || 'anonymous',
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  const errorResponse: ErrorResponse = {
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    },
  };

  res.status(500).json(errorResponse);
};

/**
 * Middleware to handle 404 errors
 * Should be registered after all routes but before error handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = AppError.notFound(`Route ${req.method} ${req.path} not found`);
  next(error);
};

/**
 * Middleware to validate request body against a Zod schema
 */
export const validateBody = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to validate request query parameters against a Zod schema
 */
export const validateQuery = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to validate request params against a Zod schema
 */
export const validateParams = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      next(error);
    }
  };
};
