import PDFDocument from 'pdfkit';
import { z } from 'zod';
import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';

const createDentistSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  specialization: z.string().min(2),
  phone: z.string().optional(),
  years_of_experience: z.number().int().nonnegative().optional(),
  bio: z.string().optional(),
  education: z.string().optional(),
  availability: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
    slot_duration_minutes: z.number().int().min(5).max(240),
    is_available: z.boolean(),
  })).optional(),
});

interface PatientQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

const sanitizePagination = (page?: number, limit?: number) => {
  const safePage = Math.max(page ?? 1, 1);
  const safeLimit = Math.min(Math.max(limit ?? 25, 1), 100);
  return { page: safePage, limit: safeLimit, from: (safePage - 1) * safeLimit, to: safePage * safeLimit - 1 };
};

const generateTempPassword = (): string => {
  // Generate a secure password that meets Supabase requirements (min 6 chars)
  // Format: Dentist-XXXX-YYYY where XXXX and YYYY are random hex strings
  const part1 = crypto.randomBytes(2).toString('hex');
  const part2 = crypto.randomBytes(2).toString('hex');
  return `Dentist-${part1}-${part2}`;
};

const buildSearchFilter = (term?: string) => {
  if (!term) return undefined;
  const value = term.trim();
  if (!value) return undefined;
  return `full_name.ilike.%${value}%,email.ilike.%${value}%,phone.ilike.%${value}%`;
};

export class AdminService {
  async getAppointments() {
    try {
      // Get appointments with dentist and patient info
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          dentist:dentist_id (
            id,
            name,
            email,
            specialization
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to load appointments', { error });
        throw AppError.internal('Failed to load appointments');
      }

      // Enrich with dentist name and email from profiles if not in dentists table
      const enrichedAppointments = await Promise.all(
        (appointments || []).map(async (apt: any) => {
          // If dentist info not found, try to get from profiles
          if (!apt.dentist && apt.dentist_email) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .eq('email', apt.dentist_email)
              .single();

            if (profile) {
              apt.dentist_name = profile.full_name;
              apt.dentist_email = profile.email;
            }
          } else if (apt.dentist) {
            apt.dentist_name = apt.dentist.name;
            apt.dentist_email = apt.dentist.email;
          }

          return apt;
        })
      );

      return { data: enrichedAppointments };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to load appointments', { error });
      throw AppError.internal('Failed to load appointments');
    }
  }

  async getPatients(params: PatientQueryParams) {
    const { page, limit, from, to } = sanitizePagination(params.page, params.limit);

    try {
      // Build query for profiles that are NOT dentists or admins
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, phone, created_at', { count: 'exact' })
        .not('role', 'in', '("dentist","admin")');

      // Apply search filter if provided
      const searchFilter = buildSearchFilter(params.search);
      if (searchFilter) {
        query = query.or(searchFilter);
      }

      // Apply pagination
      const { data: profiles, error: profilesError, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (profilesError) {
        logger.error('Failed to load patients', { error: profilesError });
        throw AppError.internal('Failed to load patients');
      }

      const profileIds = (profiles || []).map(p => p.id).filter(Boolean);
      const statsMap = new Map<
        string,
        {
          total: number;
          lastAppointment: string | null;
        }
      >();

      // Get appointment stats for these patients
      if (profileIds.length > 0) {
        const { data: appointmentRows, error: appointmentError } = await supabase
          .from('appointments')
          .select('patient_id, appointment_date')
          .in('patient_id', profileIds);

        if (appointmentError) {
          logger.error('Failed to load patient appointment stats', { appointmentError });
          throw AppError.internal('Failed to load patient stats');
        }

        (appointmentRows || []).forEach((row) => {
          if (!row.patient_id) return;
          const stat = statsMap.get(row.patient_id) || { total: 0, lastAppointment: null as string | null };
          stat.total += 1;
          if (!stat.lastAppointment || row.appointment_date > stat.lastAppointment) {
            stat.lastAppointment = row.appointment_date;
          }
          statsMap.set(row.patient_id, stat);
        });
      }

      const data = (profiles || []).map((profile) => {
        const stats = statsMap.get(profile.id) || { total: 0, lastAppointment: null };
        return {
          id: profile.id,
          name: profile.full_name || 'Unknown User',
          email: profile.email,
          phone: profile.phone,
          joinedAt: profile.created_at,
          totalAppointments: stats.total,
          lastAppointment: stats.lastAppointment,
        };
      });

      return {
        data,
        pagination: {
          total: count ?? data.length,
          page,
          limit,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to load patients', { error });
      throw AppError.internal('Failed to load patients');
    }
  }

  async getDentists() {
    try {
      // First try to get from dentists table
      const { data: dentists, error: dentistsError } = await supabase
        .from('dentists')
        .select(
          'id, name, email, specialization, phone, status, years_of_experience, education, bio, image_url, created_at, updated_at'
        )
        .order('created_at', { ascending: false });

      let dentistList = dentists || [];

      // If no dentists in dentists table, get from profiles with role='dentist'
      if (!dentistList.length || dentistsError) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, created_at')
          .eq('role', 'dentist')
          .order('created_at', { ascending: false });

        if (!profilesError && profiles) {
          dentistList = profiles.map((p: any) => ({
            id: p.id,
            name: p.full_name,
            email: p.email,
            phone: p.phone,
            specialization: 'General Dentistry',
            status: 'active',
            created_at: p.created_at,
            years_of_experience: 0,
            experience_years: 0,
            education: null,
            bio: null,
            profile_picture: null,
            image_url: null,
            updated_at: p.created_at
          }));
        }
      }

      const dentistIds = dentistList.map((dentist: any) => dentist.id).filter(Boolean);
      const dentistEmails = dentistList.map((dentist: any) => dentist.email).filter(Boolean);
      const statsMap = new Map<
        string,
        {
          total: number;
          upcoming: number;
        }
      >();

      if (dentistIds.length > 0 || dentistEmails.length > 0) {
        let appointmentQuery = supabase
          .from('appointments')
          .select('dentist_id, dentist_email, status');

        if (dentistIds.length > 0) {
          appointmentQuery = appointmentQuery.in('dentist_id', dentistIds);
        } else if (dentistEmails.length > 0) {
          appointmentQuery = appointmentQuery.in('dentist_email', dentistEmails);
        }

        const { data: appointmentRows, error: appointmentError } = await appointmentQuery;

        if (appointmentError) {
          logger.warn('Failed to load dentist stats', { appointmentError });
        } else if (appointmentRows) {
          appointmentRows.forEach((row) => {
            const key = row.dentist_id || row.dentist_email;
            if (!key) return;
            const stat = statsMap.get(key) || { total: 0, upcoming: 0 };
            stat.total += 1;
            if (['pending', 'confirmed', 'upcoming'].includes(row.status)) {
              stat.upcoming += 1;
            }
            statsMap.set(key, stat);
          });
        }
      }

      const data = dentistList.map((dentist: any) => {
        const key = dentist.id || dentist.email;
        const stats = statsMap.get(key) || { total: 0, upcoming: 0 };
        return {
          id: dentist.id,
          name: dentist.name || dentist.full_name,
          email: dentist.email,
          specialization: dentist.specialization || dentist.specialty || 'General Dentistry',
          phone: dentist.phone,
          status: dentist.status || 'active',
          years_of_experience: dentist.years_of_experience,
          education: dentist.education,
          bio: dentist.bio,
          image_url: dentist.image_url,
          profile_picture: dentist.image_url, // Keep for compatibility if needed by frontend types
          totalAppointments: stats.total,
          upcomingAppointments: stats.upcoming,
        };
      });

      return { data };
    } catch (error) {
      logger.error('Failed to load dentists', { error });
      throw AppError.internal('Failed to load dentists');
    }
  }

  async createDentist(rawInput: unknown) {
    const payload = createDentistSchema.parse(rawInput);

    // Generate a temporary password
    const tempPassword = generateTempPassword();

    try {
      // Validate email format
      if (!payload.email || !payload.email.includes('@')) {
        throw AppError.validation('Invalid email address');
      }

      // Validate password requirements (Supabase requires min 6 characters)
      if (tempPassword.length < 6) {
        logger.error('Generated password too short', { length: tempPassword.length });
        throw AppError.internal('Password generation failed');
      }

      // Check if email already exists in profiles or dentists
      const { data: checkProfile } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('email', payload.email)
        .single();

      if (checkProfile) {
        throw AppError.conflict(
          `Email ${payload.email} is already registered. Please use a different email address.`
        );
      }

      const { data: existingDentist } = await supabase
        .from('dentists')
        .select('id, email')
        .eq('email', payload.email)
        .single();

      if (existingDentist) {
        throw AppError.conflict(
          `A dentist with email ${payload.email} already exists. Please use a different email address.`
        );
      }

      // Pre-creation validation: Check service role key permissions
      const { testAdminPermissions, validateServiceRoleKey } = await import('../config/supabase.js');
      const keyValidation = validateServiceRoleKey();
      if (!keyValidation.valid) {
        logger.error('Service role key validation failed', { message: keyValidation.message });
        throw AppError.internal(
          `Service role key configuration error: ${keyValidation.message}. ` +
          'Please check your SUPABASE_SERVICE_ROLE_KEY in the backend .env file. ' +
          'Get the correct key from Supabase Dashboard > Settings > API > service_role key (secret).'
        );
      }

      const hasAdminPerms = await testAdminPermissions();
      if (!hasAdminPerms) {
        logger.error('Service role key does not have admin permissions');
        throw AppError.internal(
          'Service role key does not have admin permissions. ' +
          'Please verify that SUPABASE_SERVICE_ROLE_KEY in your backend .env file is the correct service_role key from Supabase Dashboard. ' +
          'The service role key should start with "eyJ" and be different from the anon key.'
        );
      }

      logger.info('Creating auth user', { email: payload.email, name: payload.name });

      // 1. Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: payload.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: payload.name,
          role: 'dentist'
        }
      });

      if (authError) {
        // Log full error object for debugging
        logger.error('Failed to create auth user', {
          error: authError,
          errorType: authError.constructor?.name,
          message: authError.message,
          status: authError.status,
          code: authError.code,
          name: (authError as any).name,
          email: payload.email,
          fullError: JSON.stringify(authError, Object.getOwnPropertyNames(authError))
        });

        // Handle specific error cases
        if (authError.message?.includes('already registered') ||
          authError.message?.includes('already exists') ||
          authError.message?.includes('User already registered')) {
          throw AppError.conflict('Email already registered. Please use a different email address.');
        }

        if (authError.message?.includes('Invalid email')) {
          throw AppError.validation('Invalid email address format');
        }

        if (authError.message?.includes('Password')) {
          throw AppError.validation('Password does not meet requirements');
        }

        // Handle unexpected_failure code specifically
        if (authError.code === 'unexpected_failure' || (authError as any).code === 'unexpected_failure') {
          logger.error('Unexpected failure when creating user - likely service role key issue', {
            status: authError.status,
            code: authError.code,
            message: authError.message
          });
          throw AppError.internal(
            'Failed to create dentist account: Authentication service error. ' +
            'This usually means the service role key is invalid or does not have admin permissions. ' +
            'Please verify SUPABASE_SERVICE_ROLE_KEY in your backend .env file. ' +
            'Get the correct key from Supabase Dashboard > Settings > API > service_role key (secret). ' +
            'The key should start with "eyJ" (not "sb_").'
          );
        }

        // Check if it's a service role key issue (401, 403, or JWT-related)
        if (authError.status === 401 || authError.status === 403 ||
          authError.message?.includes('JWT') ||
          authError.message?.includes('token') ||
          authError.message?.includes('unauthorized') ||
          authError.message?.includes('forbidden')) {
          logger.error('Service role key authentication issue', { error: authError });
          throw AppError.internal(
            'Authentication configuration error: The service role key may be invalid or expired. ' +
            'Please check SUPABASE_SERVICE_ROLE_KEY in your backend .env file and ensure it is the correct service_role key from Supabase Dashboard.'
          );
        }

        // Generic error with more details
        const errorDetails = authError.message || authError.code || 'Unknown error';
        throw AppError.internal(
          `Failed to create dentist account: ${errorDetails}. ` +
          'If this persists, please check your Supabase service role key configuration.'
        );
      }

      if (!authData.user) {
        throw AppError.internal('Failed to create dentist account: No user returned');
      }

      const userId = authData.user.id;

      // 2. Update Profile (trigger already created it, we just need to set role and other fields)
      //    Give the trigger a moment to complete, then check if profile exists
      await new Promise(resolve => setTimeout(resolve, 500));

      // First check if profile exists, if not create it
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        logger.error('Failed to check profile existence', { error: checkError });
        await supabase.auth.admin.deleteUser(userId);
        throw AppError.internal(`Failed to check profile: ${checkError.message}`);
      }

      let profileError;
      if (!existingProfile) {
        // Profile doesn't exist, create it
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: payload.name,
            email: payload.email,
            phone: payload.phone || null,
            role: 'dentist',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        profileError = insertError;
      } else {
        // Profile exists, update it
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: payload.name,
            email: payload.email,
            phone: payload.phone || null,
            role: 'dentist',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        profileError = updateError;
      }

      if (profileError) {
        logger.error('Failed to create/update profile', { error: profileError, userId });
        // Try to clean up auth user
        try {
          await supabase.auth.admin.deleteUser(userId);
        } catch (cleanupError) {
          logger.error('Failed to cleanup auth user after profile error', { cleanupError });
        }
        throw AppError.internal(`Failed to create dentist profile: ${profileError.message || profileError.code || 'Unknown error'}`);
      }

      // 3. Create/Update Dentist Record
      const { error: dentistError } = await supabase
        .from('dentists')
        .upsert({
          id: userId,
          name: payload.name,
          email: payload.email,
          specialization: payload.specialization,
          phone: payload.phone || null,
          years_of_experience: payload.years_of_experience || 0,
          bio: payload.bio || null,
          education: payload.education || null,
          status: 'active',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (dentistError) {
        logger.error('Failed to create dentist record', { error: dentistError, userId });
        // Try to clean up auth user and profile
        try {
          await supabase.auth.admin.deleteUser(userId);
          await supabase.from('profiles').delete().eq('id', userId);
        } catch (cleanupError) {
          logger.error('Failed to cleanup after dentist record error', { cleanupError });
        }
        throw AppError.internal(`Failed to create dentist details: ${dentistError.message || dentistError.code || 'Unknown error'}`);
      }

      // 4. Assign Role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: 'dentist',
          dentist_id: userId
        }, { onConflict: 'user_id, role' });

      if (roleError) {
        logger.error('Failed to assign role', { error: roleError });
        // Continue anyway as profile has role
      }

      // 5. Create availability records if provided
      if (payload.availability && payload.availability.length > 0) {
        // Validate time ranges
        for (const avail of payload.availability) {
          if (avail.start_time >= avail.end_time) {
            logger.warn('Invalid time range for availability', { avail });
            throw AppError.validation(`Invalid time range for day ${avail.day_of_week}: start time must be before end time`);
          }
        }

        const availabilityRecords = payload.availability.map((avail) => ({
          dentist_id: userId,
          day_of_week: avail.day_of_week,
          start_time: avail.start_time,
          end_time: avail.end_time,
          slot_duration_minutes: avail.slot_duration_minutes,
          is_available: avail.is_available,
        }));

        const { error: availabilityError } = await supabase
          .from('dentist_availability')
          .insert(availabilityRecords);

        if (availabilityError) {
          logger.error('Failed to create availability records', { error: availabilityError });
          // Don't throw - dentist is created, they can add availability later
          logger.warn('Dentist created but availability not saved', { dentistId: userId });
        } else {
          logger.info('Availability records created successfully', { dentistId: userId, count: availabilityRecords.length });
        }
      }

      return {
        dentist: {
          id: userId,
          name: payload.name,
          email: payload.email,
          expertise: [payload.specialization],
          status: 'active',
        },
        tempPassword,
      };

    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Unexpected error creating dentist', { error });
      throw AppError.internal('An unexpected error occurred while creating the dentist');
    }
  }

  async deleteDentist(dentistId: string) {
    try {
      // 1. Delete from Dentists
      const { error: dentistError } = await supabase
        .from('dentists')
        .delete()
        .eq('id', dentistId);

      if (dentistError) {
        logger.error('Failed to delete dentist record', { error: dentistError });
        throw AppError.internal('Failed to delete dentist');
      }

      // 2. Delete from Profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', dentistId);

      if (profileError) {
        logger.warn('Failed to delete profile', { error: profileError });
      }

      // 3. Delete Auth User
      const { error: authError } = await supabase.auth.admin.deleteUser(dentistId);
      if (authError) {
        logger.error('Failed to delete auth user', { error: authError });
        // Don't throw here if DB deletion worked, as it might be already deleted or not found
      }

      return { message: 'Dentist deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Unexpected error deleting dentist', { error });
      throw AppError.internal('An unexpected error occurred while deleting the dentist');
    }
  }

  async getDentist(dentistId: string) {
    try {
      // Fetch dentist with profile data
      const { data: dentist, error: dentistError } = await supabase
        .from('dentists')
        .select('*')
        .eq('id', dentistId)
        .single();

      if (dentistError) {
        if (dentistError.code === 'PGRST116') {
          throw AppError.notFound(`Dentist with ID ${dentistId} not found`);
        }
        logger.error('Failed to fetch dentist', { error: dentistError });
        throw AppError.internal('Failed to fetch dentist details');
      }

      // Fetch profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', dentistId)
        .single();

      return {
        data: {
          id: dentist.id,
          name: dentist.name,
          email: dentist.email,
          specialization: dentist.specialization,
          phone: dentist.phone || profile?.phone || '',
          status: dentist.status || 'active',
          years_of_experience: dentist.years_of_experience || 0,
          education: dentist.education || '',
          bio: dentist.bio || '',
          image_url: dentist.image_url || null,
          profile_picture: dentist.image_url || dentist.profile_picture || null,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Unexpected error fetching dentist', { error });
      throw AppError.internal('An unexpected error occurred while fetching the dentist');
    }
  }

  async updateDentist(dentistId: string, rawInput: unknown) {
    try {
      const updates = rawInput as any;

      // Validate dentist exists
      const { data: existingDentist, error: checkError } = await supabase
        .from('dentists')
        .select('id, email')
        .eq('id', dentistId)
        .single();

      if (checkError || !existingDentist) {
        throw AppError.notFound(`Dentist with ID ${dentistId} not found`);
      }

      // If email is being changed, check it's not already in use
      if (updates.email && updates.email !== existingDentist.email) {
        const { data: emailCheck } = await supabase
          .from('dentists')
          .select('id')
          .eq('email', updates.email)
          .neq('id', dentistId)
          .single();

        if (emailCheck) {
          throw AppError.conflict('Email already in use by another dentist');
        }
      }

      // Update dentists table
      const dentistUpdates: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name) dentistUpdates.name = updates.name;
      if (updates.email) dentistUpdates.email = updates.email;
      if (updates.specialization) dentistUpdates.specialization = updates.specialization;
      if (updates.phone !== undefined) dentistUpdates.phone = updates.phone;
      if (updates.years_of_experience !== undefined) dentistUpdates.years_of_experience = updates.years_of_experience;
      if (updates.education !== undefined) dentistUpdates.education = updates.education;
      if (updates.bio !== undefined) dentistUpdates.bio = updates.bio;
      if (updates.image_url !== undefined) dentistUpdates.image_url = updates.image_url;
      if (updates.status) dentistUpdates.status = updates.status;

      const { error: dentistError } = await supabase
        .from('dentists')
        .update(dentistUpdates)
        .eq('id', dentistId);

      if (dentistError) {
        logger.error('Failed to update dentist', { error: dentistError });
        throw AppError.internal('Failed to update dentist details');
      }

      // Update profile table
      const profileUpdates: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name) profileUpdates.full_name = updates.name;
      if (updates.email) profileUpdates.email = updates.email;
      if (updates.phone !== undefined) profileUpdates.phone = updates.phone;

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', dentistId);

      if (profileError) {
        logger.warn('Failed to update profile', { error: profileError });
        // Don't throw - dentist update succeeded
      }

      // Fetch updated dentist
      return await this.getDentist(dentistId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Unexpected error updating dentist', { error });
      throw AppError.internal('An unexpected error occurred while updating the dentist');
    }
  }

  async getAnalytics() {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 6);
    const trendStart = startDate.toISOString().split('T')[0];
    const upcomingStart = now.toISOString().split('T')[0];
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [{ count: patientCount }, { count: dentistCount }, { count: appointmentCount }, { count: upcomingCount }] =
      await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('dentists').select('id', { count: 'exact', head: true }),
        supabase.from('appointments').select('id', { count: 'exact', head: true }),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'confirmed', 'upcoming'])
          .gte('appointment_date', upcomingStart),
      ]);

    const { data: recentAppointments } = await supabase
      .from('appointments')
      .select('appointment_date, status')
      .gte('appointment_date', trendStart)
      .order('appointment_date', { ascending: true });

    const trendMap = new Map<
      string,
      {
        total: number;
        completed: number;
        cancelled: number;
      }
    >();

    for (let i = 0; i < 7; i += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const key = date.toISOString().split('T')[0];
      trendMap.set(key, { total: 0, completed: 0, cancelled: 0 });
    }

    (recentAppointments || []).forEach((appointment) => {
      const stat = trendMap.get(appointment.appointment_date);
      if (!stat) return;
      stat.total += 1;
      if (appointment.status === 'completed') stat.completed += 1;
      if (appointment.status === 'cancelled') stat.cancelled += 1;
    });

    const bookingsTrend = Array.from(trendMap.entries()).map(([date, stat]) => ({
      date,
      ...stat,
    }));

    const { data: dentistAppointments } = await supabase
      .from('appointments')
      .select('dentist_id, status')
      .gte('created_at', ninetyDaysAgo.toISOString());

    const dentistStatsMap = new Map<
      string,
      {
        total: number;
        upcoming: number;
      }
    >();

    (dentistAppointments || []).forEach((appointment) => {
      if (!appointment.dentist_id) return;
      const stat = dentistStatsMap.get(appointment.dentist_id) || { total: 0, upcoming: 0 };
      stat.total += 1;
      if (['pending', 'confirmed', 'upcoming'].includes(appointment.status)) {
        stat.upcoming += 1;
      }
      dentistStatsMap.set(appointment.dentist_id, stat);
    });

    const topDentistIds = Array.from(dentistStatsMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 6)
      .map(([dentistId]) => dentistId);

    const { data: topDentistsData } = topDentistIds.length
      ? await supabase
        .from('dentists')
        .select('id, name, email, specialization')
        .in('id', topDentistIds)
      : { data: [] };

    const topDentists = (topDentistsData || []).map((dentist) => ({
      id: dentist.id,
      name: dentist.name,
      email: dentist.email,
      specialization: dentist.specialization,
      totalAppointments: dentistStatsMap.get(dentist.id)?.total ?? 0,
      upcomingAppointments: dentistStatsMap.get(dentist.id)?.upcoming ?? 0,
    }));

    const { data: eventLogs } = await supabase
      .from('realtime_events')
      .select('id, table_name, event_type, created_at, payload')
      .order('created_at', { ascending: false })
      .limit(30);

    const errorEvents = (eventLogs || []).filter((event) => {
      const payload = event.payload as Record<string, any> | null;
      const level = payload?.level?.toString().toLowerCase();
      const status = payload?.status?.toString().toLowerCase();
      return (
        level === 'error' ||
        status === 'error' ||
        status === 'failed' ||
        event.table_name.toLowerCase().includes('error')
      );
    });

    const alerts = (eventLogs || []).slice(0, 10).map((event) => {
      const payload = event.payload as Record<string, any> | null;
      const severity = errorEvents.find((errorEvent) => errorEvent.id === event.id) ? 'error' : 'info';
      return {
        id: event.id,
        table: event.table_name,
        eventType: event.event_type,
        severity,
        createdAt: event.created_at,
        description: payload?.message || payload?.description || `${event.event_type} on ${event.table_name}`,
      };
    });

    const errorSummary = {
      totalEvents: errorEvents.length,
      last24h: errorEvents.filter((event) => {
        const createdAt = new Date(event.created_at);
        return now.getTime() - createdAt.getTime() <= 24 * 60 * 60 * 1000;
      }).length,
      tablesImpacted: Array.from(new Set(errorEvents.map((event) => event.table_name))),
    };

    return {
      summary: {
        totalPatients: patientCount || 0,
        totalDentists: dentistCount || 0,
        totalAppointments: appointmentCount || 0,
        upcomingAppointments: upcomingCount || 0,
      },
      bookingsTrend,
      topDentists,
      systemAlerts: alerts,
      errorSummary,
    };
  }

  async getDashboardStats() {
    try {
      // Get total patients (profiles that are NOT dentists or admins)
      const { data: dentists } = await supabase
        .from('dentists')
        .select('id');
      const dentistIds = (dentists || []).map(d => d.id).filter(Boolean);

      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      const adminIds = (admins || []).map(a => a.user_id).filter(Boolean);
      const excludeIds = [...new Set([...dentistIds, ...adminIds])];

      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      const { count: patientsCount } = await query;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: appointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_at', today.toISOString())
        .lt('scheduled_at', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());

      const { count: pendingCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: completedCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      return {
        totalPatients: patientsCount || 0,
        todayAppointments: appointmentsCount || 0,
        pendingAppointments: pendingCount || 0,
        completedAppointments: completedCount || 0,
      };
    } catch (error) {
      logger.error('Failed to load dashboard stats', { error });
      throw AppError.internal('Failed to load dashboard stats');
    }
  }

  async generateAnalyticsPdf(analytics: Awaited<ReturnType<AdminService['getAnalytics']>>) {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40 });
        const chunks: Uint8Array[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(20).text('Aqua Dent Link - Admin Analytics', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`);
        doc.moveDown();

        doc.fontSize(16).text('Summary', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).list([
          `Total Patients: ${analytics.summary.totalPatients}`,
          `Total Dentists: ${analytics.summary.totalDentists}`,
          `Total Appointments: ${analytics.summary.totalAppointments}`,
          `Upcoming Appointments: ${analytics.summary.upcomingAppointments}`,
        ]);

        doc.moveDown();
        doc.fontSize(16).text('Bookings Trend (Last 7 Days)', { underline: true });
        doc.moveDown(0.5);
        analytics.bookingsTrend.forEach((entry) => {
          doc.fontSize(12).text(
            `${entry.date}: total ${entry.total}, completed ${entry.completed}, cancelled ${entry.cancelled}`
          );
        });

        doc.moveDown();
        doc.fontSize(16).text('Top Dentists', { underline: true });
        doc.moveDown(0.5);
        if (analytics.topDentists.length === 0) {
          doc.fontSize(12).text('No dentist performance data available yet.');
        } else {
          analytics.topDentists.forEach((dentist, index) => {
            doc
              .fontSize(12)
              .text(
                `${index + 1}. ${dentist.name} (${dentist.specialization || 'General'}) - Total: ${dentist.totalAppointments
                }, Upcoming: ${dentist.upcomingAppointments}`
              );
          });
        }

        doc.moveDown();
        doc.fontSize(16).text('System Alerts', { underline: true });
        doc.moveDown(0.5);
        if (analytics.systemAlerts.length === 0) {
          doc.fontSize(12).text('No recent alerts.');
        } else {
          analytics.systemAlerts.forEach((alert) => {
            doc
              .fontSize(12)
              .text(
                `• [${alert.severity.toUpperCase()}] ${alert.table} ${alert.eventType} at ${alert.createdAt
                } - ${alert.description}`
              );
          });
        }

        doc.moveDown();
        doc.fontSize(16).text('Error Summary', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).list([
          `Total Errors Logged: ${analytics.errorSummary.totalEvents}`,
          `Errors in Last 24h: ${analytics.errorSummary.last24h}`,
          `Tables Impacted: ${analytics.errorSummary.tablesImpacted.length > 0
            ? analytics.errorSummary.tablesImpacted.join(', ')
            : 'None'
          }`,
        ]);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async getDiagnostics() {
    try {
      const diagnostics: {
        serviceRoleKey: { valid: boolean; message?: string };
        adminPermissions: boolean;
        createUserCapability: { success: boolean; error?: string };
        databaseConnection: boolean;
        recommendations: string[];
      } = {
        serviceRoleKey: { valid: false },
        adminPermissions: false,
        createUserCapability: { success: false },
        databaseConnection: false,
        recommendations: [],
      };

      // Test service role key format
      const { validateServiceRoleKey } = await import('../config/supabase.js');
      diagnostics.serviceRoleKey = validateServiceRoleKey();
      if (!diagnostics.serviceRoleKey.valid) {
        diagnostics.recommendations.push(
          'Fix service role key: Get the correct service_role key from Supabase Dashboard > Settings > API > service_role key (secret). It should start with "eyJ".'
        );
      }

      // Test database connection
      const { testSupabaseConnection } = await import('../config/supabase.js');
      diagnostics.databaseConnection = await testSupabaseConnection();
      if (!diagnostics.databaseConnection) {
        diagnostics.recommendations.push(
          'Check database connection: Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend .env file.'
        );
      }

      // Test admin permissions
      const { testAdminPermissions } = await import('../config/supabase.js');
      diagnostics.adminPermissions = await testAdminPermissions();
      if (!diagnostics.adminPermissions) {
        diagnostics.recommendations.push(
          'Service role key does not have admin permissions. Verify the key is the service_role key, not the anon key.'
        );
      }

      // Test create user capability
      const { testCreateUserCapability } = await import('../config/supabase.js');
      diagnostics.createUserCapability = await testCreateUserCapability();
      if (!diagnostics.createUserCapability.success) {
        diagnostics.recommendations.push(
          `Cannot create users: ${diagnostics.createUserCapability.error}. Check Supabase project settings and service role key.`
        );
      }

      // Add general recommendations if all checks pass
      if (diagnostics.serviceRoleKey.valid &&
        diagnostics.databaseConnection &&
        diagnostics.adminPermissions &&
        diagnostics.createUserCapability.success) {
        diagnostics.recommendations.push('All checks passed! Dentist creation should work correctly.');
      }

      return diagnostics;
    } catch (error: any) {
      logger.error('Error getting diagnostics', { error });
      throw AppError.internal('Failed to get diagnostics: ' + error.message);
    }
  }

  /**
   * Get all system data for export
   */
  async getExportData(): Promise<any> {
    try {
      // Fetch all data in parallel for maximum speed
      const [
        { data: patients, error: patientsError },
        { data: dentists, error: dentistsError },
        { data: appointments, error: appointmentsError }
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, phone, created_at')
          .eq('role', 'patient')
          .order('created_at', { ascending: false }),
        supabase
          .from('dentists')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('appointments')
          .select('id, patient_id, dentist_id, status, payment_status, symptoms, reason, appointment_date')
          .order('appointment_date', { ascending: false })
      ]);

      if (patientsError) {
        logger.error('Error fetching patients for export', { error: patientsError });
      }
      if (dentistsError) {
        logger.error('Error fetching dentists for export', { error: dentistsError });
      }
      if (appointmentsError) {
        logger.error('Error fetching appointments for export', { error: appointmentsError });
      }

      // Count appointments per patient in memory (FAST - no extra queries!)
      const patientAppointmentCounts = new Map<string, number>();
      const dentistAppointmentCounts = new Map<string, number>();

      (appointments || []).forEach((apt) => {
        if (apt.patient_id) {
          patientAppointmentCounts.set(apt.patient_id, (patientAppointmentCounts.get(apt.patient_id) || 0) + 1);
        }
        if (apt.dentist_id) {
          dentistAppointmentCounts.set(apt.dentist_id, (dentistAppointmentCounts.get(apt.dentist_id) || 0) + 1);
        }
      });

      // Enrich patients with counts (no extra queries)
      const patientsWithCounts = (patients || []).map((patient) => ({
        ...patient,
        total_appointments: patientAppointmentCounts.get(patient.id) || 0
      }));

      // Enrich dentists with counts (no extra queries)
      const dentistsWithCounts = (dentists || []).map((dentist) => ({
        ...dentist,
        total_appointments: dentistAppointmentCounts.get(dentist.id) || 0
      }));

      // Calculate summary statistics
      const totalPatients = patients?.length || 0;
      const totalDentists = dentists?.length || 0;
      const totalAppointments = appointments?.length || 0;

      const appointmentsByStatus = appointments?.reduce((acc: any, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      }, {});

      // Calculate revenue (pending payments)
      const pendingPayments = appointments?.filter((apt) => apt.payment_status === 'pending') || [];
      const pendingRevenue = pendingPayments.length * 50; // Assuming $50 average

      // Top symptoms
      const symptomCounts = appointments?.reduce((acc: any, apt) => {
        const symptom = apt.symptoms || apt.reason || 'Unknown';
        acc[symptom] = (acc[symptom] || 0) + 1;
        return acc;
      }, {});

      const topSymptoms = Object.entries(symptomCounts || {})
        .map(([symptom, count]) => ({ symptom, count }))
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 10);

      return {
        patients: patientsWithCounts,
        dentists: dentistsWithCounts,
        appointments,
        summary: {
          totalPatients,
          totalDentists,
          totalAppointments,
          ...appointmentsByStatus,
          pendingAppointments: appointmentsByStatus?.pending || 0,
          completedAppointments: appointmentsByStatus?.completed || 0,
          cancelledAppointments: appointmentsByStatus?.cancelled || 0,
          upcomingAppointments: appointmentsByStatus?.upcoming || 0,
          pendingRevenue,
          topSymptoms,
        },
      };
    } catch (error: any) {
      logger.error('Error getting export data', { error });
      throw AppError.internal('Failed to get export data: ' + error.message);
    }
  }
}

export const adminService = new AdminService();

