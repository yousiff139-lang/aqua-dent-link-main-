/**
 * Appointment type definitions for the booking system
 * Based on the appointments table schema in Supabase
 */

/**
 * Appointment status enum
 */
export type AppointmentStatus = 'pending' | 'confirmed' | 'upcoming' | 'completed' | 'cancelled';

/**
 * Payment method enum
 */
export type PaymentMethod = 'stripe' | 'cash';

/**
 * Payment status enum
 */
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

/**
 * Main Appointment interface matching the appointments table schema
 */
export interface Appointment {
  id: string;
  patient_id: string;
  dentist_id?: string;
  dentist_email?: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  chief_complaint?: string;
  symptoms?: string;
  booking_reference?: string;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Appointment creation data (subset of Appointment for inserts)
 */
export interface AppointmentCreateData {
  patient_id: string;
  dentist_id?: string;
  dentist_email?: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  chief_complaint?: string;
  symptoms?: string;
  booking_reference?: string;
}

/**
 * Appointment update data (partial update)
 */
export interface AppointmentUpdateData {
  status?: AppointmentStatus;
  payment_status?: PaymentStatus;
  dentist_id?: string;
  appointment_date?: string;
  appointment_time?: string;
  chief_complaint?: string;
  symptoms?: string;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
}
