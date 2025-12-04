import { Request } from 'express';

// User types
export interface User {
  id: string;
  email: string;
  role?: string;
}

// Authenticated request with user
export interface AuthenticatedRequest extends Request {
  user: User;
}

// Appointment types
export type AppointmentStatus = 'pending' | 'confirmed' | 'upcoming' | 'completed' | 'cancelled';
export type PaymentMethod = 'stripe' | 'cash';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface Appointment {
  id: string;
  patient_id: string | null;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  dentist_id: string;
  dentist_email: string;
  dentist_name?: string;
  reason: string;
  appointment_date: Date;
  appointment_time: string;
  appointment_type?: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: AppointmentStatus;
  notes?: string;
  dentist_notes?: string;
  patient_notes?: string;
  medical_history?: string;
  // New medical fields
  gender?: string;
  is_pregnant?: boolean;
  chronic_diseases?: string;
  medications?: string;
  allergies?: string;
  previous_dental_work?: string;
  smoking?: boolean;
  symptoms?: string;
  chief_complaint?: string;

  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  booking_reference?: string;
  booking_source?: string;
  documents?: any;
  pdf_report_url?: string;
  cancellation_reason?: string;
  cancelled_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AppointmentDocument {
  id: string;
  appointment_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: Date;
}

// DTOs
export interface CreateAppointmentDTO {
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  dentist_email: string;
  dentist_id?: string;
  reason: string;
  appointment_date: string; // YYYY-MM-DD format
  appointment_time: string; // HH:mm format
  payment_method: PaymentMethod;
  notes?: string;
  patient_notes?: string;
  medical_history?: string;
  // New medical fields
  gender?: string;
  is_pregnant?: boolean;
  chronic_diseases?: string;
  medications?: string;
  allergies?: string;
  previous_dental_work?: string;
  smoking?: boolean;
  symptoms?: string;
  chief_complaint?: string;
  documents?: any; // JSONB for uploaded files
}

export interface UpdateAppointmentDTO {
  appointment_date?: string;
  appointment_time?: string;
  appointment_type?: string;
  status?: AppointmentStatus;
  payment_status?: PaymentStatus;
  notes?: string;
}

export interface AppointmentFilters {
  status?: AppointmentStatus[];
  date_from?: Date;
  date_to?: Date;
  limit?: number;
  offset?: number;
}

// Availability types
export interface AvailabilitySchedule {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  dentist_id: string;
}

export interface SlotReservation {
  id: string;
  dentist_id: string;
  patient_id: string;
  slot_time: Date;
  expires_at: Date;
  created_at: Date;
}

// Dentist types
export interface Dentist {
  id: string;
  specialization: string;
  bio?: string;
  years_of_experience?: number;
  education?: string;
  rating?: number;
  image_url?: string;
  available_times?: AvailabilitySchedule;
  created_at: Date;
  updated_at: Date;
}

// Profile types
export interface Profile {
  id: string;
  full_name?: string;
  email: string;
  phone?: string;
  created_at: Date;
  updated_at: Date;
}

// Error types
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SLOT_UNAVAILABLE = 'SLOT_UNAVAILABLE',
  CANCELLATION_WINDOW_EXPIRED = 'CANCELLATION_WINDOW_EXPIRED',
  PAYMENT_ERROR = 'PAYMENT_ERROR',
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
  };
}

// Pagination types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Real-time types
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeEvent {
  event: RealtimeEventType;
  table: string;
  record_id: string;
  payload: any;
  timestamp: Date;
}

export interface Subscription {
  id: string;
  unsubscribe: () => void;
}

// Payment types
export type PaymentTransactionStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';

export interface PaymentTransaction {
  id: string;
  appointment_id: string;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  amount: number; // in cents
  currency: string;
  status: PaymentTransactionStatus;
  payment_method: string;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePaymentTransactionDTO {
  appointment_id: string;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  amount: number;
  currency: string;
  status: PaymentTransactionStatus;
  payment_method: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePaymentTransactionDTO {
  status?: PaymentTransactionStatus;
  stripe_payment_intent_id?: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

// Stripe types
export interface CreateCheckoutSessionParams {
  appointmentId: string;
  amount: number;
  currency: string;
  dentistName: string;
  patientEmail: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}
