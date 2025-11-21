import { Request, Response, NextFunction } from 'express';
import { adminApiKeys } from '../config/env.js';
import { authenticateRequest } from './auth.js';
import { requireAdmin } from './authorization.js';
import { AuthenticatedRequest } from '../types/index.js';
import { logger } from '../config/logger.js';

/**
 * Middleware that grants access to admin routes if the request
 * either includes a valid admin API key or passes the standard
 * authentication + admin role check.
 */
export const ensureAdminAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Check for API key in headers
  const apiKeyHeader =
    (req.headers['x-admin-api-key'] as string | undefined) ??
    (req.headers['x-admin-key'] as string | undefined);

  // If API key is provided and valid, grant access
  if (apiKeyHeader) {
    const trimmedKey = apiKeyHeader.trim();
    
    // If no API keys configured, allow any key (development mode)
    if (adminApiKeys.length === 0) {
      logger.warn('No admin API keys configured, allowing access (development mode)', {
        path: req.path,
        providedKey: trimmedKey.substring(0, 10) + '...',
      });
      (req as AuthenticatedRequest).user = {
        id: 'admin-api-key',
        email: 'admin@system.local',
        role: 'admin',
      };
      next();
      return;
    }

    // Check if provided key matches any configured key
    if (adminApiKeys.includes(trimmedKey)) {
      logger.debug('Admin access granted via API key', {
        path: req.path,
      });
      (req as AuthenticatedRequest).user = {
        id: 'admin-api-key',
        email: 'admin@system.local',
        role: 'admin',
      };
      next();
      return;
    } else {
      logger.warn('Invalid admin API key provided', {
        path: req.path,
        providedKey: trimmedKey.substring(0, 10) + '...',
      });
    }
  }

  // If no API key or invalid key, try standard authentication
  authenticateRequest(req, res, (authErr?: any) => {
    if (authErr) {
      // If authentication fails and no API key was provided, give helpful error
      if (!apiKeyHeader) {
        logger.warn('Admin access denied: No API key or token provided', {
          path: req.path,
          method: req.method,
        });
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'No token or API key provided. Please ensure VITE_ADMIN_API_KEY is set in admin-app/.env',
            timestamp: new Date().toISOString(),
          },
        });
      }
      next(authErr);
      return;
    }

    requireAdmin(req as AuthenticatedRequest, res, next);
  });
};

