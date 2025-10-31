import axios, { AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to determine if error is retryable
const isRetryableError = (error: any): boolean => {
  if (!axios.isAxiosError(error)) return false;
  
  // Retry on network errors or 5xx server errors
  return !error.response || (error.response.status >= 500 && error.response.status < 600);
};

// Helper function to get user-friendly error message
const getUserFriendlyErrorMessage = (error: any, defaultMessage: string): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    
    // Check for specific error codes
    if (axiosError.code === 'ECONNABORTED') {
      return 'Request timed out. Please check your internet connection and try again.';
    }
    
    if (axiosError.code === 'ERR_NETWORK') {
      return 'Network error. Please check your internet connection and try again.';
    }
    
    // Check for API error messages
    if (axiosError.response?.data?.error?.message) {
      return axiosError.response.data.error.message;
    }
    
    // Check for specific status codes
    if (axiosError.response?.status === 409) {
      return 'This time slot is no longer available. Please select a different time.';
    }
    
    if (axiosError.response?.status === 400) {
      return 'Invalid request. Please check your information and try again.';
    }
    
    if (axiosError.response?.status === 401) {
      return 'You need to be logged in to perform this action.';
    }
    
    if (axiosError.response?.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    
    if (axiosError.response?.status === 404) {
      return 'The requested resource was not found.';
    }
    
    if (axiosError.response?.status && axiosError.response.status >= 500) {
      return 'Server error. Please try again later.';
    }
  }
  
  return defaultMessage;
};

export interface CreateAppointmentDTO {
  patientName: string;
  patientEmail: string;
  phone: string;
  dentistEmail: string;
  dentistName: string;
  reason: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:mm format
  paymentMethod: 'stripe' | 'cash';
  notes?: string;
}

export interface CreateCheckoutSessionDTO {
  appointmentId: string;
  amount: number; // in cents
  currency: string;
  dentistName: string;
  patientEmail: string;
  appointmentDate: string;
  appointmentTime: string;
}

export interface AppointmentResponse {
  success: boolean;
  data: {
    appointmentId: string;
    status: 'pending' | 'confirmed';
    paymentStatus: 'pending' | 'paid';
  };
}

export interface CheckoutSessionResponse {
  success: boolean;
  data: {
    sessionId: string;
    url: string;
  };
}

// Import centralized types
import type { Appointment, AppointmentStatus, PaymentMethod, PaymentStatus } from '@/types/appointment';

// Re-export for backward compatibility
export type { AppointmentStatus, PaymentMethod, PaymentStatus, Appointment };

export interface GetAppointmentsResponse {
  success: boolean;
  data: Appointment[];
}

export class AppointmentService {
  private axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async createAppointment(data: CreateAppointmentDTO): Promise<AppointmentResponse> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.axiosInstance.post<AppointmentResponse>(
          '/api/appointments',
          data
        );
        return response.data;
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
    
    throw new Error(
      getUserFriendlyErrorMessage(
        lastError,
        'Failed to create appointment. Please try again.'
      )
    );
  }

  async createCheckoutSession(data: CreateCheckoutSessionDTO): Promise<CheckoutSessionResponse> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.axiosInstance.post<CheckoutSessionResponse>(
          '/api/payments/create-checkout-session',
          data
        );
        return response.data;
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
    
    throw new Error(
      getUserFriendlyErrorMessage(
        lastError,
        'Failed to create payment session. Please try again.'
      )
    );
  }

  async getPatientAppointments(patientEmail: string): Promise<GetAppointmentsResponse> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.axiosInstance.get<GetAppointmentsResponse>(
          `/api/appointments/patient/${encodeURIComponent(patientEmail)}`
        );
        return response.data;
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
    
    throw new Error(
      getUserFriendlyErrorMessage(
        lastError,
        'Failed to fetch appointments. Please try again.'
      )
    );
  }
}

export const appointmentService = new AppointmentService();
