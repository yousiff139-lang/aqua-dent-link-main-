import { Request, Response, NextFunction } from 'express';
import { supabaseAuth } from '../config/supabase.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { AuthenticatedRequest } from '../types/index.js';

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
      throw AppError.unauthorized('No token provided');
    }

    const token = authHeader.replace('Bearer ', '');

    // Try to verify with our custom JWT first (for dentist portal)
    let isCustomJWT = false;
    try {
      const jwt = await import('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'dentist-portal-secret-key-change-in-production-2024';
      
      const decoded = jwt.verify(token, JWT_SECRET, { complete: false }) as any;
      
      if (decoded && decoded.type === 'dentist') {
        // This is a dentist portal token
        isCustomJWT = true;
        (req as AuthenticatedRequest).user = {
          id: decoded.dentistId,
          email: decoded.email,
          role: 'dentist',
        };

        logger.debug('Dentist authenticated', {
          userId: decoded.dentistId,
          email: decoded.email,
          path: req.path,
        });

        next();
        return;
      }
    } catch (jwtError: any) {
      // If it's a JWT error but not a verification error, log it
      if (jwtError.name !== 'JsonWebTokenError') {
        logger.debug('JWT verification failed, trying Supabase', { error: jwtError.message });
      }
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
