import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import {
  Appointment,
  AppointmentFilters,
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
} from '../types/index.js';
import { AppError } from '../utils/errors.js';

export class AppointmentsRepository {
  /**
   * Find appointment by ID
   */
  async findById(id: string): Promise<Appointment | null> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw error;
      }

      return data as Appointment;
    } catch (error) {
      logger.error('Failed to find appointment by ID', { id, error });
      throw AppError.internal('Failed to fetch appointment');
    }
  }

  /**
   * Find appointments by patient ID
   */
  async findByPatient(
    patientId: string,
    filters?: AppointmentFilters
  ): Promise<Appointment[]> {
    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: true });

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.date_from) {
        query = query.gte('appointment_date', filters.date_from.toISOString());
      }

      if (filters?.date_to) {
        query = query.lte('appointment_date', filters.date_to.toISOString());
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data as Appointment[]) || [];
    } catch (error) {
      logger.error('Failed to find appointments by patient', { patientId, error });
      throw AppError.internal('Failed to fetch appointments');
    }
  }

  /**
   * Find appointments by patient email with filtering
   */
  async findByPatientEmail(
    patientEmail: string,
    filters?: AppointmentFilters
  ): Promise<Appointment[]> {
    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('patient_email', patientEmail)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.date_from) {
        query = query.gte('appointment_date', filters.date_from.toISOString().split('T')[0]);
      }

      if (filters?.date_to) {
        query = query.lte('appointment_date', filters.date_to.toISOString().split('T')[0]);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data as Appointment[]) || [];
    } catch (error) {
      logger.error('Failed to find appointments by patient email', { patientEmail, error });
      throw AppError.internal('Failed to fetch appointments');
    }
  }

  /**
   * Find appointments by dentist ID
   */
  async findByDentist(
    dentistId: string,
    filters?: AppointmentFilters
  ): Promise<Appointment[]> {
    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('dentist_id', dentistId)
        .order('appointment_date', { ascending: true });

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.date_from) {
        query = query.gte('appointment_date', filters.date_from.toISOString());
      }

      if (filters?.date_to) {
        query = query.lte('appointment_date', filters.date_to.toISOString());
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data as Appointment[]) || [];
    } catch (error) {
      logger.error('Failed to find appointments by dentist', { dentistId, error });
      throw AppError.internal('Failed to fetch appointments');
    }
  }

  /**
   * Find appointments by dentist email with filtering and pagination
   */
  async findByDentistEmail(
    dentistEmail: string,
    filters?: AppointmentFilters
  ): Promise<Appointment[]> {
    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('dentist_email', dentistEmail)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.date_from) {
        query = query.gte('appointment_date', filters.date_from.toISOString().split('T')[0]);
      }

      if (filters?.date_to) {
        query = query.lte('appointment_date', filters.date_to.toISOString().split('T')[0]);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data as Appointment[]) || [];
    } catch (error) {
      logger.error('Failed to find appointments by dentist email', { dentistEmail, error });
      throw AppError.internal('Failed to fetch appointments');
    }
  }

  /**
   * Create new appointment with validation
   * Uses atomic database operations to prevent race conditions
   */
  async create(data: CreateAppointmentDTO & { patient_id?: string; dentist_id: string }): Promise<Appointment> {
    try {
      // Validate required fields
      if (!data.patient_name || !data.patient_email || !data.patient_phone) {
        throw AppError.validation('Patient information is required');
      }

      if (!data.dentist_email || !data.dentist_id) {
        throw AppError.validation('Dentist information is required');
      }

      if (!data.appointment_date || !data.appointment_time) {
        throw AppError.validation('Appointment date and time are required');
      }

      if (!data.payment_method) {
        throw AppError.validation('Payment method is required');
      }

      // Double-check slot availability before creating
      // This provides early feedback but the unique constraint is the ultimate safeguard
      const isAvailable = await this.checkSlotAvailability(
        data.dentist_email,
        data.appointment_date,
        data.appointment_time
      );

      if (!isAvailable) {
        throw AppError.slotUnavailable('The selected time slot is no longer available');
      }

      // Attempt to insert - the unique constraint will prevent concurrent bookings
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: data.patient_id || null,
          patient_name: data.patient_name,
          patient_email: data.patient_email,
          patient_phone: data.patient_phone,
          dentist_id: data.dentist_id,
          dentist_email: data.dentist_email,
          reason: data.reason,
          appointment_date: data.appointment_date,
          appointment_time: data.appointment_time,
          payment_method: data.payment_method,
          payment_status: 'pending',
          status: 'pending',
          notes: data.notes,
          patient_notes: data.patient_notes,
          medical_history: data.medical_history,
          // New medical fields
          gender: data.gender,
          is_pregnant: data.is_pregnant,
          chronic_diseases: data.chronic_diseases,
          medications: data.medications,
          allergies: data.allergies,
          previous_dental_work: data.previous_dental_work,
          smoking: data.smoking,
          symptoms: data.symptoms,
          chief_complaint: data.chief_complaint,
          documents: data.documents, // Persist uploaded documents
        })
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation (double booking from concurrent requests)
        if (error.code === '23505') {
          logger.warn('Concurrent booking attempt detected', {
            dentistEmail: data.dentist_email,
            date: data.appointment_date,
            time: data.appointment_time,
          });

          // Get alternative available slots to suggest to the user
          const alternativeSlots = await this.getAlternativeSlots(
            data.dentist_email,
            data.appointment_date,
            data.appointment_time,
            5
          );

          throw AppError.slotUnavailable(
            'This time slot was just booked by another patient. Please select a different time.',
            {
              alternativeSlots: alternativeSlots.map(time => ({
                date: data.appointment_date,
                time,
              })),
            }
          );
        }
        throw error;
      }

      logger.info('Appointment created successfully', {
        appointmentId: appointment.id,
        patientEmail: data.patient_email,
        dentistEmail: data.dentist_email,
        date: data.appointment_date,
        time: data.appointment_time,
      });

      return appointment as Appointment;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to create appointment', { data, error });
      throw AppError.internal('Failed to create appointment');
    }
  }

  /**
   * Update appointment (status, date, time, notes)
   */
  async update(id: string, data: UpdateAppointmentDTO): Promise<Appointment> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (data.appointment_date !== undefined) {
        updateData.appointment_date = data.appointment_date;
      }
      if (data.appointment_time !== undefined) {
        updateData.appointment_time = data.appointment_time;
      }
      if (data.appointment_type !== undefined) {
        updateData.appointment_type = data.appointment_type;
      }
      if (data.status !== undefined) {
        updateData.status = data.status;
      }
      if (data.payment_status !== undefined) {
        updateData.payment_status = data.payment_status;
      }
      if (data.notes !== undefined) {
        updateData.notes = data.notes;
      }

      // Handle completed_at field (for marking appointments as completed)
      if ((data as any).completed_at !== undefined) {
        updateData.completed_at = (data as any).completed_at;
      }

      // Handle cancelled_at and cancellation_reason (for cancelling appointments)
      if ((data as any).cancelled_at !== undefined) {
        updateData.cancelled_at = (data as any).cancelled_at;
      }
      if ((data as any).cancellation_reason !== undefined) {
        updateData.cancellation_reason = (data as any).cancellation_reason;
      }

      // Handle documents update (for post-booking uploads)
      if ((data as any).documents !== undefined) {
        updateData.documents = (data as any).documents;
      }

      // If updating date/time, check slot availability
      if (data.appointment_date || data.appointment_time) {
        const existing = await this.findById(id);
        if (!existing) {
          throw AppError.notFound('Appointment not found');
        }

        const newDate = data.appointment_date || existing.appointment_date.toString().split('T')[0];
        const newTime = data.appointment_time || existing.appointment_time;

        // Only check availability if date or time actually changed
        if (newDate !== existing.appointment_date.toString().split('T')[0] || newTime !== existing.appointment_time) {
          const isAvailable = await this.checkSlotAvailability(
            existing.dentist_email,
            newDate,
            newTime,
            id // Exclude current appointment from check
          );

          if (!isAvailable) {
            throw AppError.slotUnavailable('The selected time slot is not available');
          }
        }
      }

      const { data: appointment, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw AppError.notFound('Appointment not found');
        }
        // Handle unique constraint violation (concurrent update race condition)
        if (error.code === '23505') {
          logger.warn('Concurrent reschedule attempt detected', {
            appointmentId: id,
            updateData,
          });

          // Get alternative available slots if we have the necessary data
          let alternativeSlots: string[] = [];
          if (updateData.appointment_date && updateData.appointment_time) {
            const existing = await this.findById(id);
            if (existing) {
              alternativeSlots = await this.getAlternativeSlots(
                existing.dentist_email,
                updateData.appointment_date,
                updateData.appointment_time,
                5
              );
            }
          }

          throw AppError.slotUnavailable(
            'This time slot was just booked. Please select a different time.',
            alternativeSlots.length > 0 ? {
              alternativeSlots: alternativeSlots.map(time => ({
                date: updateData.appointment_date,
                time,
              })),
            } : undefined
          );
        }
        throw error;
      }

      logger.info('Appointment updated', { appointmentId: id, updates: data });

      return appointment as Appointment;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to update appointment', { id, data, error });
      throw AppError.internal('Failed to update appointment');
    }
  }

  /**
   * Delete appointment (soft delete by setting status to cancelled)
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      logger.info('Appointment cancelled', { appointmentId: id });
    } catch (error) {
      logger.error('Failed to cancel appointment', { id, error });
      throw AppError.internal('Failed to cancel appointment');
    }
  }

  /**
   * Check slot availability before booking
   * Returns true if the slot is available, false otherwise
   */
  async checkSlotAvailability(
    dentistEmail: string,
    appointmentDate: string,
    appointmentTime: string,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('appointments')
        .select('id')
        .eq('dentist_email', dentistEmail)
        .eq('appointment_date', appointmentDate)
        .eq('appointment_time', appointmentTime)
        .neq('status', 'cancelled');

      // Exclude specific appointment (for updates)
      if (excludeAppointmentId) {
        query = query.neq('id', excludeAppointmentId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Slot is available if no conflicting appointments found
      return !data || data.length === 0;
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
   * Find conflicting appointments for a dentist at a specific time
   */
  async findConflicts(
    dentistId: string,
    dateTime: Date,
    duration: number = 60 // duration in minutes
  ): Promise<Appointment[]> {
    try {
      const endTime = new Date(dateTime.getTime() + duration * 60000);

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('dentist_id', dentistId)
        .neq('status', 'cancelled')
        .gte('appointment_date', dateTime.toISOString())
        .lt('appointment_date', endTime.toISOString());

      if (error) throw error;

      return (data as Appointment[]) || [];
    } catch (error) {
      logger.error('Failed to find conflicting appointments', {
        dentistId,
        dateTime,
        error,
      });
      throw AppError.internal('Failed to check for conflicts');
    }
  }

  /**
   * Get alternative available time slots for a given date
   * Returns up to 5 available slots on the same day or next available day
   */
  async getAlternativeSlots(
    dentistEmail: string,
    requestedDate: string,
    requestedTime: string,
    maxSlots: number = 5
  ): Promise<string[]> {
    try {
      // Get all booked slots for the dentist on the requested date
      const { data: bookedAppointments, error } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('dentist_email', dentistEmail)
        .eq('appointment_date', requestedDate)
        .neq('status', 'cancelled');

      if (error) throw error;

      const bookedTimes = new Set(
        (bookedAppointments || []).map((apt) => apt.appointment_time)
      );

      // Generate all possible time slots (9 AM to 5 PM, 30-minute intervals)
      const allSlots: string[] = [];
      for (let hour = 9; hour <= 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          if (hour === 17 && minute > 0) break; // Stop at 5:00 PM
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          allSlots.push(time);
        }
      }

      // Filter out booked slots and the requested time
      const availableSlots = allSlots.filter(
        (slot) => !bookedTimes.has(slot) && slot !== requestedTime
      );

      // Return up to maxSlots available slots
      return availableSlots.slice(0, maxSlots);
    } catch (error) {
      logger.error('Failed to get alternative slots', {
        dentistEmail,
        requestedDate,
        requestedTime,
        error,
      });
      // Return empty array on error rather than throwing
      return [];
    }
  }
}

// Export singleton instance
export const appointmentsRepository = new AppointmentsRepository();
