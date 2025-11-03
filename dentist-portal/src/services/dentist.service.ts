import { supabase } from '@/lib/supabase';
import { Dentist, Appointment, AppointmentFilters } from '@/types';

export const dentistService = {
  /**
   * Get dentist profile by email from Supabase
   */
  getByEmail: async (email: string): Promise<Dentist> => {
    try {
      // Try to get dentist via profiles join
      const { data: dentistData, error } = await supabase
        .from('dentists')
        .select(`
          *,
          profiles!dentists_id_fkey (
            id,
            email,
            full_name
          )
        `)
        .eq('profiles.email', email.toLowerCase())
        .single();

      if (!error && dentistData) {
        return {
          id: dentistData.id,
          email: dentistData.profiles?.email || email.toLowerCase(),
          full_name: dentistData.profiles?.full_name || dentistData.name || 'Unknown Dentist',
          specialization: dentistData.specialization || 'General Dentistry',
          years_of_experience: dentistData.years_of_experience || dentistData.experience_years || 0,
          education: dentistData.education || '',
          bio: dentistData.bio || '',
          rating: dentistData.rating || 4.5,
          created_at: dentistData.created_at || new Date().toISOString(),
          updated_at: dentistData.updated_at || new Date().toISOString(),
        };
      }

      // Try direct email query
      const { data: dentistDirect, error: directError } = await supabase
        .from('dentists')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (directError || !dentistDirect) {
        throw new Error('Dentist not found');
      }

      return {
        id: dentistDirect.id,
        email: dentistDirect.email || email.toLowerCase(),
        full_name: dentistDirect.name || 'Unknown Dentist',
        specialization: dentistDirect.specialization || 'General Dentistry',
        years_of_experience: dentistDirect.years_of_experience || dentistDirect.experience_years || 0,
        education: dentistDirect.education || '',
        bio: dentistDirect.bio || '',
        rating: dentistDirect.rating || 4.5,
        created_at: dentistDirect.created_at || new Date().toISOString(),
        updated_at: dentistDirect.updated_at || new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch dentist profile');
    }
  },

  /**
   * Get all patients/appointments for a dentist from Supabase
   */
  getPatients: async (email: string, filters?: AppointmentFilters): Promise<Appointment[]> => {
    try {
      // First get dentist ID
      const dentist = await dentistService.getByEmail(email);
      
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('dentist_id', dentist.id);

      // Apply filters
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.date_from) {
        query = query.gte('appointment_date', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('appointment_date', filters.date_to);
      }

      const { data, error } = await query.order('appointment_date', { ascending: true });

      if (error) {
        throw error;
      }

      return (data || []).map((apt: any) => ({
        id: apt.id,
        patient_name: apt.patient_name || 'Unknown',
        patient_email: apt.patient_email || '',
        patient_phone: apt.patient_phone || '',
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        reason: apt.symptoms || apt.chief_complaint || 'Not specified',
        status: apt.status as Appointment['status'],
        payment_method: apt.payment_method as Appointment['payment_method'],
        payment_status: apt.payment_status as Appointment['payment_status'],
        booking_reference: apt.booking_reference || '',
        dentist_id: apt.dentist_id,
        notes: apt.notes || '', // Add notes field
        created_at: apt.created_at,
        updated_at: apt.updated_at,
      }));
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch appointments');
    }
  },
};
