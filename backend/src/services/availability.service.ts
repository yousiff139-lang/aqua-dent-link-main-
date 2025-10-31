import { dentistsRepository } from '../repositories/dentists.repository.js';
import { appointmentsRepository } from '../repositories/appointments.repository.js';
import { slotReservationsRepository } from '../repositories/slot-reservations.repository.js';
import { logger } from '../config/logger.js';
import { AvailabilitySchedule, TimeSlot, SlotReservation } from '../types/index.js';
import { AppError } from '../utils/errors.js';
// Real-time sync is handled by Supabase database triggers automatically

export class AvailabilityService {
  /**
   * Get dentist availability schedule
   */
  async getAvailability(dentistId: string): Promise<AvailabilitySchedule> {
    try {
      return await dentistsRepository.getAvailability(dentistId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to get availability', { dentistId, error });
      throw AppError.internal('Failed to fetch availability');
    }
  }

  /**
   * Update dentist availability schedule
   */
  async updateAvailability(
    dentistId: string,
    schedule: AvailabilitySchedule,
    userId: string
  ): Promise<AvailabilitySchedule> {
    try {
      // Verify user is the dentist or admin
      if (dentistId !== userId) {
        // TODO: Check if user is admin
        throw AppError.forbidden('Not authorized to update this availability');
      }

      // Validate schedule format
      this.validateSchedule(schedule);

      // Update availability
      const updated = await dentistsRepository.updateAvailability(
        dentistId,
        schedule
      );

      logger.info('Availability updated successfully', {
        dentistId,
        userId,
      });

      // Real-time sync is handled automatically by Supabase database triggers
      // The trigger broadcasts availability changes to chatbot and patient dashboards
      logger.debug('Availability change will be broadcast via database trigger', {
        dentistId,
      });

      return updated.available_times || {};
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to update availability', {
        dentistId,
        schedule,
        error,
      });
      throw AppError.internal('Failed to update availability');
    }
  }

  /**
   * Get available time slots for a specific date
   */
  async getAvailableSlots(dentistId: string, date: Date): Promise<TimeSlot[]> {
    try {
      // Get dentist availability schedule
      const schedule = await dentistsRepository.getAvailability(dentistId);

      // Get day of week
      const dayName = this.getDayName(date);
      const daySchedule = schedule[dayName as keyof AvailabilitySchedule];

      if (!daySchedule) {
        return []; // Dentist not available on this day
      }

      // Parse time range (e.g., "09:00-17:00")
      const slots = this.generateTimeSlots(date, daySchedule);

      // Get existing appointments for this date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const appointments = await appointmentsRepository.findByDentist(dentistId, {
        date_from: startOfDay,
        date_to: endOfDay,
        status: ['pending', 'confirmed'],
      });

      // Get active reservations
      const reservations = await slotReservationsRepository.findByDentist(dentistId);

      // Mark slots as unavailable if booked or reserved
      const availableSlots = slots.map((slot) => {
        const isBooked = appointments.some((apt) => {
          const aptTime = new Date(apt.appointment_date);
          return aptTime.getTime() === slot.start.getTime();
        });

        const isReserved = reservations.some((res) => {
          const resTime = new Date(res.slot_time);
          return resTime.getTime() === slot.start.getTime();
        });

        return {
          ...slot,
          available: !isBooked && !isReserved,
        };
      });

      return availableSlots.filter((slot) => slot.available);
    } catch (error) {
      logger.error('Failed to get available slots', { dentistId, date, error });
      throw AppError.internal('Failed to fetch available slots');
    }
  }

  /**
   * Reserve a time slot temporarily
   */
  async reserveSlot(
    dentistId: string,
    dateTime: Date,
    patientId: string
  ): Promise<SlotReservation> {
    try {
      // Check if slot is available
      const isAvailable = await slotReservationsRepository.isSlotAvailable(
        dentistId,
        dateTime
      );

      if (!isAvailable) {
        throw AppError.slotUnavailable('This time slot is not available');
      }

      // Create reservation (expires in 5 minutes)
      const reservation = await slotReservationsRepository.create(
        dentistId,
        patientId,
        dateTime,
        5
      );

      logger.info('Slot reserved successfully', {
        reservationId: reservation.id,
        dentistId,
        patientId,
        dateTime,
      });

      return reservation;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to reserve slot', {
        dentistId,
        dateTime,
        patientId,
        error,
      });
      throw AppError.internal('Failed to reserve slot');
    }
  }

  /**
   * Release a slot reservation
   */
  async releaseSlot(reservationId: string, userId: string): Promise<void> {
    try {
      // Verify reservation exists and belongs to user
      const reservation = await slotReservationsRepository.findById(reservationId);

      if (!reservation) {
        throw AppError.notFound('Reservation not found');
      }

      if (reservation.patient_id !== userId) {
        throw AppError.forbidden('Not authorized to release this reservation');
      }

      // Delete reservation
      await slotReservationsRepository.delete(reservationId);

      logger.info('Slot reservation released', {
        reservationId,
        userId,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to release slot', { reservationId, userId, error });
      throw AppError.internal('Failed to release reservation');
    }
  }

  /**
   * Validate availability schedule format
   */
  private validateSchedule(schedule: AvailabilitySchedule): void {
    const timePattern = /^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

    const days = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    for (const day of days) {
      const value = schedule[day as keyof AvailabilitySchedule];
      if (value && !timePattern.test(value)) {
        throw AppError.validation(
          `Invalid time format for ${day}. Expected format: HH:MM-HH:MM`
        );
      }
    }
  }

  /**
   * Get day name from date
   */
  private getDayName(date: Date): string {
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    return days[date.getDay()];
  }

  /**
   * Generate time slots from schedule string
   */
  private generateTimeSlots(date: Date, schedule: string): TimeSlot[] {
    const [startTime, endTime] = schedule.split('-');
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const slots: TimeSlot[] = [];
    const slotDuration = 60; // 60 minutes per slot

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMinute < endMinute)
    ) {
      const slotStart = new Date(date);
      slotStart.setHours(currentHour, currentMinute, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

      // Only include future slots
      if (slotStart > new Date()) {
        slots.push({
          start: slotStart,
          end: slotEnd,
          available: true,
          dentist_id: '',
        });
      }

      currentMinute += slotDuration;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }

    return slots;
  }
}

// Export singleton instance
export const availabilityService = new AvailabilityService();
