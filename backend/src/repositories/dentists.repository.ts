import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { Dentist, AvailabilitySchedule } from '../types/index.js';
import { AppError } from '../utils/errors.js';

export class DentistsRepository {
  private cache: Map<string, { data: Dentist; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

  /**
   * Find dentist by ID with caching
   */
  async findById(id: string): Promise<Dentist | null> {
    try {
      // Check cache first
      const cached = this.cache.get(id);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        logger.debug('Dentist found in cache', { dentistId: id });
        return cached.data;
      }

      const { data, error } = await supabase
        .from('dentists')
        .select(`
          *,
          profile:profiles!inner(full_name, email, phone)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      const dentist = data as Dentist;

      // Cache the result
      this.cache.set(id, { data: dentist, timestamp: Date.now() });

      return dentist;
    } catch (error) {
      logger.error('Failed to find dentist by ID', { id, error });
      throw AppError.internal('Failed to fetch dentist');
    }
  }

  /**
   * Find all dentists with optional filters
   */
  async findAll(filters?: {
    specialization?: string;
    min_rating?: number;
    limit?: number;
    offset?: number;
  }): Promise<Dentist[]> {
    try {
      let query = supabase
        .from('dentists')
        .select(`
          *,
          profile:profiles!inner(full_name, email, phone)
        `)
        .order('rating', { ascending: false });

      if (filters?.specialization) {
        query = query.eq('specialization', filters.specialization);
      }

      if (filters?.min_rating) {
        query = query.gte('rating', filters.min_rating);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(
          filters.offset,
          filters.offset + (filters.limit || 20) - 1
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data as Dentist[]) || [];
    } catch (error) {
      logger.error('Failed to find dentists', { filters, error });
      throw AppError.internal('Failed to fetch dentists');
    }
  }

  /**
   * Get dentist availability schedule
   */
  async getAvailability(id: string): Promise<AvailabilitySchedule> {
    try {
      const { data, error } = await supabase
        .from('dentists')
        .select('available_times')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw AppError.notFound('Dentist not found');
        }
        throw error;
      }

      return (data?.available_times as AvailabilitySchedule) || {};
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to get dentist availability', { id, error });
      throw AppError.internal('Failed to fetch availability');
    }
  }

  /**
   * Update dentist availability schedule
   */
  async updateAvailability(
    id: string,
    availability: AvailabilitySchedule
  ): Promise<Dentist> {
    try {
      const { data, error } = await supabase
        .from('dentists')
        .update({
          available_times: availability,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          profile:profiles!inner(full_name, email, phone)
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw AppError.notFound('Dentist not found');
        }
        throw error;
      }

      const dentist = data as Dentist;

      // Invalidate cache
      this.cache.delete(id);

      logger.info('Dentist availability updated', {
        dentistId: id,
        availability,
      });

      return dentist;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to update dentist availability', { id, error });
      throw AppError.internal('Failed to update availability');
    }
  }

  /**
   * Invalidate cache for a specific dentist
   */
  invalidateCache(id: string): void {
    this.cache.delete(id);
    logger.debug('Cache invalidated for dentist', { dentistId: id });
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('All dentist cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const dentistsRepository = new DentistsRepository();
