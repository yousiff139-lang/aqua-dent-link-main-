import { Request, Response, NextFunction } from 'express';
import { supabaseAuth } from '../config/supabase.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { AuthenticatedRequest } from '../types/index.js';
import jwt from 'jsonwebtoken';

/**
 * Middleware to authenticate requests using JWT tokens
 */
export const authenticateRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('No authorization header provided', {
        path: req.path,
        method: req.method,
        hasHeader: !!authHeader,
      });
      throw AppError.unauthorized('No token provided');
    }

    const token = authHeader.replace('Bearer ', '');

    // Log token receipt for debugging (first 20 chars only)
    logger.debug('Received authentication token', {
      path: req.path,
      method: req.method,
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...',
    });

    // Try to verify with our custom JWT first (for dentist portal)
    let isCustomJWT = false;
    const JWT_SECRET = process.env.JWT_SECRET || 'dentist-portal-secret-key-change-in-production-2024';

    // First, try to decode without verification to check if it's a dentist token
    // This is faster and doesn't fail on expired tokens
    let decodedUnverified: any = null;
    try {
      decodedUnverified = jwt.decode(token, { complete: false }) as any;
    } catch (decodeError: any) {
      logger.debug('Could not decode token, trying Supabase', {
        decodeError: decodeError.message,
        path: req.path,
      });
    }

    // If it looks like a dentist token, try to verify it
    if (decodedUnverified && decodedUnverified.type === 'dentist') {
      try {
        const decoded = jwt.verify(token, JWT_SECRET, { complete: false }) as any;

        // Verification succeeded - this is a valid dentist token
        isCustomJWT = true;
        (req as AuthenticatedRequest).user = {
          id: decoded.dentistId,
          email: decoded.email,
          role: 'dentist',
        };

        logger.debug('Dentist authenticated via JWT', {
          userId: decoded.dentistId,
          email: decoded.email,
          path: req.path,
        });

        next();
        return;
      } catch (jwtVerifyError: any) {
        // Verification failed for a dentist token - this is an error
        logger.warn('Dentist token verification failed', {
          error: jwtVerifyError.name,
          message: jwtVerifyError.message,
          path: req.path,
          method: req.method,
          decodedEmail: decodedUnverified?.email,
          decodedDentistId: decodedUnverified?.dentistId,
          tokenExp: decodedUnverified?.exp,
          currentTime: Math.floor(Date.now() / 1000),
        });

        // Provide specific error messages
        let errorMessage = 'Authentication failed. Please log in again.';
        if (jwtVerifyError.name === 'TokenExpiredError') {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (jwtVerifyError.name === 'JsonWebTokenError') {
          errorMessage = 'Invalid token. Please log in again.';
        }

        throw AppError.unauthorized(errorMessage);
      }
    }

    // If it's not a dentist token, log and continue to Supabase
    if (decodedUnverified && decodedUnverified.type !== 'dentist') {
      logger.debug('Token is not a dentist token, trying Supabase', {
        tokenType: decodedUnverified.type,
        path: req.path,
      });
    }

    // If not a custom JWT, verify token with Supabase
    if (!isCustomJWT) {
      const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

      if (error || !user) {
        logger.warn('Authentication failed', {
          error: error?.message,
          path: req.path,
          method: req.method,
        });
        throw AppError.unauthorized('Invalid token');
      }

      // Attach user to request object
      (req as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email || '',
        role: user.user_metadata?.role,
      };

      logger.debug('User authenticated', {
        userId: user.id,
        email: user.email,
        path: req.path,
      });
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      logger.error('Authentication error', { error });
      next(AppError.unauthorized('Authentication failed'));
    }
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for endpoints that work for both authenticated and anonymous users
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      next();
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

    if (!error && user) {
      (req as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email || '',
        role: user.user_metadata?.role,
      };
    }

    next();
  } catch (error) {
    // Log error but don't fail the request
    logger.warn('Optional auth failed', { error });
    next();
  }
};

// Alias for backward compatibility
export const authenticate = authenticateRequest;
