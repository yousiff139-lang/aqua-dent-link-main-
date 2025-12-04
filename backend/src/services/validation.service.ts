import { z } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';

export class ValidationService {
  /**
   * Appointment validation schemas
   */
  private appointmentSchemas = {
    create: z.object({
      patient_name: z.string().min(1, 'Patient name is required').max(255),
      patient_email: z.string().email('Invalid email format'),
      patient_phone: z.string().min(1, 'Phone number is required').max(50),
      dentist_email: z.string().email('Invalid dentist email format'),
      dentist_id: z.string().uuid('Invalid dentist ID').optional(),
      reason: z.string().min(1, 'Reason for visit is required'),
      appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
      appointment_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:mm format'),
      payment_method: z.enum(['stripe', 'cash'], { errorMap: () => ({ message: 'Payment method must be stripe or cash' }) }),
      notes: z.string().optional(),
      patient_notes: z.string().optional(),
      medical_history: z.string().optional(),
      documents: z.any().optional(),
    }),

    update: z.object({
      appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
      appointment_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:mm format').optional(),
      appointment_type: z.string().min(1).optional(),
      status: z
        .enum(['pending', 'confirmed', 'completed', 'cancelled'])
        .optional(),
      payment_status: z
        .enum(['pending', 'paid', 'failed'])
        .optional(),
      notes: z.string().optional(),
    }),

    filters: z.object({
      status: z.string().optional().transform((val) => {
        if (!val) return undefined;
        return val.split(',').filter(s => ['pending', 'confirmed', 'completed', 'cancelled'].includes(s));
      }),
      date_from: z.string().optional(),
      date_to: z.string().optional(),
      limit: z.string().optional().transform((val) => val ? Math.min(parseInt(val, 10), 100) : 20),
      offset: z.string().optional().transform((val) => val ? Math.max(parseInt(val, 10), 0) : 0),
    }),
  };

  /**
   * Availability validation schemas
   */
  private availabilitySchemas = {
    schedule: z.object({
      monday: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      tuesday: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      wednesday: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      thursday: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      friday: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      saturday: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      sunday: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    }),

    slotQuery: z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    }),
  };

  /**
   * Profile validation schemas
   */
  private profileSchemas = {
    update: z.object({
      full_name: z.string().min(1).max(100).optional(),
      phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional(),
    }),
  };

  /**
   * Validate appointment creation data
   */
  validateCreateAppointment(data: any): any {
    try {
      return this.appointmentSchemas.create.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Appointment creation validation failed', {
          errors: error.errors,
        });
        throw AppError.validation('Invalid appointment data', {
          issues: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      throw error;
    }
  }

  /**
   * Validate appointment update data
   */
  validateUpdateAppointment(data: any): any {
    try {
      return this.appointmentSchemas.update.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Appointment update validation failed', {
          errors: error.errors,
        });
        throw AppError.validation('Invalid appointment update data', {
          issues: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      throw error;
    }
  }

  /**
   * Validate appointment filters
   */
  validateAppointmentFilters(data: any): any {
    try {
      return this.appointmentSchemas.filters.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Appointment filters validation failed', {
          errors: error.errors,
        });
        throw AppError.validation('Invalid filter parameters', {
          issues: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      throw error;
    }
  }

  /**
   * Validate availability schedule
   */
  validateAvailabilitySchedule(data: any): any {
    try {
      const validated = this.availabilitySchemas.schedule.parse(data);

      // Additional business rule: start time must be before end time
      for (const [day, timeRange] of Object.entries(validated)) {
        if (timeRange) {
          const [start, end] = (timeRange as string).split('-');
          if (start >= end) {
            throw AppError.validation(
              `Invalid time range for ${day}: start time must be before end time`
            );
          }
        }
      }

      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Availability schedule validation failed', {
          errors: error.errors,
        });
        throw AppError.validation('Invalid availability schedule', {
          issues: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      throw error;
    }
  }

  /**
   * Validate slot query parameters
   */
  validateSlotQuery(data: any): any {
    try {
      return this.availabilitySchemas.slotQuery.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Slot query validation failed', {
          errors: error.errors,
        });
        throw AppError.validation('Invalid query parameters', {
          issues: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      throw error;
    }
  }

  /**
   * Validate profile update data
   */
  validateProfileUpdate(data: any): any {
    try {
      return this.profileSchemas.update.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Profile update validation failed', {
          errors: error.errors,
        });
        throw AppError.validation('Invalid profile data', {
          issues: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      throw error;
    }
  }

  /**
   * Validate UUID format
   */
  validateUUID(id: string, fieldName: string = 'ID'): void {
    const uuidSchema = z.string().uuid();
    try {
      uuidSchema.parse(id);
    } catch (error) {
      throw AppError.validation(`Invalid ${fieldName} format`);
    }
  }

  /**
   * Validate date is in the future
   */
  validateFutureDate(date: Date, fieldName: string = 'date'): void {
    if (date <= new Date()) {
      throw AppError.validation(`${fieldName} must be in the future`);
    }
  }

  /**
   * Validate cancellation window (1 hour before appointment)
   */
  validateCancellationWindow(appointmentDate: Date): void {
    const oneHourBefore = new Date(appointmentDate.getTime() - 60 * 60 * 1000);
    if (new Date() > oneHourBefore) {
      throw AppError.cancellationWindowExpired(
        'Cannot cancel appointment within 1 hour of scheduled time'
      );
    }
  }

  /**
   * Validate pagination parameters
   */
  validatePagination(limit?: number, offset?: number): { limit: number; offset: number } {
    const defaultLimit = 20;
    const maxLimit = 100;

    const validatedLimit = Math.min(limit || defaultLimit, maxLimit);
    const validatedOffset = Math.max(offset || 0, 0);

    return {
      limit: validatedLimit,
      offset: validatedOffset,
    };
  }
}

// Export singleton instance
export const validationService = new ValidationService();
