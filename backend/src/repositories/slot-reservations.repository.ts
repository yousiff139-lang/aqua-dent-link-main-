import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { SlotReservation } from '../types/index.js';
import { AppError } from '../utils/errors.js';

export class SlotReservationsRepository {
  /**
   * Create a new slot reservation
   */
  async create(
    dentistId: string,
    patientId: string,
    slotTime: Date,
    expiresInMinutes: number = 5
  ): Promise<SlotReservation> {
    try {
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60000);

      const { data, error } = await supabase
        .from('slot_reservations')
        .insert({
          dentist_id: dentistId,
          patient_id: patientId,
          slot_time: slotTime.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        // Check for unique constraint violation (slot already reserved)
        if (error.code === '23505') {
          throw AppError.slotUnavailable('This time slot is already reserved');
        }
        throw error;
      }

      logger.info('Slot reservation created', {
        reservationId: data.id,
        dentistId,
        patientId,
        slotTime,
        expiresAt,
      });

      return data as SlotReservation;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to create slot reservation', {
        dentistId,
        patientId,
        slotTime,
        error,
      });
      throw AppError.internal('Failed to reserve slot');
    }
  }

  /**
   * Find reservation by ID
   */
  async findById(id: string): Promise<SlotReservation | null> {
    try {
      const { data, error } = await supabase
        .from('slot_reservations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as SlotReservation;
    } catch (error) {
      logger.error('Failed to find slot reservation', { id, error });
      throw AppError.internal('Failed to fetch reservation');
    }
  }

  /**
   * Check if a slot is reserved
   */
  async findBySlot(dentistId: string, slotTime: Date): Promise<SlotReservation | null> {
    try {
      const { data, error } = await supabase
        .from('slot_reservations')
        .select('*')
        .eq('dentist_id', dentistId)
        .eq('slot_time', slotTime.toISOString())
        .gte('expires_at', new Date().toISOString()) // Only non-expired
        .maybeSingle();

      if (error) throw error;

      return data as SlotReservation | null;
    } catch (error) {
      logger.error('Failed to check slot reservation', {
        dentistId,
        slotTime,
        error,
      });
      throw AppError.internal('Failed to check slot availability');
    }
  }

  /**
   * Find all reservations for a patient
   */
  async findByPatient(patientId: string): Promise<SlotReservation[]> {
    try {
      const { data, error } = await supabase
        .from('slot_reservations')
        .select('*')
        .eq('patient_id', patientId)
        .gte('expires_at', new Date().toISOString()) // Only non-expired
        .order('slot_time', { ascending: true });

      if (error) throw error;

      return (data as SlotReservation[]) || [];
    } catch (error) {
      logger.error('Failed to find patient reservations', { patientId, error });
      throw AppError.internal('Failed to fetch reservations');
    }
  }

  /**
   * Find all reservations for a dentist
   */
  async findByDentist(dentistId: string): Promise<SlotReservation[]> {
    try {
      const { data, error } = await supabase
        .from('slot_reservations')
        .select('*')
        .eq('dentist_id', dentistId)
        .gte('expires_at', new Date().toISOString()) // Only non-expired
        .order('slot_time', { ascending: true });

      if (error) throw error;

      return (data as SlotReservation[]) || [];
    } catch (error) {
      logger.error('Failed to find dentist reservations', { dentistId, error });
      throw AppError.internal('Failed to fetch reservations');
    }
  }

  /**
   * Delete a reservation by ID
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('slot_reservations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      logger.info('Slot reservation deleted', { reservationId: id });
    } catch (error) {
      logger.error('Failed to delete slot reservation', { id, error });
      throw AppError.internal('Failed to release reservation');
    }
  }

  /**
   * Delete reservation by slot
   */
  async deleteBySlot(dentistId: string, slotTime: Date): Promise<void> {
    try {
      const { error } = await supabase
        .from('slot_reservations')
        .delete()
        .eq('dentist_id', dentistId)
        .eq('slot_time', slotTime.toISOString());

      if (error) throw error;

      logger.info('Slot reservation deleted by slot', { dentistId, slotTime });
    } catch (error) {
      logger.error('Failed to delete slot reservation by slot', {
        dentistId,
        slotTime,
        error,
      });
      throw AppError.internal('Failed to release reservation');
    }
  }

  /**
   * Clean up expired reservations
   */
  async cleanup(): Promise<number> {
    try {
      const { error } = await supabase.rpc('cleanup_expired_reservations');

      if (error) throw error;

      logger.info('Expired reservations cleaned up');
      
      // Return count would require a modified function, for now return 0
      return 0;
    } catch (error) {
      logger.error('Failed to cleanup expired reservations', { error });
      throw AppError.internal('Failed to cleanup reservations');
    }
  }

  /**
   * Check if a slot is available (not reserved and not booked)
   */
  async isSlotAvailable(dentistId: string, slotTime: Date): Promise<boolean> {
    try {
      // Check for existing reservation
      const reservation = await this.findBySlot(dentistId, slotTime);
      if (reservation) {
        return false;
      }

      // Check for existing appointment
      const { data, error } = await supabase
        .from('appointments')
        .select('id')
        .eq('dentist_id', dentistId)
        .eq('appointment_date', slotTime.toISOString())
        .neq('status', 'cancelled')
        .maybeSingle();

      if (error) throw error;

      return !data; // Available if no appointment found
    } catch (error) {
      logger.error('Failed to check slot availability', {
        dentistId,
        slotTime,
        error,
      });
      throw AppError.internal('Failed to check slot availability');
    }
  }
}

// Export singleton instance
export const slotReservationsRepository = new SlotReservationsRepository();
