import { supabase } from '@/integrations/supabase/client';
import { generateBookingReference } from '@/lib/bookingReference';
import {
  sendBookingConfirmation,
  sendNewBookingAlert,
  sendCancellationNotification
} from './notificationService';
import {
  validateFile,
  validateTimeSlot,
  validateCancellationTiming,
} from '@/lib/validation';
import {
  BookingError,
  ErrorCode,
  parseError,
  logError,
  retryWithBackoff,
  withTimeout,
} from '@/lib/errorHandling';
import {
  SlotConflictResolver,
  ConcurrentBookingPrevention,
} from '@/lib/edgeCaseHandling';

// Core booking types (no chatbot dependencies)
export interface TimeSlot {
  id: string;
  dentistId: string;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  isReserved: boolean;
}

export interface Reservation {
  id: string;
  slotId: string;
  dentistId: string;
  patientId: string;
  slotTime: Date;
  expiresAt: Date;
  status: string;
}

export interface CancellationResult {
  success: boolean;
  message: string;
  appointmentId: string;
  cancelledAt?: Date;
}

export interface DocumentReference {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
}

export interface DocumentUpload {
  success: boolean;
  document?: DocumentReference;
  error?: string;
}

/**
 * BookingService
 * Manages appointment booking, time slot reservations, and appointment lifecycle
 */
export class BookingService {
  /**
   * Get available time slots for a dentist on a specific date
   * @param dentistId - The dentist's ID
   * @param date - The date to check availability
   * @returns Array of available TimeSlot objects
   */
  async getAvailableSlots(dentistId: string, date: Date): Promise<TimeSlot[]> {
    try {
      const dayOfWeek = date.getDay();
      const dateString = date.toISOString().split('T')[0];

      // Fetch all data with retry and timeout
      const fetchData = async () => {
        // Get dentist availability for the day of week
        const { data: availability, error: availabilityError } = await supabase
          .from('dentist_availability')
          .select('*')
          .eq('dentist_id', dentistId)
          .eq('day_of_week', dayOfWeek)
          .eq('is_available', true);

        if (availabilityError) {
          throw availabilityError;
        }

        if (!availability || availability.length === 0) {
          return { availability: [], appointments: [], reservations: [] };
        }

        // Get existing appointments for the date
        const { data: appointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('appointment_time')
          .eq('dentist_id', dentistId)
          .eq('appointment_date', dateString)
          .in('status', ['upcoming', 'confirmed']);

        if (appointmentsError) {
          throw appointmentsError;
        }

        // Get active reservations
        // @ts-ignore - time_slot_reservations table will be created by migration
        const { data: reservations, error: reservationsError } = await (supabase as any)
          .from('time_slot_reservations')
          .select('slot_time')
          .eq('dentist_id', dentistId)
          .gte('reservation_expires_at', new Date().toISOString())
          .eq('status', 'reserved');

        if (reservationsError) {
          throw reservationsError;
        }

        return { availability, appointments, reservations };
      };

      const { availability, appointments, reservations } = await withTimeout(
        retryWithBackoff(fetchData),
        15000
      );

      if (!availability || availability.length === 0) {
        return [];
      }

      // Build time slots
      const slots: TimeSlot[] = [];
      // @ts-ignore - appointment_time will be added by migration
      const bookedTimes = new Set(appointments?.map(a => a.appointment_time) || []);
      // @ts-ignore - slot_time exists in time_slot_reservations table
      const reservedTimes = new Set(reservations?.map(r => new Date(r.slot_time).toISOString()) || []);

      for (const avail of availability) {
        const startTime = this.parseTime(avail.start_time);
        const endTime = this.parseTime(avail.end_time);
        // @ts-ignore - slot_duration_minutes will be added by migration
        const slotDuration = avail.slot_duration_minutes || 30;

        let currentTime = startTime;
        while (currentTime < endTime) {
          const slotStart = new Date(date);
          slotStart.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);

          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

          const slotTimeString = `${String(slotStart.getHours()).padStart(2, '0')}:${String(slotStart.getMinutes()).padStart(2, '0')}`;
          const isBooked = bookedTimes.has(slotTimeString);
          const isReserved = reservedTimes.has(slotStart.toISOString());

          slots.push({
            id: `${dentistId}-${dateString}-${slotTimeString}`,
            dentistId: dentistId,
            startTime: slotStart,
            endTime: slotEnd,
            isAvailable: !isBooked && !isReserved,
            isReserved: isReserved,
          });

          currentTime += slotDuration;
        }
      }

      return slots;
    } catch (error) {
      const parsedError = parseError(error);
      logError(parsedError, 'getAvailableSlots');
      throw parsedError;
    }
  }

  /**
   * Reserve a time slot temporarily (5-minute expiration)
   * @param slotId - The time slot ID
   * @returns Reservation object
   */
  async reserveTimeSlot(slotId: string): Promise<Reservation> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User must be authenticated to reserve a time slot');
      }

      // Parse slot ID to extract dentist ID and slot time
      const [dentistId, dateString, timeString] = slotId.split('-');
      const slotTime = new Date(`${dateString}T${timeString}:00`);

      // Validate time slot
      const timeValidation = validateTimeSlot(slotTime);
      if (!timeValidation.isValid) {
        throw new BookingError(
          timeValidation.errors.join(', '),
          ErrorCode.VALIDATION_FAILED,
          timeValidation.errors.join(', ')
        );
      }

      // Acquire lock to prevent concurrent bookings
      const lockAcquired = ConcurrentBookingPrevention.acquireLock(slotId, user.id);
      if (!lockAcquired) {
        throw new BookingError(
          'Slot is being reserved by another user',
          ErrorCode.CONFLICT,
          'Another user is currently reserving this slot. Please wait or select a different time.'
        );
      }

      try {
        // Check slot availability with conflict detection
        const conflictCheck = await SlotConflictResolver.checkAndReserveSlot(
          dentistId,
          slotTime,
          user.id,
          supabase
        );

        if (!conflictCheck.success) {
          throw new BookingError(
            conflictCheck.error || 'Slot conflict detected',
            ErrorCode.SLOT_UNAVAILABLE,
            conflictCheck.error || 'This time slot is no longer available.'
          );
        }

        // Create reservation with 5-minute expiration
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 5);

        const createReservation = async () => {
          // @ts-ignore - time_slot_reservations table will be created by migration
          const { data: reservation, error: reservationError } = await (supabase as any)
            .from('time_slot_reservations')
            .insert({
              dentist_id: dentistId,
              slot_time: slotTime.toISOString(),
              reserved_by: user.id,
              reservation_expires_at: expiresAt.toISOString(),
              status: 'reserved',
            })
            .select()
            .single();

          if (reservationError) {
            throw reservationError;
          }

          return reservation;
        };

        const reservation = await retryWithBackoff(createReservation);

        // Release lock after successful reservation
        ConcurrentBookingPrevention.releaseLock(slotId, user.id);

        return {
          id: reservation.id,
          slotId: slotId,
          dentistId: dentistId,
          patientId: user.id,
          slotTime: new Date(reservation.slot_time),
          expiresAt: new Date(reservation.reservation_expires_at),
          status: 'reserved',
        };
      } catch (innerError) {
        // Release lock on error
        ConcurrentBookingPrevention.releaseLock(slotId, user.id);
        throw innerError;
      }
    } catch (error) {
      const parsedError = parseError(error);
      logError(parsedError, 'reserveTimeSlot');
      throw parsedError;
    }
  }

  /**
   * Cancel an appointment with 1-hour policy validation
   * @param appointmentId - The appointment ID to cancel
   * @returns CancellationResult
   */
  async cancelAppointment(appointmentId: string, reason?: string): Promise<CancellationResult> {
    try {
      // Get appointment details with retry
      const fetchAppointment = async () => {
        const { data: appointment, error: fetchError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointmentId)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        if (!appointment) {
          throw new BookingError(
            'Appointment not found',
            ErrorCode.NOT_FOUND,
            'Appointment not found'
          );
        }

        return appointment;
      };

      const appointment = await retryWithBackoff(fetchAppointment);

      // Check if user is authorized to cancel
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new BookingError(
          'User must be authenticated',
          ErrorCode.AUTH_REQUIRED,
          'Please sign in to cancel appointment',
          userError
        );
      }

      if (user.id !== appointment.patient_id) {
        throw new BookingError(
          'User not authorized',
          ErrorCode.UNAUTHORIZED,
          'You are not authorized to cancel this appointment'
        );
      }

      // Validate cancellation timing
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_date}`);
      const timingValidation = validateCancellationTiming(appointmentDateTime);

      if (!timingValidation.isValid) {
        return {
          success: false,
          message: timingValidation.errors.join(', '),
          appointmentId: appointmentId,
        };
      }

      // Cancel the appointment with retry
      const cancelledAt = new Date();
      const cancelAppointmentDb = async () => {
        const { error: cancelError } = await supabase
          .from('appointments')
          .update({
            status: 'cancelled',
            cancelled_at: cancelledAt.toISOString(),
            cancellation_reason: reason,
          })
          .eq('id', appointmentId);

        if (cancelError) {
          throw cancelError;
        }
      };

      await retryWithBackoff(cancelAppointmentDb);

      // Release the time slot reservation
      // @ts-ignore - time_slot_reservations table will be created by migration
      const { error: releaseError } = await (supabase as any)
        .from('time_slot_reservations')
        .update({ status: 'expired' })
        .eq('dentist_id', appointment.dentist_id)
        .eq('slot_time', appointmentDateTime.toISOString());

      if (releaseError) {
        console.error('Error releasing time slot:', releaseError);
      }

      // Send cancellation notifications
      try {
        await sendCancellationNotification(appointmentId);
      } catch (notificationError) {
        // Log error but don't fail the cancellation
        console.error('Error sending cancellation notifications:', notificationError);
      }

      return {
        success: true,
        message: 'Appointment cancelled successfully',
        appointmentId: appointmentId,
        cancelledAt: cancelledAt,
      };
    } catch (error) {
      const parsedError = parseError(error);
      logError(parsedError, 'cancelAppointment');
      throw parsedError;
    }
  }

  /**
   * Upload a medical document to Supabase Storage
   * @param file - The file to upload
   * @param appointmentId - The appointment ID to associate with
   * @returns DocumentUpload result
   */
  async uploadDocument(file: File, appointmentId: string): Promise<DocumentUpload> {
    try {
      // Validate file
      const fileValidation = validateFile(file);
      if (!fileValidation.isValid) {
        return {
          success: false,
          error: fileValidation.errors.join(', '),
        };
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User must be authenticated to upload documents');
      }

      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${appointmentId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('medical-documents')
        .getPublicUrl(fileName);

      // Create document reference
      const documentRef: DocumentReference = {
        id: crypto.randomUUID(),
        fileName: file.name,
        fileUrl: urlData.publicUrl,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date(),
      };

      // Note: Documents are stored via appointment_medical_info.documents JSONB field
      // The file is uploaded to storage and returned for the caller to handle

      return {
        success: true,
        document: documentRef,
      };
    } catch (error) {
      const parsedError = parseError(error);
      logError(parsedError, 'uploadDocument');
      return {
        success: false,
        error: parsedError.userMessage || 'Failed to upload document. Please try again.',
      };
    }
  }

  /**
   * Link uploaded documents to an appointment
   * @param appointmentId - The appointment ID
   * @param documents - Array of document references
   */
  async linkDocumentToAppointment(
    appointmentId: string,
    documents: DocumentReference[]
  ): Promise<void> {
    try {
      // Get current documents with retry
      const fetchAppointment = async () => {
        const { data: appointment, error: fetchError } = await supabase
          .from('appointments')
          .select('documents')
          .eq('id', appointmentId)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        return appointment;
      };

      const appointment = await retryWithBackoff(fetchAppointment);

      // Merge with existing documents
      // @ts-ignore - documents column will be added by migration
      const existingDocs = (appointment.documents as any[]) || [];
      const updatedDocs = [...existingDocs, ...documents];

      // Update appointment with retry
      const updateAppointment = async () => {
        // @ts-ignore - documents column will be added by migration
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ documents: updatedDocs } as any)
          .eq('id', appointmentId);

        if (updateError) {
          throw updateError;
        }
      };

      await retryWithBackoff(updateAppointment);
    } catch (error) {
      const parsedError = parseError(error);
      logError(parsedError, 'linkDocumentToAppointment');
      throw parsedError;
    }
  }

  /**
   * Get all documents associated with an appointment
   * @param appointmentId - The appointment ID
   * @returns Array of DocumentReference objects
   */
  async getAppointmentDocuments(appointmentId: string): Promise<DocumentReference[]> {
    try {
      const fetchDocuments = async () => {
        const { data: appointment, error } = await supabase
          .from('appointments')
          .select('documents')
          .eq('id', appointmentId)
          .single();

        if (error) {
          throw error;
        }

        return appointment;
      };

      const appointment = await retryWithBackoff(fetchDocuments);

      // @ts-ignore - documents column will be added by migration
      return (appointment.documents as DocumentReference[]) || [];
    } catch (error) {
      const parsedError = parseError(error);
      logError(parsedError, 'getAppointmentDocuments');
      throw parsedError;
    }
  }

  /**
   * Helper function to parse time string (HH:MM:SS) to minutes
   * @param timeString - Time in HH:MM:SS format
   * @returns Total minutes
   */
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

// Export singleton instance
export const bookingService = new BookingService();
