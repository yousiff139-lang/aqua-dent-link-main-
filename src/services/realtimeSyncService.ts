/**
 * Real-time Synchronization Service
 * Provides unified real-time updates across Admin, User, and Chatbot modules
 */

import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

export type UserRole = 'patient' | 'dentist' | 'admin';

export interface RealtimeSyncEvent {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record_id: string;
  payload: any;
  timestamp: Date;
}

export type AppointmentCallback = (appointment: any, event: 'INSERT' | 'UPDATE' | 'DELETE') => void;
export type AvailabilityCallback = (dentistId: string, availability: any) => void;

export class RealtimeSyncService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, Set<Function>> = new Map();

  /**
   * Subscribe to appointment changes for a specific role and user
   */
  subscribeToAppointments(
    userId: string,
    role: UserRole,
    callbacks: {
      onCreated?: AppointmentCallback;
      onUpdated?: AppointmentCallback;
      onDeleted?: (appointmentId: string) => void;
    }
  ): () => void {
    const channelKey = `appointments:${role}:${userId}`;

    // Remove existing channel if present
    if (this.channels.has(channelKey)) {
      this.unsubscribe(channelKey);
    }

    // Determine filter based on role
    let filter: string;
    if (role === 'patient') {
      filter = `patient_id=eq.${userId}`;
    } else if (role === 'dentist') {
      filter = `dentist_id=eq.${userId}`;
    } else {
      // Admin sees all appointments
      filter = '';
    }

    // Create channel
    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          logger.success('Real-time: New appointment created', {
            appointmentId: payload.new?.id,
            userId,
            role,
          });
          if (callbacks.onCreated) {
            callbacks.onCreated(payload.new, 'INSERT');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          logger.info('Real-time: Appointment updated', {
            appointmentId: payload.new?.id,
            userId,
            role,
          });
          if (callbacks.onUpdated) {
            callbacks.onUpdated(payload.new, 'UPDATE');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'appointments',
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          logger.info('Real-time: Appointment deleted', {
            appointmentId: payload.old?.id,
            userId,
            role,
          });
          if (callbacks.onDeleted && payload.old?.id) {
            callbacks.onDeleted(payload.old.id);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.success('Successfully subscribed to appointment updates', { userId, role });
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Error subscribing to appointment updates', null, { userId, role, status });
        }
      });

    this.channels.set(channelKey, channel);

    // Store callbacks for cleanup
    const callbackSet = new Set<Function>();
    if (callbacks.onCreated) callbackSet.add(callbacks.onCreated);
    if (callbacks.onUpdated) callbackSet.add(callbacks.onUpdated);
    if (callbacks.onDeleted) callbackSet.add(callbacks.onDeleted);
    this.subscriptions.set(channelKey, callbackSet);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(channelKey);
    };
  }

  /**
   * Subscribe to availability changes for a specific dentist
   * Listens to changes in the dentists table for availability updates
   */
  subscribeToAvailability(
    dentistId: string,
    callback: AvailabilityCallback
  ): () => void {
    const channelKey = `availability:dentist:${dentistId}`;

    // Remove existing channel if present
    if (this.channels.has(channelKey)) {
      this.unsubscribe(channelKey);
    }

    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dentists', // Dentists table contains available_times
          filter: `id=eq.${dentistId}`,
        },
        (payload) => {
          // Only trigger if available_times changed
          const oldAvailability = payload.old?.available_times;
          const newAvailability = payload.new?.available_times;
          
          if (
            JSON.stringify(oldAvailability) !==
            JSON.stringify(newAvailability)
          ) {
            logger.info('Real-time: Availability updated', {
              dentistId,
              oldAvailability,
              newAvailability: payload.new?.available_times,
            });
            callback(dentistId, payload.new?.available_times);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.success('Successfully subscribed to availability updates', { dentistId });
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Error subscribing to availability updates', null, { dentistId, status });
        }
      });

    this.channels.set(channelKey, channel);

    // Store callback for cleanup
    const callbackSet = new Set<Function>([callback]);
    this.subscriptions.set(channelKey, callbackSet);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(channelKey);
    };
  }

  /**
   * Subscribe to global availability changes (for chatbot)
   * Listens to all dentist availability changes across the system
   */
  subscribeToGlobalAvailability(callback: AvailabilityCallback): () => void {
    const channelKey = 'availability:global';

    // Remove existing channel if present
    if (this.channels.has(channelKey)) {
      this.unsubscribe(channelKey);
    }

    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dentists', // Dentists table contains available_times
        },
        (payload) => {
          // Only trigger if available_times changed
          const oldAvailability = payload.old?.available_times;
          const newAvailability = payload.new?.available_times;
          
          if (
            newAvailability &&
            JSON.stringify(oldAvailability) !==
            JSON.stringify(newAvailability)
          ) {
            logger.info('Real-time: Global availability updated', {
              dentistId: payload.new.id,
              oldAvailability,
              newAvailability: payload.new.available_times,
            });
            callback(payload.new.id, payload.new.available_times);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.success('Successfully subscribed to global availability updates');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Error subscribing to global availability updates', null, { status });
        }
      });

    this.channels.set(channelKey, channel);

    // Store callback for cleanup
    const callbackSet = new Set<Function>([callback]);
    this.subscriptions.set(channelKey, callbackSet);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(channelKey);
    };
  }

  /**
   * Unsubscribe from a specific channel
   */
  private unsubscribe(channelKey: string): void {
    const channel = this.channels.get(channelKey);
    if (channel) {
      logger.debug('Unsubscribing from channel', { channelKey });
      supabase.removeChannel(channel);
      this.channels.delete(channelKey);
      this.subscriptions.delete(channelKey);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    logger.debug('Unsubscribing from all channels');
    this.channels.forEach((channel, key) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.subscriptions.clear();
  }

  /**
   * Get active subscriptions count
   */
  getActiveSubscriptionsCount(): number {
    return this.channels.size;
  }
}

// Export singleton instance
export const realtimeSyncService = new RealtimeSyncService();

