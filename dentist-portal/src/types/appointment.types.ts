export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentMethod = 'stripe' | 'cash';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface Appointment {
  id: string;
  patient_id: string | null;
  dentist_id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  dentist_email: string;
  reason: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type?: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: AppointmentStatus;
  notes?: string;
  patient_notes?: string;
  medical_history?: string;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  created_at: string;
  updated_at: string;
  // Chatbot booking fields
  symptoms?: string;
  chief_complaint?: string;
  cause_identified?: boolean;
  uncertainty_note?: string;
  documents?: DocumentReference[];
  booking_summary_url?: string;
  excel_sheet_url?: string;
  booking_reference?: string;
  conversation_id?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
}

export interface DocumentReference {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface AppointmentFilters {
  status?: AppointmentStatus | AppointmentStatus[];
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}
