import { supabase } from '@/lib/supabase';

export const supabaseService = {
  /**
   * Get all appointments directly from Supabase
   */
  async getAppointments() {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      throw new Error(error.message || 'Failed to fetch appointments');
    }
  },

  /**
   * Get all patients with statistics
   */
  async getPatients(params?: { search?: string; page?: number; limit?: number }) {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 25;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('profiles')
        .select('id, full_name, email, phone, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (params?.search) {
        const searchTerm = `%${params.search}%`;
        query = query.or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`);
      }

      const { data: profiles, error, count } = await query;

      if (error) throw error;

      // Get appointment stats for each patient
      const profileIds = (profiles || []).map(p => p.id);
      let appointmentStats: any[] = [];

      if (profileIds.length > 0) {
        const { data: appointments } = await supabase
          .from('appointments')
          .select('patient_id, appointment_date')
          .in('patient_id', profileIds);

        appointmentStats = appointments || [];
      }

      // Build stats map
      const statsMap = new Map();
      appointmentStats.forEach(apt => {
        const stats = statsMap.get(apt.patient_id) || { total: 0, lastAppointment: null };
        stats.total += 1;
        if (!stats.lastAppointment || apt.appointment_date > stats.lastAppointment) {
          stats.lastAppointment = apt.appointment_date;
        }
        statsMap.set(apt.patient_id, stats);
      });

      const data = (profiles || []).map(profile => {
        const stats = statsMap.get(profile.id) || { total: 0, lastAppointment: null };
        return {
          id: profile.id,
          name: profile.full_name || 'Unknown User',
          email: profile.email,
          phone: profile.phone,
          joinedAt: profile.created_at,
          totalAppointments: stats.total,
          lastAppointment: stats.lastAppointment,
        };
      });

      return {
        success: true,
        data,
        pagination: {
          total: count || 0,
          page,
          limit,
        },
      };
    } catch (error: any