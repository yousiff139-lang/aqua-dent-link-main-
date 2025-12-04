import api from '@/services/api';
import { Appointment } from '@/types';

const unwrapAppointment = (response: any): Appointment => {
  // Handle axios response structure: response.data = { success: true, data: {...} }
  // Or direct response: { success: true, data: {...} }
  let payload;
  
  if (response?.data) {
    // Axios wraps the response
    payload = response.data.data ?? response.data;
  } else {
    // Direct response
    payload = response;
  }

  // If payload is the appointment object directly
  if (payload && typeof payload === 'object' && payload.id) {
    return payload as Appointment;
  }

  // If payload is wrapped in another structure
  if (payload && typeof payload === 'object' && payload.data && payload.data.id) {
    return payload.data as Appointment;
  }

  console.error('Invalid appointment response:', response);
  throw new Error('Appointment response did not include valid data');
};

const performUpdate = async (id: string, updates: Record<string, any>): Promise<Appointment> => {
  try {
    const response = await api.put(`/appointments/${id}`, updates);
    return unwrapAppointment(response);
  } catch (error: any) {
    // Preserve authentication errors with their status codes
    if (error.status === 401 || error.shouldRedirect) {
      throw error;
    }
    const message =
      error?.response?.data?.error?.message ||
      error?.message ||
      'Failed to update appointment. Please try again.';
    throw new Error(message);
  }
};

export const appointmentService = {
  /**
   * Update appointment status and/or notes via backend API
   */
  updateStatus: async (id: string, status?: string, notes?: string): Promise<Appointment> => {
    const payload: Record<string, any> = {};
      if (status) payload.status = status;
      if (notes !== undefined) payload.notes = notes;
    return performUpdate(id, payload);
  },

  /**
   * Mark appointment as completed
   */
  markComplete: async (id: string): Promise<Appointment> => {
    return performUpdate(id, { status: 'completed' });
  },

  /**
   * Reschedule appointment to a new date and time
   */
  reschedule: async (id: string, date: string, time: string): Promise<Appointment> => {
    return performUpdate(id, {
          appointment_date: date,
          appointment_time: time,
    });
  },

  /**
   * Update appointment with partial data
   */
  update: async (id: string, data: Partial<Appointment>): Promise<Appointment> => {
    return performUpdate(id, data);
  },

  /**
   * Save private notes for an appointment
   */
  saveNotes: async (id: string, notes: string): Promise<Appointment> => {
    return performUpdate(id, { notes });
  },

  /**
   * Cancel an appointment using DELETE endpoint
   */
  cancel: async (id: string, reason?: string): Promise<void> => {
    try {
      const response = await api.delete(`/appointments/${id}`, {
        data: reason ? { cancellation_reason: reason } : undefined,
      });
      // DELETE endpoint returns { success: true, message: '...' }
      // No appointment data is returned, so we don't need to unwrap
      return;
    } catch (error: any) {
      // Preserve authentication errors with their status codes
      if (error.status === 401 || error.shouldRedirect) {
        throw error;
      }
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to cancel appointment. Please try again.';
      throw new Error(message);
    }
  },
};
