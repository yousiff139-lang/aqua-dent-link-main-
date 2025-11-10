import { supabase } from '@/integrations/supabase/client';
import type { Booking, DentistStats, DentistProfile } from '@/types/dentist';

export class DentistService {
  // Fetch dentist profile
  async getDentistProfile(dentistId: string): Promise<DentistProfile | null> {
    // @ts-ignore - avatar_url column will be added by migration
    const { data, error } = await (supabase as any)
      .from('dentists')
      .select(`
        *,
        profiles!inner(full_name, email, avatar_url)
      `)
      .eq('id', dentistId)
      .single();

    if (error) throw error;
    
    return data ? {
      id: data.id,
      full_name: data.profiles.full_name,
      email: data.profiles.email,
      specialization: data.specialization,
      bio: data.bio,
      years_of_experience: data.years_of_experience,
      rating: data.rating,
      avatar_url: data.profiles.avatar_url,
    } : null;
  }

  // Fetch all bookings for a dentist
  async getBookings(dentistId: string): Promise<Booking[]> {
    // @ts-ignore - Some columns will be added by migration
    const { data, error } = await (supabase as any)
      .from('appointments')
      .select(`
        *,
        patient:profiles!appointments_patient_id_fkey(full_name, email, phone, age, medical_conditions, avatar_url)
      `)
      .eq('dentist_id', dentistId)
      .order('appointment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    // @ts-ignore - Some properties will be added by migration
    return (data || []).map(apt => ({
      id: apt.id,
      patient_id: apt.patient_id,
      patient_name: apt.patient?.full_name || 'Unknown',
      patient_phone: apt.patient?.phone || '',
      patient_email: apt.patient?.email || '',
      patient_age: apt.patient?.age,
      patient_medical_conditions: apt.patient?.medical_conditions,
      dentist_id: apt.dentist_id,
      appointment_date: apt.appointment_date,
      appointment_time: apt.appointment_time || '',
      symptoms: apt.symptoms || apt.chief_complaint || '',
      status: apt.status,
      documents: apt.documents || [],
      dentist_notes: apt.dentist_notes,
      payment_amount: apt.payment_amount,
      payment_status: apt.payment_status,
      booking_reference: apt.booking_reference,
      created_at: apt.created_at,
      completed_at: apt.completed_at,
      cancelled_at: apt.cancelled_at,
      cancellation_reason: apt.cancellation_reason,
    }));
  }

  // Calculate dentist statistics
  async getStats(dentistId: string): Promise<DentistStats> {
    const bookings = await this.getBookings(dentistId);

    const stats: DentistStats = {
      totalBookings: bookings.length,
      upcomingBookings: bookings.filter(b => b.status === 'upcoming').length,
      completedBookings: bookings.filter(b => b.status === 'completed').length,
      cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
      totalRevenue: bookings
        .filter(b => b.status === 'completed' && b.payment_amount)
        .reduce((sum, b) => sum + (b.payment_amount || 0), 0),
      averageRating: 0, // Will be calculated from reviews later
    };

    return stats;
  }

  // Mark booking as completed
  async markBookingCompleted(
    bookingId: string,
    paymentAmount: number,
    notes?: string
  ): Promise<void> {
    // @ts-ignore - Some columns will be added by migration
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        payment_amount: paymentAmount,
        payment_status: 'pending',
        dentist_notes: notes,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', bookingId);

    if (error) throw error;
  }

  // Cancel booking
  async cancelBooking(bookingId: string, reason: string): Promise<void> {
    // @ts-ignore - Some columns will be added by migration
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', bookingId);

    if (error) throw error;
  }

  // Update dentist notes
  async updateNotes(bookingId: string, notes: string): Promise<void> {
    // @ts-ignore - dentist_notes column will be added by migration
    const { error } = await supabase
      .from('appointments')
      .update({
        dentist_notes: notes,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', bookingId);

    if (error) throw error;
  }

  // Send payment email (placeholder - will be implemented with email service)
  async sendPaymentEmail(bookingId: string): Promise<void> {
    // This will be implemented with actual email service
    console.log('Sending payment email for booking:', bookingId);
    
    // Update payment status
    // @ts-ignore - payment_status column will be added by migration
    const { error } = await supabase
      .from('appointments')
      .update({
        payment_status: 'sent',
      } as any)
      .eq('id', bookingId);

    if (error) throw error;

    // Log email sent
    // @ts-ignore - profiles relation will be added by migration
    const { data: appointment } = await (supabase as any)
      .from('appointments')
      .select('patient:profiles!appointments_patient_id_fkey(email)')
      .eq('id', bookingId)
      .single();

    if (appointment) {
      // @ts-ignore - payment_emails table will be created by migration
      await (supabase as any).from('payment_emails').insert({
        appointment_id: bookingId,
        patient_email: appointment.patient.email,
        status: 'sent',
      });
    }
  }

  // Check if user is a dentist
  async isDentist(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'dentist')
      .maybeSingle();

    return !error && data !== null;
  }
}

export const dentistService = new DentistService();
