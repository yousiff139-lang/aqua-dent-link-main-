/**
 * Unified Sync Service
 * Handles all cross-portal synchronization between User, Dentist, and Admin portals
 * 
 * Features:
 * - Manual booking sync (User Portal → Dentist Portal)
 * - Chatbot booking sync (Chatbot → Dentist Portal)
 * - Availability sync (Dentist Portal → User Portal)
 * - Dentist creation/deletion sync (Admin Portal → Dentist Login)
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface SyncEvent {
  type: 'appointment_created' | 'appointment_updated' | 'appointment_deleted' |
        'availability_changed' | 'dentist_created' | 'dentist_deleted' | 'dentist_updated';
  source: 'user_portal' | 'dentist_portal' | 'admin_portal' | 'chatbot';
  data: any;
  timestamp: Date;
}

export type SyncCallback = (event: SyncEvent) => void | Promise<void>;

export class UnifiedSyncService {
  private callbacks: Map<string, Set<SyncCallback>> = new Map();
  private channels: Map<string, any> = new Map();

  /**
   * Initialize real-time subscriptions for all sync events
   */
  initialize(): void {
    this.subscribeToAppointments();
    this.subscribeToAvailability();
    this.subscribeToDentists();
    logger.info('Unified sync service initialized');
  }

  /**
   * Subscribe to appointment changes (User/Chatbot → Dentist Portal)
   */
  private subscribeToAppointments(): void {
    const channel = supabase
      .channel('unified_sync_appointments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          logger.success('Sync: New appointment created', {
            appointmentId: payload.new?.id,
            dentistId: payload.new?.dentist_id,
            source: payload.new?.booking_source || 'manual',
          });

          this.notifyCallbacks({
            type: 'appointment_created',
            source: payload.new?.booking_source === 'chatbot' ? 'chatbot' : 'user_portal',
            data: payload.new,
            timestamp: new Date(),
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          logger.info('Sync: Appointment updated', {
            appointmentId: payload.new?.id,
            status: payload.new?.status,
          });

          this.notifyCallbacks({
            type: 'appointment_updated',
            source: 'dentist_portal', // Usually updated by dentist
            data: {
              ...payload.new,
              oldStatus: payload.old?.status,
            },
            timestamp: new Date(),
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          logger.warn('Sync: Appointment deleted', {
            appointmentId: payload.old?.id,
          });

          this.notifyCallbacks({
            type: 'appointment_deleted',
            source: 'user_portal', // Usually deleted by patient
            data: payload.old,
            timestamp: new Date(),
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.success('Subscribed to appointment sync');
        }
      });

    this.channels.set('appointments', channel);
  }

  /**
   * Subscribe to availability changes (Dentist Portal → User Portal)
   */
  private subscribeToAvailability(): void {
    const channel = supabase
      .channel('unified_sync_availability')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dentist_availability',
        },
        (payload) => {
          logger.info('Sync: Availability added', {
            dentistId: payload.new?.dentist_id,
            dayOfWeek: payload.new?.day_of_week,
          });

          this.notifyCallbacks({
            type: 'availability_changed',
            source: 'dentist_portal',
            data: payload.new,
            timestamp: new Date(),
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dentist_availability',
        },
        (payload) => {
          logger.info('Sync: Availability updated', {
            dentistId: payload.new?.dentist_id,
            dayOfWeek: payload.new?.day_of_week,
          });

          this.notifyCallbacks({
            type: 'availability_changed',
            source: 'dentist_portal',
            data: payload.new,
            timestamp: new Date(),
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'dentist_availability',
        },
        (payload) => {
          logger.warn('Sync: Availability deleted', {
            dentistId: payload.old?.dentist_id,
          });

          this.notifyCallbacks({
            type: 'availability_changed',
            source: 'dentist_portal',
            data: payload.old,
            timestamp: new Date(),
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.success('Subscribed to availability sync');
        }
      });

    this.channels.set('availability', channel);
  }

  /**
   * Subscribe to dentist changes (Admin Portal → Dentist Login)
   */
  private subscribeToDentists(): void {
    const channel = supabase
      .channel('unified_sync_dentists')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dentists',
        },
        (payload) => {
          logger.success('Sync: New dentist created', {
            dentistId: payload.new?.id,
            email: payload.new?.email,
          });

          this.notifyCallbacks({
            type: 'dentist_created',
            source: 'admin_portal',
            data: payload.new,
            timestamp: new Date(),
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dentists',
        },
        (payload) => {
          logger.info('Sync: Dentist updated', {
            dentistId: payload.new?.id,
            email: payload.new?.email,
          });

          this.notifyCallbacks({
            type: 'dentist_updated',
            source: 'admin_portal',
            data: payload.new,
            timestamp: new Date(),
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'dentists',
        },
        (payload) => {
          logger.warn('Sync: Dentist deleted', {
            dentistId: payload.old?.id,
            email: payload.old?.email,
          });

          this.notifyCallbacks({
            type: 'dentist_deleted',
            source: 'admin_portal',
            data: payload.old,
            timestamp: new Date(),
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.success('Subscribed to dentist sync');
        }
      });

    this.channels.set('dentists', channel);
  }

  /**
   * Register a callback for specific event types
   */
  on(eventType: SyncEvent['type'], callback: SyncCallback): () => void {
    if (!this.callbacks.has(eventType)) {
      this.callbacks.set(eventType, new Set());
    }
    this.callbacks.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.get(eventType)?.delete(callback);
    };
  }

  /**
   * Notify all registered callbacks for an event
   */
  private async notifyCallbacks(event: SyncEvent): Promise<void> {
    const callbacks = this.callbacks.get(event.type);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          await callback(event);
        } catch (error) {
          logger.error('Error in sync callback', error, { eventType: event.type });
        }
      }
    }
  }

  /**
   * Manually sync an appointment (for manual booking)
   * This ensures the appointment appears in dentist portal immediately
   */
  async syncAppointment(appointmentId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (error) throw error;

      if (data) {
        this.notifyCallbacks({
          type: 'appointment_created',
          source: 'user_portal',
          data,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      logger.error('Error syncing appointment', error);
      throw error;
    }
  }

  /**
   * Manually sync availability (for dentist portal updates)
   * This ensures availability updates appear in user portal immediately
   */
  async syncAvailability(dentistId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('dentist_availability')
        .select('*')
        .eq('dentist_id', dentistId);

      if (error) throw error;

      if (data && data.length > 0) {
        for (const availability of data) {
          this.notifyCallbacks({
            type: 'availability_changed',
            source: 'dentist_portal',
            data: availability,
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      logger.error('Error syncing availability', error);
      throw error;
    }
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.callbacks.clear();
    logger.info('Unified sync service cleaned up');
  }
}

// Export singleton instance
export const unifiedSyncService = new UnifiedSyncService();

// Auto-initialize on import (can be disabled if needed)
if (typeof window !== 'undefined') {
  unifiedSyncService.initialize();
}

