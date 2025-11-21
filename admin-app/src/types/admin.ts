export interface AdminPatient {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  joinedAt: string;
  totalAppointments: number;
  lastAppointment: string | null;
}

export interface AdminDentist {
  id: string;
  name: string;
  email: string;
  specialization?: string | null;
  phone?: string | null;
  status?: string | null;
  years_of_experience?: number | null;
  experience_years?: number | null;
  education?: string | null;
  bio?: string | null;
  created_at?: string;
  updated_at?: string;
  totalAppointments: number;
  upcomingAppointments: number;
}

export interface AdminPatientsResponse {
  success: boolean;
  data: AdminPatient[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface AdminDentistsResponse {
  success: boolean;
  data: AdminDentist[];
}

export interface AdminAnalyticsSummary {
  totalPatients: number;
  totalDentists: number;
  totalAppointments: number;
  upcomingAppointments: number;
}

export interface AdminAnalyticsTrendEntry {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
}

export interface AdminSystemAlert {
  id: string;
  table: string;
  eventType: string;
  severity: 'info' | 'error';
  createdAt: string;
  description: string;
}

export interface AdminErrorSummary {
  totalEvents: number;
  last24h: number;
  tablesImpacted: string[];
}

export interface AdminAnalyticsResponse {
  success: boolean;
  data: {
    summary: AdminAnalyticsSummary;
    bookingsTrend: AdminAnalyticsTrendEntry[];
    topDentists: AdminDentist[];
    systemAlerts: AdminSystemAlert[];
    errorSummary: AdminErrorSummary;
  };
}

export interface CreateDentistPayload {
  name: string;
  email: string;
  specialization: string;
  phone?: string;
  years_of_experience?: number;
  bio?: string;
  education?: string;
}

export interface CreateDentistResponse {
  success: boolean;
  data: {
    dentist: AdminDentist;
    tempPassword: string;
  };
}

export interface DeleteDentistResponse {
  success: boolean;
  data: {
    message: string;
  };
}

