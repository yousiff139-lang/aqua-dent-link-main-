import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../types/index.js';

// Extend Express Request type to include requestId and userId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      userId?: string;
    }
  }
}

/**
 * Middleware to add a unique request ID to each request
 * This ID can be used for tracing requests through the system
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate a unique request ID
  const requestId = randomUUID();
  req.requestId = requestId;
  
  // Add request ID to response headers for client-side tracing
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

/**
 * Middleware to log all incoming requests and outgoing responses
 * Logs include: timestamp, method, path, user ID, status code, duration, and request ID
 */
export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const requestId = req.requestId || 'unknown';
  
  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.originalUrl || req.url,
    query: req.query,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.userId || 'anonymous',
  });

  // Capture the original res.json to log response
  const originalJson = res.json.bind(res);
  
  res.json = function (body: any) {
    const duration = Date.now() - startTime;
    
    // Log outgoing response
    logger.info('Outgoing response', {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.userId || 'anonymous',
    });
    
    return originalJson(body);
  };

  // Handle response finish event for cases where res.json is not called
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Only log if we haven't already logged via res.json
    if (!res.headersSent || res.statusCode >= 400) {
      logger.info('Response finished', {
        requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: req.userId || 'anonymous',
      });
    }
  });

  next();
};

/**
 * Middleware to extract user ID from JWT token and add it to the request
 * This should be used after authentication middleware
 */
export const userIdExtractorMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Extract user ID from authenticated user (set by auth middleware)
  const authReq = req as AuthenticatedRequest;
  if (authReq.user?.id) {
    req.userId = authReq.user.id;
  }
  
  next();
};
