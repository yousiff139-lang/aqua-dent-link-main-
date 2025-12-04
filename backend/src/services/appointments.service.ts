import { appointmentsRepository } from '../repositories/appointments.repository.js';
import { logger } from '../config/logger.js';
import {
  Appointment,
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
  AppointmentFilters,
  PaginatedResponse,
} from '../types/index.js';
import { AppError } from '../utils/errors.js';
// Real-time sync is handled by Supabase database triggers automatically

export class AppointmentsService {
  /**
   * Create a new appointment with validation and slot availability check
   */
  async createAppointment(
    data: CreateAppointmentDTO,
    patientId?: string
  ): Promise<Appointment> {
    try {
      // Validate required fields
      if (!data.patient_name || !data.patient_email || !data.patient_phone) {
        throw AppError.validation('Patient information is required');
      }

      if (!data.dentist_email) {
        throw AppError.validation('Dentist information is required');
      }

      if (!data.appointment_date || !data.appointment_time) {
        throw AppError.validation('Appointment date and time are required');
      }

      if (!data.payment_method) {
        throw AppError.validation('Payment method is required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.patient_email)) {
        throw AppError.validation('Invalid email format');
      }

      // Validate appointment date is not in the past
      const appointmentDate = new Date(data.appointment_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (appointmentDate < today) {
        throw AppError.validation('Appointment date cannot be in the past');
      }

      // If appointment is today, check if time has passed
      if (appointmentDate.getTime() === today.getTime()) {
        const now = new Date();
        const [hours, minutes] = data.appointment_time.split(':').map(Number);
        const appointmentTime = new Date();
        appointmentTime.setHours(hours, minutes, 0, 0);

        if (appointmentTime <= now) {
          throw AppError.validation('Cannot book appointment in the past');
        }
      }

      // Check slot availability
      const isAvailable = await this.checkSlotAvailability(
        data.dentist_email,
        data.appointment_date,
        data.appointment_time
      );

      if (!isAvailable) {
        // Get alternative available slots to suggest to the user
        const alternativeSlots = await this.getAlternativeSlots(
          data.dentist_email,
          data.appointment_date,
          data.appointment_time,
          5
        );

        throw AppError.slotUnavailable(
          'The selected time slot is no longer available',
          {
            alternativeSlots: alternativeSlots.map(time => ({
              date: data.appointment_date,
              time,
            })),
          }
        );
      }

      // Get dentist_id if not provided - look up by email
      let dentistId = data.dentist_id;
      if (!dentistId) {
        // Look up dentist by email from profiles table
        const { data: profile, error } = await (await import('../config/supabase.js')).supabase
          .from('profiles')
          .select('id')
          .eq('email', data.dentist_email)
          .single();

        if (profile) {
          dentistId = profile.id;
        } else {
          // If not found in profiles, try dentists table
          const { data: dentist, error: dentistError } = await (await import('../config/supabase.js')).supabase
            .from('dentists')
            .select('id')
            .eq('email', data.dentist_email)
            .single();

          if (dentistError || !dentist) {
            logger.error('Failed to find dentist by email in profiles or dentists table', {
              dentistEmail: data.dentist_email,
              error: error || dentistError
            });
            throw AppError.validation('Dentist not found with the provided email');
          }

          dentistId = dentist.id;
        }
      }

      // Create appointment
      const appointment = await appointmentsRepository.create({
        ...data,
        patient_id: patientId,
        dentist_id: dentistId || '',
      });

      logger.info('Appointment created successfully', {
        appointmentId: appointment.id,
        patientEmail: data.patient_email,
        dentistEmail: data.dentist_email,
        date: data.appointment_date,
        time: data.appointment_time,
      });

      // Real-time sync is handled automatically by Supabase database triggers
      // The trigger broadcasts to all connected clients (admin, dentist, patient, chatbot)
      logger.debug('Appointment change will be broadcast via database trigger', {
        appointmentId: appointment.id,
      });

      return appointment;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to create appointment', { data, patientId, error });
      throw AppError.internal('Failed to create appointment');
    }
  }

  /**
   * Update an existing appointment with authorization checks
   */
  async updateAppointment(
    id: string,
    data: UpdateAppointmentDTO,
    userId: string,
    userRole?: string
  ): Promise<Appointment> {
    try {
      // Verify appointment exists
      const existing = await appointmentsRepository.findById(id);

      if (!existing) {
        throw AppError.notFound('Appointment not found');
      }

      // Check if user is authorized (patient or dentist)
      const isPatient = existing.patient_id === userId;
      const isDentist = existing.dentist_id === userId;

      // Also check by email (for dentist portal authentication)
      let isDentistByEmail = false;
      if (!isDentist && userId) {
        const { data: userProfile } = await (await import('../config/supabase.js')).supabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .single();

        if (userProfile?.email === existing.dentist_email) {
          isDentistByEmail = true;
        }
      }

      if (!isPatient && !isDentist && !isDentistByEmail) {
        throw AppError.forbidden('Not authorized to update this appointment');
      }

      // Validate date/time updates
      if (data.appointment_date || data.appointment_time) {
        const newDate = data.appointment_date || existing.appointment_date.toString().split('T')[0];
        const newTime = data.appointment_time || existing.appointment_time;

        // Validate new date is not in the past
        const appointmentDate = new Date(newDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (appointmentDate < today) {
          throw AppError.validation('Appointment date cannot be in the past');
        }

        // Check slot availability if date or time changed
        if (newDate !== existing.appointment_date.toString().split('T')[0] ||
          newTime !== existing.appointment_time) {
          const isAvailable = await this.checkSlotAvailability(
            existing.dentist_email,
            newDate,
            newTime,
            id
          );

          if (!isAvailable) {
            // Get alternative available slots to suggest to the user
            const alternativeSlots = await this.getAlternativeSlots(
              existing.dentist_email,
              newDate,
              newTime,
              5
            );

            throw AppError.slotUnavailable(
              'The selected time slot is not available',
              {
                alternativeSlots: alternativeSlots.map(time => ({
                  date: newDate,
                  time,
                })),
              }
            );
          }
        }
      }

      // Update appointment
      const updated = await appointmentsRepository.update(id, data);

      logger.info('Appointment updated successfully', {
        appointmentId: id,
        userId,
        updates: data,
      });

      // Real-time sync is handled automatically by Supabase database triggers
      logger.debug('Appointment update will be broadcast via database trigger', {
        appointmentId: updated.id,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to update appointment', { id, data, userId, error });
      throw AppError.internal('Failed to update appointment');
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(id: string, userId: string): Promise<Appointment> {
    try {
      // Verify appointment exists and user has access
      const existing = await appointmentsRepository.findById(id);

      if (!existing) {
        throw AppError.notFound('Appointment not found');
      }

      // Check if user is authorized (patient or dentist)
      // For dentist portal, userId is dentistId, so we need to check by email or ID
      const supabaseClient = (await import('../config/supabase.js')).supabase;

      // Check if user is dentist
      const { data: dentistRecord } = await supabaseClient
        .from('dentists')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle();

      let isAuthorized = false;
      let userEmail: string | null = null;
      let isAdmin = false;

      if (dentistRecord) {
        // This is a dentist - check if they're the dentist for this appointment
        userEmail = dentistRecord.email;
        isAuthorized = existing.dentist_id === userId ||
          existing.dentist_email === dentistRecord.email;
      } else {
        // Try to find in profiles table (for Supabase auth users)
        const { data: userProfile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('id, email, role')
          .eq('id', userId)
          .maybeSingle();

        if (!profileError && userProfile) {
          userEmail = userProfile.email;
          isAdmin = userProfile.role === 'admin';
          isAuthorized = isAdmin ||
            existing.patient_id === userId ||
            existing.dentist_id === userId ||
            existing.dentist_email === userProfile.email;
        }

        // Also check user_roles table
        if (!isAuthorized) {
          const { data: userRole } = await supabaseClient
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .maybeSingle();

          if (userRole) {
            isAdmin = isAdmin || userRole.role === 'admin';
            isAuthorized = isAdmin || existing.patient_id === userId || existing.dentist_id === userId;
          }
        }
      }

      if (!isAuthorized) {
        logger.warn('Unauthorized attempt to cancel appointment', {
          userId,
          userEmail,
          appointmentId: id,
          dentistEmail: existing.dentist_email,
          dentistId: existing.dentist_id,
        });
        throw AppError.forbidden('Not authorized to cancel this appointment');
      }

      // Cancel appointment by updating status to cancelled (don't delete)
      const cancelled = await appointmentsRepository.update(id, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Cancelled by dentist',
      } as any);

      logger.info('Appointment cancelled successfully', {
        appointmentId: id,
        userId,
        userEmail,
        status: cancelled.status,
      });

      // Real-time sync is handled automatically by Supabase database triggers
      logger.debug('Appointment cancellation will be broadcast via database trigger', {
        appointmentId: cancelled.id,
      });

      return cancelled;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to cancel appointment', { id, userId, error });
      throw AppError.internal('Failed to cancel appointment');
    }
  }

  /**
   * Get appointments for a patient with filtering
   */
  async getAppointmentsByPatient(
    patientEmail: string,
    filters?: AppointmentFilters
  ): Promise<Appointment[]> {
    try {
      return await appointmentsRepository.findByPatientEmail(patientEmail, filters);
    } catch (error) {
      logger.error('Failed to get patient appointments', { patientEmail, error });
      throw AppError.internal('Failed to fetch appointments');
    }
  }

  /**
   * Get appointments for a dentist with filtering and pagination
   */
  async getAppointmentsByDentist(
    dentistEmail: string,
    filters?: AppointmentFilters
  ): Promise<PaginatedResponse<Appointment>> {
    try {
      const appointments = await appointmentsRepository.findByDentistEmail(dentistEmail, filters);

      // Calculate pagination info
      const limit = filters?.limit || 20;
      const offset = filters?.offset || 0;
      const total = appointments.length;
      const hasMore = total === limit; // Simple check, could be improved with count query

      return {
        data: appointments,
        pagination: {
          total,
          limit,
          offset,
          hasMore,
        },
      };
    } catch (error) {
      logger.error('Failed to get dentist appointments', { dentistEmail, error });
      throw AppError.internal('Failed to fetch appointments');
    }
  }

  /**
   * Get appointment by ID
   */
  async getAppointmentById(id: string, userId?: string): Promise<Appointment> {
    try {
      const appointment = await appointmentsRepository.findById(id);

      if (!appointment) {
        throw AppError.notFound('Appointment not found');
      }

      // Check if user has access (if userId provided)
      if (userId && appointment.patient_id !== userId && appointment.dentist_id !== userId) {
        throw AppError.forbidden('Not authorized to view this appointment');
      }

      return appointment;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to get appointment', { id, userId, error });
      throw AppError.internal('Failed to fetch appointment');
    }
  }

  /**
   * Mark appointment as completed (for dentists)
   */
  async markAppointmentComplete(id: string, userId: string): Promise<Appointment> {
    try {
      // Verify appointment exists
      const existing = await appointmentsRepository.findById(id);

      if (!existing) {
        throw AppError.notFound('Appointment not found');
      }

      const supabaseClient = (await import('../config/supabase.js')).supabase;

      // For dentist portal authentication, userId is the dentistId from the dentists table
      // First, try to find the dentist by ID
      const { data: dentistRecord } = await supabaseClient
        .from('dentists')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle();

      let userEmail: string | null = null;
      let isDentist = false;
      let isAdmin = false;

      if (dentistRecord) {
        // This is a dentist from the dentists table
        userEmail = dentistRecord.email;
        isDentist = true;
      } else {
        // Try to find in profiles table (for Supabase auth users)
        const { data: userProfile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('id, email, role')
          .eq('id', userId)
          .maybeSingle();

        if (!profileError && userProfile) {
          userEmail = userProfile.email;
          isDentist = userProfile.role === 'dentist';
          isAdmin = userProfile.role === 'admin';
        }

        // Also check user_roles table
        const { data: userRole } = await supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (userRole) {
          isDentist = isDentist || userRole.role === 'dentist';
          isAdmin = isAdmin || userRole.role === 'admin';
        }
      }

      if (!userEmail) {
        logger.error('Failed to find user email', { userId });
        throw AppError.forbidden('Not authorized to complete this appointment');
      }

      // Check if user is the dentist for this appointment
      // Match by email (most reliable) or by ID
      const isAuthorized = isAdmin ||
        (isDentist && (
          userEmail === existing.dentist_email ||
          existing.dentist_id === userId ||
          (dentistRecord && dentistRecord.email === existing.dentist_email)
        ));

      if (!isAuthorized) {
        logger.warn('Unauthorized attempt to mark appointment complete', {
          userId,
          userEmail,
          appointmentId: id,
          dentistEmail: existing.dentist_email,
          dentistId: existing.dentist_id,
          isDentist,
          isAdmin,
        });
        throw AppError.forbidden('Not authorized to complete this appointment');
      }

      // Allow marking as completed even for future appointments (dentist discretion)
      // Update status to completed
      const updated = await appointmentsRepository.update(id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      } as any);

      logger.info('Appointment marked as completed', {
        appointmentId: id,
        userId,
        userEmail,
        dentistEmail: existing.dentist_email,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to mark appointment complete', { id, userId, error });
      throw AppError.internal('Failed to mark appointment complete');
    }
  }

  /**
   * Reschedule appointment with validation
   */
  async rescheduleAppointment(
    id: string,
    newDate: string,
    newTime: string,
    userId: string
  ): Promise<Appointment> {
    try {
      // Verify appointment exists
      const existing = await appointmentsRepository.findById(id);

      if (!existing) {
        throw AppError.notFound('Appointment not found');
      }

      // Check if user is authorized (patient or dentist)
      if (existing.patient_id !== userId && existing.dentist_id !== userId) {
        throw AppError.forbidden('Not authorized to reschedule this appointment');
      }

      // Validate new date is not in the past
      const appointmentDate = new Date(newDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (appointmentDate < today) {
        throw AppError.validation('Appointment date cannot be in the past');
      }

      // Check slot availability for new date/time
      const isAvailable = await this.checkSlotAvailability(
        existing.dentist_email,
        newDate,
        newTime,
        id
      );

      if (!isAvailable) {
        // Get alternative available slots to suggest to the user
        const alternativeSlots = await this.getAlternativeSlots(
          existing.dentist_email,
          newDate,
          newTime,
          5
        );

        throw AppError.slotUnavailable(
          'The selected time slot is not available',
          {
            alternativeSlots: alternativeSlots.map(time => ({
              date: newDate,
              time,
            })),
          }
        );
      }

      // Update appointment with new date and time
      const updated = await appointmentsRepository.update(id, {
        appointment_date: newDate,
        appointment_time: newTime,
      });

      logger.info('Appointment rescheduled', {
        appointmentId: id,
        userId,
        oldDate: existing.appointment_date,
        oldTime: existing.appointment_time,
        newDate,
        newTime,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to reschedule appointment', { id, newDate, newTime, userId, error });
      throw AppError.internal('Failed to reschedule appointment');
    }
  }

  /**
   * Check slot availability to prevent double-booking
   */
  async checkSlotAvailability(
    dentistEmail: string,
    appointmentDate: string,
    appointmentTime: string,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    try {
      return await appointmentsRepository.checkSlotAvailability(
        dentistEmail,
        appointmentDate,
        appointmentTime,
        excludeAppointmentId
      );
    } catch (error) {
      logger.error('Failed to check slot availability', {
        dentistEmail,
        appointmentDate,
        appointmentTime,
        error,
      });
      throw AppError.internal('Failed to check slot availability');
    }
  }

  /**
   * Get alternative available time slots when requested slot is unavailable
   */
  async getAlternativeSlots(
    dentistEmail: string,
    requestedDate: string,
    requestedTime: string,
    maxSlots: number = 5
  ): Promise<string[]> {
    try {
      return await appointmentsRepository.getAlternativeSlots(
        dentistEmail,
        requestedDate,
        requestedTime,
        maxSlots
      );
    } catch (error) {
      logger.error('Failed to get alternative slots', {
        dentistEmail,
        requestedDate,
        requestedTime,
        error,
      });
      // Return empty array on error
      return [];
    }
  }
}

// Export singleton instance
export const appointmentsService = new AppointmentsService();
