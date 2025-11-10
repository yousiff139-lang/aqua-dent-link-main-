import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DentistAvailability {
  id: string;
  dentist_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  is_available: boolean;
  slot_duration_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  time: string; // HH:MM format
  isBooked: boolean;
  isAvailable: boolean;
}

/**
 * Hook to fetch dentist availability schedule from database
 */
export function useDentistAvailability(dentistId: string | undefined) {
  return useQuery({
    queryKey: ['dentist-availability', dentistId],
    queryFn: async () => {
      if (!dentistId) {
        throw new Error('Dentist ID is required');
      }

      const { data, error } = await supabase
        .from('dentist_availability')
        .select('*')
        .eq('dentist_id', dentistId)
        .eq('is_available', true)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching dentist availability:', error);
        throw error;
      }

      // Map data and add composite id for compatibility
      return (data || []).map((row: any) => ({
        ...row,
        id: `${row.dentist_id}-${row.day_of_week}`, // Generate composite id
      })) as DentistAvailability[];
    },
    enabled: !!dentistId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch booked appointments for a dentist on a specific date
 */
export function useBookedSlots(dentistId: string | undefined, date: Date | undefined) {
  return useQuery({
    queryKey: ['booked-slots', dentistId, date?.toISOString()],
    queryFn: async () => {
      if (!dentistId || !date) {
        return [];
      }

      const dateStr = date.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('dentist_id', dentistId)
        .eq('appointment_date', dateStr)
        .in('status', ['pending', 'confirmed', 'upcoming']);

      if (error) {
        console.error('Error fetching booked slots:', error);
        throw error;
      }

      // Extract time strings from appointments
      return (data || []).map(apt => {
        // Convert time format from HH:MM:SS to HH:MM
        const time = apt.appointment_time;
        return time.substring(0, 5); // Get HH:MM part
      });
    },
    enabled: !!dentistId && !!date,
    staleTime: 1 * 60 * 1000, // 1 minute (more frequent updates for booking conflicts)
    retry: 1,
  });
}

/**
 * Generate time slots for a specific date based on dentist availability
 */
export function generateTimeSlotsForDate(
  date: Date,
  availability: DentistAvailability[],
  bookedSlots: string[],
  slotDuration: number = 30
): TimeSlot[] {
  const jsDayOfWeek = date.getDay(); // JavaScript: 0 = Sunday, 1 = Monday, etc.
  
  // Convert JavaScript day to database convention (0=Monday, 1=Tuesday, ..., 6=Sunday)
  // Database: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  // JavaScript: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const dbDayOfWeek = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;
  
  // Find availability for this day of week (try both conventions for compatibility)
  const dayAvailability = availability.filter(a => 
    a.day_of_week === jsDayOfWeek || a.day_of_week === dbDayOfWeek
  );
  
  if (dayAvailability.length === 0) {
    return [];
  }

  const slots: TimeSlot[] = [];

  // Generate slots for each availability period
  dayAvailability.forEach(period => {
    const startTime = period.start_time.substring(0, 5); // HH:MM
    const endTime = period.end_time.substring(0, 5); // HH:MM
    const duration = period.slot_duration_minutes || slotDuration;

    // Parse start and end times
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    let currentHour = startHour;
    let currentMinute = startMinute;

    // Generate slots until end time
    while (
      currentHour < endHour || 
      (currentHour === endHour && currentMinute < endMinute)
    ) {
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      slots.push({
        time: timeStr,
        isBooked: bookedSlots.includes(timeStr),
        isAvailable: true,
      });

      // Add duration to current time
      currentMinute += duration;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }
  });

  return slots;
}

/**
 * Get day name from day of week number
 * Database convention: 0=Monday, 1=Tuesday, ..., 6=Sunday
 * (This matches ISO 8601 and our seed data)
 */
export function getDayName(dayOfWeek: number): string {
  // Database convention: 0=Monday, 1=Tuesday, ..., 6=Sunday
  const dbDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  if (dayOfWeek >= 0 && dayOfWeek <= 6) {
    return dbDays[dayOfWeek] || 'Unknown';
  }
  
  return 'Unknown';
}

/**
 * Format time from HH:MM:SS to readable format
 */
export function formatTime(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}
