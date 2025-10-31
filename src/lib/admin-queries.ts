import { supabase } from "@/integrations/supabase/client";
import { Dentist, PatientAppointment, DentistAvailability } from "@/types/admin";
import { withErrorHandling } from "./error-handling";

/**
 * Fetch all dentists with their appointment counts
 */
export const fetchAllDentists = async (): Promise<Dentist[]> => {
  return withErrorHandling(
    async () => {
      const { data, error } = await supabase
        .from('dentists')
        .select(`
          *,
          profiles!inner(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const dentists = data?.map((dentist: any) => ({
        id: dentist.id,
        full_name: dentist.profiles?.full_name || 'Unknown',
        email: dentist.profiles?.email || '',
        specialization: dentist.specialization,
        bio: dentist.bio,
        years_of_experience: dentist.years_of_experience,
        rating: dentist.rating,
        created_at: dentist.created_at,
        updated_at: dentist.updated_at,
      })) || [];

      // Fetch appointment counts for each dentist
      const dentistsWithCounts = await Promise.all(
        dentists.map(async (dentist) => {
          const { count } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('dentist_id', dentist.id);
          
          return {
            ...dentist,
            appointment_count: count || 0,
          };
        })
      );

      return dentistsWithCounts;
    },
    {
      context: 'loading dentists',
      retry: true,
    }
  );
};

/**
 * Fetch all appointments for a specific dentist with patient information
 */
export const fetchDentistAppointments = async (dentistId: string): Promise<PatientAppointment[]> => {
  return withErrorHandling(
    async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles!appointments_patient_id_fkey(full_name, email)
        `)
        .eq('dentist_id', dentistId)
        .order('appointment_date', { ascending: false });

      if (error) throw error;

      const appointments = data?.map((apt: any) => ({
        id: apt.id,
        patient_id: apt.patient_id,
        patient_name: apt.profiles?.full_name || 'Unknown Patient',
        patient_email: apt.profiles?.email || '',
        dentist_id: apt.dentist_id,
        dentist_name: apt.dentist_name || '',
        appointment_date: apt.appointment_date,
        appointment_type: apt.appointment_type,
        status: apt.status,
        symptoms: apt.symptoms,
        documents: apt.documents,
        notes: apt.notes,
        created_at: apt.created_at,
      })) || [];

      return appointments;
    },
    {
      context: 'loading appointments',
      retry: true,
    }
  );
};

/**
 * Fetch all appointments across all dentists
 */
export const fetchAllAppointments = async (): Promise<PatientAppointment[]> => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles!appointments_patient_id_fkey(full_name, email)
      `)
      .order('appointment_date', { ascending: false });

    if (error) throw error;

    const appointments = data?.map((apt: any) => ({
      id: apt.id,
      patient_id: apt.patient_id,
      patient_name: apt.profiles?.full_name || 'Unknown Patient',
      patient_email: apt.profiles?.email || '',
      dentist_id: apt.dentist_id || '',
      dentist_name: apt.dentist_name || '',
      appointment_date: apt.appointment_date,
      appointment_type: apt.appointment_type,
      status: apt.status,
      symptoms: apt.symptoms,
      documents: apt.documents,
      notes: apt.notes,
      created_at: apt.created_at,
    })) || [];

    return appointments;
  } catch (error) {
    console.error('Error fetching all appointments:', error);
    throw error;
  }
};

/**
 * Fetch availability slots for a specific dentist
 */
export const fetchDentistAvailability = async (dentistId: string): Promise<DentistAvailability[]> => {
  return withErrorHandling(
    async () => {
      const { data, error } = await supabase
        .from('dentist_availability')
        .select('*')
        .eq('dentist_id', dentistId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      return data || [];
    },
    {
      context: 'loading availability',
      retry: true,
    }
  );
};

/**
 * Add a new availability slot for a dentist
 */
export const addAvailability = async (
  availability: Omit<DentistAvailability, 'id' | 'created_at' | 'updated_at'>
): Promise<DentistAvailability> => {
  return withErrorHandling(
    async () => {
      // Validate time range
      if (availability.end_time <= availability.start_time) {
        throw new Error('End time must be after start time');
      }

      // Validate day of week
      if (availability.day_of_week < 0 || availability.day_of_week > 6) {
        throw new Error('Invalid day of week. Must be between 0 (Sunday) and 6 (Saturday)');
      }

      // Check for overlapping slots
      const { data: existingSlots, error: fetchError } = await supabase
        .from('dentist_availability')
        .select('*')
        .eq('dentist_id', availability.dentist_id)
        .eq('day_of_week', availability.day_of_week);

      if (fetchError) throw fetchError;

      // Check for overlaps
      const hasOverlap = existingSlots?.some((slot: any) => {
        const newStart = availability.start_time;
        const newEnd = availability.end_time;
        const existingStart = slot.start_time;
        const existingEnd = slot.end_time;

        return (
          (newStart >= existingStart && newStart < existingEnd) ||
          (newEnd > existingStart && newEnd <= existingEnd) ||
          (newStart <= existingStart && newEnd >= existingEnd)
        );
      });

      if (hasOverlap) {
        throw new Error('This time slot overlaps with an existing availability slot');
      }

      // Insert the new availability slot
      const { data, error } = await supabase
        .from('dentist_availability')
        .insert(availability)
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    {
      context: 'adding availability slot',
      retry: false, // Don't retry on validation errors
    }
  );
};

/**
 * Update an existing availability slot
 */
export const updateAvailability = async (
  slotId: string,
  updates: Partial<Omit<DentistAvailability, 'id' | 'dentist_id' | 'created_at' | 'updated_at'>>
): Promise<DentistAvailability> => {
  return withErrorHandling(
    async () => {
      // If updating times, validate the time range
      if (updates.start_time && updates.end_time) {
        if (updates.end_time <= updates.start_time) {
          throw new Error('End time must be after start time');
        }
      }

      // If updating day of week, validate it
      if (updates.day_of_week !== undefined) {
        if (updates.day_of_week < 0 || updates.day_of_week > 6) {
          throw new Error('Invalid day of week. Must be between 0 (Sunday) and 6 (Saturday)');
        }
      }

      // Get the current slot to check for overlaps if times are being updated
      if (updates.start_time || updates.end_time || updates.day_of_week !== undefined) {
        const { data: currentSlot, error: fetchError } = await supabase
          .from('dentist_availability')
          .select('*')
          .eq('id', slotId)
          .single();

        if (fetchError) throw fetchError;

        const finalStartTime = updates.start_time || currentSlot.start_time;
        const finalEndTime = updates.end_time || currentSlot.end_time;
        const finalDayOfWeek = updates.day_of_week !== undefined ? updates.day_of_week : currentSlot.day_of_week;

        // Check for overlapping slots (excluding the current slot)
        const { data: existingSlots, error: fetchSlotsError } = await supabase
          .from('dentist_availability')
          .select('*')
          .eq('dentist_id', currentSlot.dentist_id)
          .eq('day_of_week', finalDayOfWeek)
          .neq('id', slotId);

        if (fetchSlotsError) throw fetchSlotsError;

        // Check for overlaps
        const hasOverlap = existingSlots?.some((slot: any) => {
          const newStart = finalStartTime;
          const newEnd = finalEndTime;
          const existingStart = slot.start_time;
          const existingEnd = slot.end_time;

          return (
            (newStart >= existingStart && newStart < existingEnd) ||
            (newEnd > existingStart && newEnd <= existingEnd) ||
            (newStart <= existingStart && newEnd >= existingEnd)
          );
        });

        if (hasOverlap) {
          throw new Error('This time slot overlaps with an existing availability slot');
        }
      }

      // Update the availability slot
      const { data, error } = await supabase
        .from('dentist_availability')
        .update(updates)
        .eq('id', slotId)
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    {
      context: 'updating availability slot',
      retry: false, // Don't retry on validation errors
    }
  );
};

/**
 * Delete an availability slot
 */
export const deleteAvailability = async (slotId: string): Promise<boolean> => {
  return withErrorHandling(
    async () => {
      const { error } = await supabase
        .from('dentist_availability')
        .delete()
        .eq('id', slotId);

      if (error) throw error;

      return true;
    },
    {
      context: 'deleting availability slot',
      retry: false,
    }
  );
};

/**
 * Alias for fetchAllDentists to match task requirements
 */
export const fetchDentists = fetchAllDentists;
