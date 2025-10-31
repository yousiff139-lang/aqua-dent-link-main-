export interface Dentist {
  id: string;
  full_name: string;
  email: string;
  specialization: string;
  bio: string | null;
  years_of_experience: number | null;
  rating: number;
  created_at: string;
  updated_at: string;
  patient_count?: number;
}

export interface DentistAvailability {
  id: string;
  dentist_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string;  // HH:MM format
  end_time: string;    // HH:MM format
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface DentistAppointment {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_email: string;
  dentist_id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  symptoms: string | null;
  created_at: string;
}

export interface DentistStats {
  total_appointments: number;
  upcoming_appointments: number;
  completed_appointments: number;
  total_patients: number;
  average_rating: number;
}

export interface PatientAppointment {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_email: string;
  dentist_id: string;
  dentist_name: string;
  appointment_date: string;
  appointment_type: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  symptoms?: string;
  documents?: any[];
  notes?: string;
  created_at: string;
}

export interface DentistWithAppointments extends Dentist {
  appointments: PatientAppointment[];
}
