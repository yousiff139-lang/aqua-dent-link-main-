import { Response } from 'express';
import { supabase } from '../config/supabase.js';
import { dentistsRepository } from '../repositories/dentists.repository.js';
import { validationService } from '../services/validation.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';

export class ProfilesController {
  /**
   * GET /api/profiles/me
   * Get current user's profile
   */
  getCurrentUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (!data) {
        throw AppError.notFound('Profile not found');
      }

      logger.info('Profile retrieved', { userId });

      res.json(data);
    } catch (error) {
      logger.error('Failed to get profile', { userId, error });
      throw AppError.internal('Failed to fetch profile');
    }
  });

  /**
   * PUT /api/profiles/me
   * Update current user's profile
   */
  updateCurrentUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;

    // Validate request body
    const validatedData = validationService.validateProfileUpdate(req.body);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        throw AppError.notFound('Profile not found');
      }

      logger.info('Profile updated', { userId });

      res.json(data);
    } catch (error) {
      logger.error('Failed to update profile', { userId, error });
      throw AppError.internal('Failed to update profile');
    }
  });

  /**
   * GET /api/profiles/dentists
   * List all dentist profiles
   */
  listDentists = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { specialization, min_rating, limit, offset } = req.query;

    const filters: any = {};

    if (specialization && typeof specialization === 'string') {
      filters.specialization = specialization;
    }

    if (min_rating && typeof min_rating === 'string') {
      filters.min_rating = parseFloat(min_rating);
    }

    if (limit && typeof limit === 'string') {
      filters.limit = parseInt(limit, 10);
    }

    if (offset && typeof offset === 'string') {
      filters.offset = parseInt(offset, 10);
    }

    const dentists = await dentistsRepository.findAll(filters);

    logger.info('Dentists listed', {
      count: dentists.length,
      filters,
      userId: req.user?.id,
    });

    res.json({
      data: dentists,
      count: dentists.length,
    });
  });

  /**
   * GET /api/profiles/dentists/:id
   * Get specific dentist profile
   */
  getDentistById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    validationService.validateUUID(id, 'Dentist ID');

    const dentist = await dentistsRepository.findById(id);

    if (!dentist) {
      throw AppError.notFound('Dentist not found');
    }

    logger.info('Dentist profile retrieved', {
      dentistId: id,
      userId: req.user?.id,
    });

    res.json(dentist);
  });
}

// Export singleton instance
export const profilesController = new ProfilesController();
