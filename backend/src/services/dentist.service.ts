import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors.js';
import { Appointment } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const APPOINTMENT_STATUS_FILTERS = new Set(['pending', 'confirmed', 'upcoming', 'completed', 'cancelled']);

interface DentistPatientsFilters {
  status?: string[];
  from?: string;
  to?: string;
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const transformDentistRecord = (record: any) => ({
  id: record.id,
  email: record.email,
  full_name: record.name || record.full_name || 'Unknown Dentist',
  specialization: record.specialization || record.expertise?.[0] || 'General Dentistry',
  photo_url: record.image_url || null,
  years_of_experience: record.years_of_experience ?? record.experience_years ?? 0,
  education: record.education || '',
  bio: record.bio || '',
  rating: record.rating || 4.5,
  created_at: record.created_at || new Date().toISOString(),
  updated_at: record.updated_at || new Date().toISOString(),
});

const mapAppointmentRecord = (record: any): Appointment => {
  const enrichedReason =
    record.reason ||
    record.symptoms ||
    record.chief_complaint ||
    record.appointment_reason ||
    'Not specified';

  return {
    ...record,
    reason: enrichedReason,
  } as Appointment;
};

const filterStatuses = (statuses?: string[]): string[] | undefined => {
  if (!statuses || statuses.length === 0) {
    return undefined;
  }

  const normalized = statuses
    .map((status) => status?.toLowerCase().trim())
    .filter((status): status is string => Boolean(status) && APPOINTMENT_STATUS_FILTERS.has(status));

  return normalized.length ? normalized : undefined;
};

const findDentistByEmail = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);

  // First try dentists table
  let { data, error } = await supabase
    .from('dentists')
    .select('*')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  // If not found in dentists table, try profiles table
  if (!data && !error) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('role', 'dentist')
      .maybeSingle();

    if (profileError) {
      logger.error('Failed to query dentist by email', { email: normalizedEmail, error: profileError });
      throw AppError.internal('Failed to load dentist profile');
    }

    if (profileData) {
      // Transform profile to dentist format
      data = {
        id: profileData.id,
        email: profileData.email,
        name: profileData.full_name || 'Unknown Dentist',
        specialization: 'General Dentistry',
        phone: profileData.phone,
        status: 'active',
        created_at: profileData.created_at,
        updated_at: profileData.updated_at,
      };
    }
  } else if (error) {
    logger.error('Failed to query dentist by email', { email: normalizedEmail, error });
    throw AppError.internal('Failed to load dentist profile');
  }

  return data;
};

const issueDentistToken = (dentist: ReturnType<typeof transformDentistRecord>) =>
  jwt.sign(
    {
      dentistId: dentist.id,
      email: dentist.email,
      role: 'dentist',
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

export const dentistService = {
  /**
   * Login dentist with email
   */
  login: async (email: string) => {
    try {
      if (!email) {
        throw AppError.validation('Email is required');
      }

      const dentistRecord = await findDentistByEmail(email);
      if (!dentistRecord) {
        logger.warn('Dentist login attempt failed - not found', { email });
        return null;
      }

      const dentist = transformDentistRecord(dentistRecord);
      const token = issueDentistToken(dentist);

      return {
        token,
        dentist,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Dentist login service error', { email, error });
      throw AppError.internal('Failed to login dentist');
    }
  },

  /**
   * Get dentist profile by email
   */
  getByEmail: async (email: string) => {
    try {
      if (!email) {
        throw AppError.validation('Email is required');
      }

      const dentistRecord = await findDentistByEmail(email);
      if (!dentistRecord) {
        return null;
      }

      return transformDentistRecord(dentistRecord);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Get dentist by email service error', { email, error });
      throw AppError.internal('Failed to load dentist profile');
    }
  },

  /**
   * Get dentist's patients/appointments
   */
  getPatients: async (email: string, filters: DentistPatientsFilters = {}) => {
    try {
      if (!email) {
        throw AppError.validation('Email is required');
      }

      const dentistRecord = await findDentistByEmail(email);
      if (!dentistRecord) {
        throw AppError.notFound('Dentist not found');
      }

      const normalizedStatuses = filterStatuses(filters.status);

      // Query appointments by dentist_id OR dentist_email (for compatibility)
      let query = supabase
        .from('appointments')
        .select('*')
        .or(`dentist_id.eq.${dentistRecord.id},dentist_email.eq.${email}`)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (normalizedStatuses?.length) {
        query = query.in('status', normalizedStatuses);
      }

      if (filters.from) {
        query = query.gte('appointment_date', filters.from);
      }

      if (filters.to) {
        query = query.lte('appointment_date', filters.to);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to fetch dentist appointments', {
          email,
          dentistId: dentistRecord.id,
          filters,
          error,
        });
        throw AppError.internal('Failed to fetch dentist appointments');
      }

      return (data || []).map((record) => mapAppointmentRecord(record));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Get dentist patients service error', { email, filters, error });
      throw AppError.internal('Failed to fetch dentist appointments');
    }
  },
};
