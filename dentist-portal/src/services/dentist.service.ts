import api from '@/services/api';
import { Dentist, Appointment, AppointmentFilters } from '@/types';

const buildFilterParams = (filters?: AppointmentFilters) => {
  const params: Record<string, string | number> = {};

  if (!filters) {
    return params;
  }

  if (filters.status) {
    params.status = Array.isArray(filters.status)
      ? filters.status.join(',')
      : filters.status;
  }

  if (filters.date_from) {
    params.date_from = filters.date_from;
  }

  if (filters.date_to) {
    params.date_to = filters.date_to;
  }

  if (typeof filters.limit === 'number') {
    params.limit = filters.limit;
  }

  if (typeof filters.offset === 'number') {
    params.offset = filters.offset;
  }

  return params;
};

export const dentistService = {
  /**
   * Get dentist profile by email from backend API
   */
  getByEmail: async (email: string): Promise<Dentist> => {
    try {
      const response = await api.get(`/dentists/${encodeURIComponent(email)}`);
      const payload = response.data?.data ?? response.data;

      if (!payload) {
        throw new Error('Dentist not found');
      }

      return payload as Dentist;
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error.message || 'Failed to fetch dentist profile';
      throw new Error(message);
    }
  },

  /**
   * Get all patients/appointments for a dentist from backend API
   */
  getPatients: async (email: string, filters?: AppointmentFilters): Promise<Appointment[]> => {
    try {
      const params = buildFilterParams(filters);
      const response = await api.get(`/dentists/${encodeURIComponent(email)}/patients`, { params });
      const payload = response.data?.data ?? response.data ?? [];

      return (payload as Appointment[]).map((appointment) => ({
        ...appointment,
        patient_name: appointment.patient_name || 'Unknown patient',
        reason:
          appointment.reason ||
          appointment.symptoms ||
          appointment.chief_complaint ||
          'Not specified',
      }));
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error.message || 'Failed to fetch appointments';
      throw new Error(message);
    }
  },
};
