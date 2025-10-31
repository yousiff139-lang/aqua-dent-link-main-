import { supabase } from '@/lib/supabase';

export interface DentistAvailability {
  id?: string;
  dentist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
}

export const availabilityService = {
  /**
   * Get availability schedule for a dentist
   */
  getByDentistId: async (dentistId: string): Promise<DentistAvailability[]> => {
    const { data, error } = await supabase
      .from('dentist_availability')
      .select('*')
      .eq('dentist_id', dentistId)
      .order('day_of_week', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Failed to fetch availability');
    }

    return data || [];
  },

  /**
   * Save availability schedule for a dentist (replaces all existing)
   */
  saveAvailability: async (
    dentistId: string,
    availability: Omit<DentistAvailability, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<DentistAvailability[]> => {
    // Delete existing availability
    const { error: deleteError } = await supabase
      .from('dentist_availability')
      .delete()
      .eq('dentist_id', dentistId);

    if (deleteError) {
      throw new Error(deleteError.message || 'Failed to clear existing availability');
    }

    // Insert new availability
    if (availability.length > 0) {
      const { data, error: insertError } = await supabase
        .from('dentist_availability')
        .insert(availability)
        .select();

      if (insertError) {
        throw new Error(insertError.message || 'Failed to save availability');
      }

      return data || [];
    }

    return [];
  },

  /**
   * Update a single availability slot
   */
  updateSlot: async (
    slotId: string,
    updates: Partial<DentistAvailability>
  ): Promise<DentistAvailability> => {
    const { data, error } = await supabase
      .from('dentist_availability')
      .update(updates)
      .eq('id', slotId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update availability slot');
    }

    return data;
  },

  /**
   * Delete a single availability slot
   */
  deleteSlot: async (slotId: string): Promise<void> => {
    const { error } = await supabase
      .from('dentist_availability')
      .delete()
      .eq('id', slotId);

    if (error) {
      throw new Error(error.message || 'Failed to delete availability slot');
    }
  },
};
