import api from './api';
import { Appointment, AppointmentStatus } from '@/types';

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to determine if error is retryable
const isRetryableError = (error: any): boolean => {
  // Retry on network errors or 5xx server errors
  return !error.status || (error.status >= 500 && error.status < 600);
};

// Retry wrapper function
async function withRetry<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's not a retryable error or if we've exhausted retries
      if (!isRetryableError(error) || attempt === MAX_RETRIES) {
        break;
      }
      
      // Wait before retrying
      await delay(RETRY_DELAY * (attempt + 1));
    }
  }
  
  // For non-retryable errors (like 409 conflict), preserve the original error
  if (lastError && !isRetryableError(lastError)) {
    throw lastError;
  }
  
  // For retryable errors that exhausted retries, throw with user-friendly message
  throw new Error(lastError?.message || errorMessage);
}

export const appointmentService = {
  /**
   * Update appointment status and/or notes
   */
  updateStatus: async (id: string, status?: string, notes?: string): Promise<Appointment> => {
    return withRetry(
      async () => {
        const payload: any = {};
        if (status) payload.status = status;
        if (notes !== undefined) payload.notes = notes;
        
        const response = await api.put<Appointment>(`/appointments/${id}`, payload);
        return response.data;
      },
      'Failed to update appointment status. Please try again.'
    );
  },

  /**
   * Mark appointment as completed
   */
  markComplete: async (id: string): Promise<Appointment> => {
    return withRetry(
      async () => {
        const response = await api.put<Appointment>(`/appointments/${id}`, {
          status: 'completed',
        });
        return response.data;
      },
      'Failed to mark appointment as completed. Please try again.'
    );
  },

  /**
   * Reschedule appointment to a new date and time
   */
  reschedule: async (id: string, date: string, time: string): Promise<Appointment> => {
    return withRetry(
      async () => {
        const response = await api.put<Appointment>(`/appointments/${id}`, {
          appointment_date: date,
          appointment_time: time,
        });
        return response.data;
      },
      'Failed to reschedule appointment. Please try again.'
    );
  },

  /**
   * Update appointment with partial data
   */
  update: async (id: string, data: Partial<Appointment>): Promise<Appointment> => {
    return withRetry(
      async () => {
        const response = await api.put<Appointment>(`/appointments/${id}`, data);
        return response.data;
      },
      'Failed to update appointment. Please try again.'
    );
  },

  /**
   * Save private notes for an appointment
   */
  saveNotes: async (id: string, notes: string): Promise<Appointment> => {
    return withRetry(
      async () => {
        const response = await api.put<Appointment>(`/appointments/${id}`, {
          notes,
        });
        return response.data;
      },
      'Failed to save notes. Please try again.'
    );
  },
};
