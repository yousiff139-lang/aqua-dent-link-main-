import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Allowed dentist emails
const ALLOWED_DENTIST_EMAILS = [
  'david.kim@dentalcare.com',
  'lisa.thompson@dentalcare.com',
  'james.wilson@dentalcare.com',
  'emily.rodriguez@dentalcare.com',
  'michael.chen@dentalcare.com',
  'sarah.johnson@dentalcare.com',
];

// Dentist data for auto-creation
const DENTIST_DATA: Record<string, { name: string; specialization: string; bio: string; experience: number; education: string }> = {
  'david.kim@dentalcare.com': {
    name: 'David Kim',
    specialization: 'Orthodontics',
    bio: 'Specialized in orthodontics with over 15 years of experience in teeth alignment and braces.',
    experience: 15,
    education: 'DDS, University of California'
  },
  'lisa.thompson@dentalcare.com': {
    name: 'Lisa Thompson',
    specialization: 'Pediatric Dentistry',
    bio: 'Dedicated to providing gentle dental care for children and adolescents.',
    experience: 12,
    education: 'DMD, Harvard School of Dental Medicine'
  },
  'james.wilson@dentalcare.com': {
    name: 'James Wilson',
    specialization: 'Cosmetic Dentistry',
    bio: 'Expert in cosmetic procedures including veneers, whitening, and smile makeovers.',
    experience: 10,
    education: 'DDS, NYU College of Dentistry'
  },
  'emily.rodriguez@dentalcare.com': {
    name: 'Emily Rodriguez',
    specialization: 'Endodontics',
    bio: 'Specialist in root canal therapy and dental pain management.',
    experience: 8,
    education: 'DDS, University of Michigan'
  },
  'michael.chen@dentalcare.com': {
    name: 'Michael Chen',
    specialization: 'Periodontics',
    bio: 'Focused on gum health and treatment of periodontal diseases.',
    experience: 14,
    education: 'DMD, Columbia University'
  },
  'sarah.johnson@dentalcare.com': {
    name: 'Sarah Johnson',
    specialization: 'General Dentistry',
    bio: 'Comprehensive dental care for patients of all ages.',
    experience: 20,
    education: 'DDS, University of Pennsylvania'
  }
};

export const dentistService = {
  /**
   * Login dentist with email
   */
  login: async (email: string) => {
    try {
      // Check if email is in allowed list
      if (!ALLOWED_DENTIST_EMAILS.includes(email.toLowerCase())) {
        return null;
      }

      // For now, use mock data since database tables aren't set up
      // Generate a consistent UUID based on email
      const dentistInfo = DENTIST_DATA[email];
      const mockId = email.split('@')[0].replace(/\./g, '-');
      
      const dentist = {
        id: mockId,
        full_name: dentistInfo.name,
        specialization: dentistInfo.specialization,
        bio: dentistInfo.bio,
        years_of_experience: dentistInfo.experience,
        education: dentistInfo.education,
        rating: 4.8,
        photo_url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Generate JWT token
      const token = jwt.sign(
        { 
          dentistId: dentist.id, 
          email: email,
          type: 'dentist'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        token,
        dentist: {
          id: dentist.id,
          email: email,
          full_name: dentist.full_name || 'Dr. ' + email.split('@')[0],
          specialization: dentist.specialization || 'General Dentistry',
          photo_url: dentist.photo_url,
          years_of_experience: dentist.years_of_experience,
          education: dentist.education,
          bio: dentist.bio,
          created_at: dentist.created_at,
          updated_at: dentist.updated_at,
        },
      };
    } catch (error) {
      logger.error('Dentist login service error', { error });
      throw error;
    }
  },

  /**
   * Get dentist profile by email
   */
  getByEmail: async (email: string) => {
    try {
      // Check if email is in allowed list
      if (!ALLOWED_DENTIST_EMAILS.includes(email.toLowerCase())) {
        return null;
      }

      const dentistInfo = DENTIST_DATA[email];
      const mockId = email.split('@')[0].replace(/\./g, '-');

      return {
        id: mockId,
        email: email,
        full_name: dentistInfo.name,
        specialization: dentistInfo.specialization,
        photo_url: undefined,
        years_of_experience: dentistInfo.experience,
        education: dentistInfo.education,
        bio: dentistInfo.bio,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Get dentist by email service error', { error });
      throw error;
    }
  },

  /**
   * Get dentist's patients/appointments
   */
  getPatients: async (email: string, filters?: { status?: string; from?: string; to?: string }) => {
    try {
      // For now, return empty array since database isn't set up
      // In production, this would query the appointments table
      logger.info('Getting patients for dentist', { email });
      return [];
    } catch (error) {
      logger.error('Get dentist patients service error', { error });
      throw error;
    }
  },
};
