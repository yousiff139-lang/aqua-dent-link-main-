import api from './api';
import { Dentist, Appointment, AppointmentFilters } from '@/types';

export const dentistService = {
  /**
   * Get dentist profile by email
   */
  getByEmail: async (email: string): Promise<Dentist> => {
    const response = await api.get<Dentist>(`/dentists/${email}`);
    return response.data;
  },

  /**
   * Get all patients/appointments for a dentist
   */
  getPatients: async (email: string, filters?: AppointmentFilters): Promise<Appointment[]> => {
    const response = await api.get<Appointment[]>(`/dentists/${email}/patients`, {
      params: filters,
    });
    return response.data;
  },
};
