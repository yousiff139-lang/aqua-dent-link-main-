export interface AvailabilitySlot {
  id: string;
  dentist_id: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface DentistAvailability {
  id?: string;
  dentist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateAvailabilityRequest {
  slots: AvailabilitySlot[];
}
