/**
 * Dentist type definitions for the booking system
 * Based on the dentists table schema in Supabase
 */

/**
 * Main Dentist interface matching the dentists table schema
 * This is the primary interface for dentist data from the database
 */
export interface Dentist {
  id: string;
  name: string;
  email: string;
  specialization: string | null;
  rating: number;
  experience_years?: number;
  phone?: string;
  address?: string;
  bio?: string | null;
  education?: string | null;
  expertise?: string[] | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

// Legacy Dentist interface for dentist portal (uses profiles table)
export interface DentistProfile {
  id: string;
  full_name: string;
  email: string;
  specialization: string;
  bio: string;
  years_of_experience: number;
  rating: number;
  avatar_url?: string;
}

export interface Booking {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  patient_email: string;
  patient_age?: number;
  patient_medical_conditions?: string;
  dentist_id: string;
  appointment_date: string;
  appointment_time: string;
  symptoms: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  documents: BookingDocument[];
  dentist_notes?: string;
  payment_amount?: number;
  payment_status?: 'pending' | 'sent' | 'paid' | 'failed';
  booking_reference?: string;
  created_at: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
}

export interface BookingDocument {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface DentistStats {
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageRating: number;
}

export interface PaymentEmail {
  id: string;
  appointment_id: string;
  patient_email: string;
  sent_at: string;
  status: 'sent' | 'failed' | 'bounced';
  error_message?: string;
}

export type BookingFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';
export type BookingSort = 'newest' | 'oldest';
