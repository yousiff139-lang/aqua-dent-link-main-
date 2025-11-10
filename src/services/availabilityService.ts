/**
 * Availability Service
 * Handles dentist availability and slot generation
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface TimeSlot {
  start: string; // ISO 8601 timestamp
  end: string;   // ISO 8601 timestamp
  isBooked: boolean;
}

export interface DentistAvailability {
  id: string;
  dentist_id: string;
  day_of_week: number; // 0=Monday, 1=Tuesday, ..., 6=Sunday
  start_time: string;  // HH:MM format
  end_time: string;    // HH:MM format
  is_available: boolean;
  slot_duration_minutes: number;
}

/**
 * Get available slots for a dentist within a date range
 * Uses the database function for accurate slot generation
 */
export async function getAvailableSlots(
  dentistId: string,
  fromDate: Date,
  toDate: Date
): Promise<TimeSlot[]> {
  try {
    logger.info('Fetching available slots', {
      dentistId,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
    });

    // Call the database function
    const { data, error } = await supabase.rpc('get_available_slots', {
      p_dentist_id: dentistId,
      p_from_date: fromDate.toISOString().split('T')[0],
      p_to_date: toDate.toISOString().split('T')[0],
    });

    if (error) {
      logger.error('Error fetching available slots', error, { dentistId });
      throw error;
    }

    // Transform the data
    const slots: TimeSlot[] = (data || []).map((slot: any) => ({
      start: slot.slot_start,
      end: slot.slot_end,
      isBooked: slot.is_booked,
    }));

    logger.success('Fetched available slots', {
      dentistId,
      totalSlots: slots.length,
      availableSlots: slots.filter(s => !s.isBooked).length,
    });

    return slots;
  } catch (error) {
    logger.error('Failed to get available slots', error, { dentistId });
    throw new Error('Failed to fetch available time slots. Please try again.');
  }
}

/**
 * Check if a specific slot is available
 * Used for server-side validation before booking
 */
export async function isSlotAvailable(
  dentistId: string,
  appointmentDate: Date,
  appointmentTime: string, // HH:MM format
  durationMinutes: number = 30
): Promise<boolean> {
  try {
    logger.info('Checking slot availability', {
      dentistId,
      appointmentDate: appointmentDate.toISOString(),
      appointmentTime,
      durationMinutes,
    });

    const { data, error } = await supabase.rpc('is_slot_available', {
      p_dentist_id: dentistId,
      p_appointment_date: appointmentDate.toISOString().split('T')[0],
      p_appointment_time: appointmentTime,
      p_duration_minutes: durationMinutes,
    });

    if (error) {
      logger.error('Error checking slot availability', error, { dentistId });
      throw error;
    }

    logger.info('Slot availability checked', {
      dentistId,
      appointmentDate: appointmentDate.toISOString(),
      appointmentTime,
      isAvailable: data,
    });

    return data === true;
  } catch (error) {
    logger.error('Failed to check slot availability', error, { dentistId });
    throw new Error('Failed to verify slot availability. Please try again.');
  }
}

/**
 * Get dentist availability schedule
 * Returns the weekly availability configuration
 */
export async function getDentistAvailability(
  dentistId: string
): Promise<DentistAvailability[]> {
  try {
    logger.info('Fetching dentist availability', { dentistId });

    const { data, error } = await supabase
      .from('dentist_availability')
      .select('*')
      .eq('dentist_id', dentistId)
      .eq('is_available', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      logger.error('Error fetching dentist availability', error, { dentistId });
      throw error;
    }

    logger.success('Fetched dentist availability', {
      dentistId,
      scheduleCount: data?.length || 0,
    });

    return data || [];
  } catch (error) {
    logger.error('Failed to get dentist availability', error, { dentistId });
    throw new Error('Failed to fetch dentist availability. Please try again.');
  }
}

/**
 * Get available dates for a dentist (dates that have at least one available slot)
 * Useful for date picker to disable unavailable dates
 */
export async function getAvailableDates(
  dentistId: string,
  fromDate: Date,
  toDate: Date
): Promise<string[]> {
  try {
    const slots = await getAvailableSlots(dentistId, fromDate, toDate);
    
    // Extract unique dates from available (non-booked) slots
    const availableDates = new Set<string>();
    slots
      .filter(slot => !slot.isBooked)
      .forEach(slot => {
        const date = new Date(slot.start).toISOString().split('T')[0];
        availableDates.add(date);
      });

    return Array.from(availableDates).sort();
  } catch (error) {
    logger.error('Failed to get available dates', error, { dentistId });
    throw new Error('Failed to fetch available dates. Please try again.');
  }
}

/**
 * Get available time slots for a specific date
 * Returns only the time portion for easier UI display
 */
export async function getAvailableTimesForDate(
  dentistId: string,
  date: Date
): Promise<{ time: string; isBooked: boolean }[]> {
  try {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const slots = await getAvailableSlots(dentistId, date, date);
    
    return slots.map(slot => ({
      time: new Date(slot.start).toISOString().split('T')[1].substring(0, 5), // HH:MM
      isBooked: slot.isBooked,
    }));
  } catch (error) {
    logger.error('Failed to get available times for date', error, { dentistId, date });
    throw new Error('Failed to fetch available times. Please try again.');
  }
}

export const availabilityService = {
  getAvailableSlots,
  isSlotAvailable,
  getDentistAvailability,
  getAvailableDates,
  getAvailableTimesForDate,
};
