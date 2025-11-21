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
  const random = crypto.randomBytes(4).toString('hex');
  return `Dentist-${random}`;
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
      // First, get all dentist IDs to exclude them
      const { data: dentists } = await supabase
        .from('dentists')
        .select('id');
      
      const dentistIds = (dentists || []).map(d => d.id).filter(Boolean);

      // Get all admin IDs to exclude them
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      
      const adminIds = (admins || []).map(a => a.user_id).filter(Boolean);

      // Also get dentists from user_roles
      const { data: dentistRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'dentist');
      
      const dentistRoleIds = (dentistRoles || []).map(a => a.user_id).filter(Boolean);

      // Combine IDs to exclude (dentists and admins)
      const excludeIds = [...new Set([...dentistIds, ...adminIds, ...dentistRoleIds])];

      // Build query for profiles that are NOT dentists or admins
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, phone, created_at', { count: 'exact' });

      // Exclude dentists and admins - Supabase PostgREST syntax
      if (excludeIds.length > 0) {
        // Use not.in filter - format: (id1,id2,id3)
        const excludeList = excludeIds.join(',');
        query = query.not('id', 'in', `(${excludeList})`);
      }

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
          'id, name, email, specialization, phone, status, years_of_experience, experience_years, education, bio, profile_picture, image_url, created_at, updated_at'
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
          years_of_experience: dentist.years_of_experience || dentist.experience_years,
          education: dentist.education,
          bio: dentist.bio,
          profile_picture: dentist.profile_picture || dentist.image_url,
          image_url: dentist.image_url || dentist.profile_picture,
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
    const normalizedEmail = payload.email.toLowerCase();

    const { data: existingDentist, error: existingError } = await supabase
      .from('dentists')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (existingError) {
      logger.error('Failed to check existing dentists', { existingError });
      throw AppError.internal('Failed to create dentist');
    }

    if (existingDentist) {
      throw AppError.conflict('A dentist with this email already exists');
    }

    const tempPassword = generateTempPassword();

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role: 'dentist',
        full_name: payload.name,
      },
    });

    if (authError || !authData?.user) {
      logger.error('Failed to create dentist auth user', { authError });
      throw AppError.internal('Failed to create dentist user');
    }

    const userId = authData.user.id;

    const profileInsert = supabase.from('profiles').upsert({
      id: userId,
      full_name: payload.name,
      email: normalizedEmail,
      phone: payload.phone || null,
    });

    const dentistInsert = supabase.from('dentists').upsert({
      id: userId,
      name: payload.name,
      email: normalizedEmail,
      specialization: payload.specialization,
      phone: payload.phone || null,
      years_of_experience: payload.years_of_experience ?? null,
      experience_years: payload.years_of_experience ?? null,
      bio: payload.bio || null,
      education: payload.education || null,
      status: 'active',
    });

    const roleInsert = supabase.from('user_roles').upsert({
      user_id: userId,
      role: 'dentist',
      dentist_id: userId,
    });

    const [profileResult, dentistResult, roleResult] = await Promise.all([profileInsert, dentistInsert, roleInsert]);

    if (profileResult.error || dentistResult.error || roleResult.error) {
      logger.error('Failed to finalize dentist creation', {
        profileError: profileResult.error,
        dentistError: dentistResult.error,
        roleError: roleResult.error,
      });
      await supabase.auth.admin.deleteUser(userId);
      throw AppError.internal('Failed to create dentist');
    }

    return {
      dentist: {
        id: userId,
        ...dentistResult.data?.[0],
      },
      tempPassword,
    };
  }

  async deleteDentist(dentistId: string) {
    const { data: dentist, error } = await supabase
      .from('dentists')
      .select('id, email, name')
      .eq('id', dentistId)
      .single();

    if (error) {
      logger.error('Failed to load dentist before delete', { error });
      throw AppError.notFound('Dentist not found');
    }

    const deleteDentist = supabase.from('dentists').delete().eq('id', dentistId);
    const deleteRoles = supabase.from('user_roles').delete().eq('user_id', dentistId);
    const deleteProfile = supabase.from('profiles').delete().eq('id', dentistId);

    const [dentistDeleteResult, roleDeleteResult, profileDeleteResult] = await Promise.all([
      deleteDentist,
      deleteRoles,
      deleteProfile,
    ]);

    if (dentistDeleteResult.error || roleDeleteResult.error || profileDeleteResult.error) {
      logger.error('Failed to delete dentist records', {
        dentistError: dentistDeleteResult.error,
        roleError: roleDeleteResult.error,
        profileError: profileDeleteResult.error,
      });
      throw AppError.internal('Failed to delete dentist');
    }

    try {
      await supabase.auth.admin.deleteUser(dentistId);
    } catch (authError) {
      logger.warn('Failed to delete dentist auth user (already removed?)', { authError, dentistId });
    }

    return {
      message: `Dentist ${dentist.name || dentist.email} removed successfully`,
    };
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

      const { data: dentistRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'dentist');
      const dentistRoleIds = (dentistRoles || []).map(a => a.user_id).filter(Boolean);

      const excludeIds = [...new Set([...dentistIds, ...adminIds, ...dentistRoleIds])];

      let patientQuery = supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      if (excludeIds.length > 0) {
        const excludeList = excludeIds.join(',');
        patientQuery = patientQuery.not('id', 'in', `(${excludeList})`);
      }

      const { count: totalPatients } = await patientQuery;

      // Get today's appointments
      const today = new Date().toISOString().split('T')[0];
      const { count: todayAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', today)
        .lte('appointment_date', today);

      // Get pending appointments
      const { count: pendingAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'confirmed', 'upcoming']);

      // Get completed appointments
      const { count: completedAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      return {
        totalPatients: totalPatients || 0,
        todayAppointments: todayAppointments || 0,
        pendingAppointments: pendingAppointments || 0,
        completedAppointments: completedAppointments || 0,
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
                `${index + 1}. ${dentist.name} (${dentist.specialization || 'General'}) - Total: ${
                  dentist.totalAppointments
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
                `• [${alert.severity.toUpperCase()}] ${alert.table} ${alert.eventType} at ${
                  alert.createdAt
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
          `Tables Impacted: ${
            analytics.errorSummary.tablesImpacted.length > 0
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
}

export const adminService = new AdminService();

