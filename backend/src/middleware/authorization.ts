import { Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { AuthenticatedRequest } from '../types/index.js';

/**
 * Get user roles from database
 */
async function getUserRoles(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) {
    logger.error('Failed to fetch user roles', { userId, error });
    return [];
  }

  return data?.map(r => r.role) || [];
}

/**
 * Middleware to require specific role(s)
 * Usage: requireRole('admin') or requireRole(['admin', 'dentist'])
 */
export const requireRole = (requiredRoles: string | string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      const userRoles = await getUserRoles(req.user.id);

      const hasRequiredRole = roles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        logger.warn('Authorization failed - insufficient permissions', {
          userId: req.user.id,
          userRoles,
          requiredRoles: roles,
          path: req.path,
        });
        throw AppError.forbidden(`Requires one of the following roles: ${roles.join(', ')}`);
      }

      logger.debug('Authorization successful', {
        userId: req.user.id,
        userRoles,
        path: req.path,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check resource ownership
 * Verifies that the authenticated user owns the requested resource
 */
export const requireOwnership = (resourceType: 'appointment' | 'profile') => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const resourceId = req.params.id;
      
      if (!resourceId) {
        throw AppError.validation('Resource ID is required');
      }

      let isOwner = false;
      let resource: any = null;

      // Check ownership based on resource type
      switch (resourceType) {
        case 'appointment': {
          const { data, error } = await supabase
            .from('appointments')
            .select('patient_id, dentist_id')
            .eq('id', resourceId)
            .single();

          if (error || !data) {
            throw AppError.notFound('Appointment not found');
          }

          resource = data;
          
          // User is owner if they are the patient or the dentist
          isOwner = data.patient_id === req.user.id || data.dentist_id === req.user.id;
          break;
        }

        case 'profile': {
          // For profiles, the resource ID should match the user ID
          isOwner = resourceId === req.user.id;
          break;
        }

        default:
          throw AppError.internal('Invalid resource type');
      }

      if (!isOwner) {
        // Check if user is admin (admins can access all resources)
        const userRoles = await getUserRoles(req.user.id);
        const isAdmin = userRoles.includes('admin');

        if (!isAdmin) {
          logger.warn('Authorization failed - not resource owner', {
            userId: req.user.id,
            resourceType,
            resourceId,
            path: req.path,
          });
          throw AppError.forbidden('Access denied');
        }
      }

      logger.debug('Ownership verified', {
        userId: req.user.id,
        resourceType,
        resourceId,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user is a dentist
 */
export const requireDentist = requireRole('dentist');

/**
 * Middleware to check if user is a patient
 */
export const requirePatient = requireRole('patient');

/**
 * Middleware to check if user is an admin
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to allow access for dentists or admins
 */
export const requireDentistOrAdmin = requireRole(['dentist', 'admin']);
