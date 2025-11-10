import { supabase } from '@/lib/supabase';
import { Appointment } from '@/types';

export const appointmentService = {
  /**
   * Update appointment status and/or notes in Supabase
   */
  updateStatus: async (id: string, status?: string, notes?: string): Promise<Appointment> => {
    try {
      const payload: any = { updated_at: new Date().toISOString() };
      if (status) payload.status = status;
      if (notes !== undefined) payload.notes = notes;
      
      const { data, error } = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Appointment;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update appointment status. Please try again.');
    }
  },

  /**
   * Mark appointment as completed
   */
  markComplete: async (id: string): Promise<Appointment> => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Appointment;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to mark appointment as completed. Please try again.');
    }
  },

  /**
   * Reschedule appointment to a new date and time
   */
  reschedule: async (id: string, date: string, time: string): Promise<Appointment> => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          appointment_date: date,
          appointment_time: time,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Appointment;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to reschedule appointment. Please try again.');
    }
  },

  /**
   * Update appointment with partial data
   */
  update: async (id: string, data: Partial<Appointment>): Promise<Appointment> => {
    try {
      const { data: updated, error } = await supabase
        .from('appointments')
        .update({ 
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated as Appointment;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update appointment. Please try again.');
    }
  },

  /**
   * Save private notes for an appointment
   */
  saveNotes: async (id: string, notes: string): Promise<Appointment> => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Appointment;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to save notes. Please try again.');
    }
  },
};
