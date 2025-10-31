/**
 * Real-Time Sync Service
 * Provides comprehensive real-time synchronization between:
 * - Admin Dashboard ↔ Database
 * - Patient Dashboard ↔ Database  
 * - Chatbot ↔ Database
 * - All modules communicate bidirectionally via Supabase Real-time
 */

import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import {
  RealtimeEvent,
  RealtimeEventType,
  Subscription,
  Appointment,
} from '../types/index.js';

export interface RealtimeSyncCallbacks {
  onAppointmentCreated?: (appointment: Appointment) => void;
  onAppointmentUpdated?: (appointment: Appointment) => void;
  onAppointmentDeleted?: (appointmentId: string) => void;
  onAvailabilityChanged?: (dentistId: string, availability: any) => void;
  onError?: (error: Error) => void;
}

export interface SyncSubscription extends Subscription {
  channelName: string;
  active: boolean;
}

/**
 * Real-Time Sync Service
 * Manages all real-time subscriptions and synchronization
 */
export class RealtimeSyncService {
  private subscriptions: Map<string, SyncSubscription> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Subscribe to appointments for a specific user role
   * Supports patient, dentist, and admin roles
   */
  subscribeToAppointments(
    userId: string,
    role: 'patient' | 'dentist' | 'admin',
    callbacks: RealtimeSyncCallbacks
  ): SyncSubscription {
    try {
      const channelName = `appointments:${role}:${userId}`;

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

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'appointments',
            ...(filter && { filter }),
          },
          (payload) => {
            logger.info('Real-time: New appointment created', {
              appointmentId: payload.new?.id,
              userId,
              role,
            });

            if (callbacks.onAppointmentCreated && payload.new) {
              callbacks.onAppointmentCreated(payload.new as Appointment);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'appointments',
            ...(filter && { filter }),
          },
          (payload) => {
            logger.info('Real-time: Appointment updated', {
              appointmentId: payload.new?.id,
              userId,
              role,
            });

            if (callbacks.onAppointmentUpdated && payload.new) {
              callbacks.onAppointmentUpdated(payload.new as Appointment);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'appointments',
            ...(filter && { filter }),
          },
          (payload) => {
            logger.info('Real-time: Appointment deleted', {
              appointmentId: payload.old?.id,
              userId,
              role,
            });

            if (callbacks.onAppointmentDeleted && payload.old) {
              callbacks.onAppointmentDeleted(payload.old.id);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info('Successfully subscribed to appointments', {
              channelName,
              userId,
              role,
            });
          } else if (status === 'CHANNEL_ERROR') {
            const error = new Error('Failed to subscribe to appointments channel');
            logger.error('Real-time subscription error', {
              channelName,
              userId,
              role,
              status,
            });
            if (callbacks.onError) {
              callbacks.onError(error);
            }
          }
        });

      const subscription: SyncSubscription = {
        id: `${channelName}-${Date.now()}`,
        channelName,
        active: true,
        unsubscribe: () => this.unsubscribe({ id: `${channelName}-${Date.now()}`, unsubscribe: () => {} }),
      };

      this.subscriptions.set(subscription.id, subscription);

      return subscription;
    } catch (error) {
      logger.error('Failed to subscribe to appointments', {
        userId,
        role,
        error,
      });
      throw error;
    }
  }

  /**
   * Subscribe to availability changes for a specific dentist
   * Used by chatbot and patient dashboard
   */
  subscribeToAvailability(
    dentistId: string,
    callbacks: RealtimeSyncCallbacks
  ): SyncSubscription {
    try {
      const channelName = `availability:dentist:${dentistId}`;

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'dentists',
            filter: `id=eq.${dentistId}`,
          },
          (payload) => {
            // Only trigger if available_times changed
            const oldTimes = JSON.stringify(payload.old?.available_times);
            const newTimes = JSON.stringify(payload.new?.available_times);

            if (oldTimes !== newTimes) {
              logger.info('Real-time: Availability changed', {
                dentistId,
                oldTimes: payload.old?.available_times,
                newTimes: payload.new?.available_times,
              });

              if (callbacks.onAvailabilityChanged && payload.new) {
                callbacks.onAvailabilityChanged(
                  dentistId,
                  payload.new.available_times
                );
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info('Successfully subscribed to availability', {
              channelName,
              dentistId,
            });
          } else if (status === 'CHANNEL_ERROR') {
            const error = new Error('Failed to subscribe to availability channel');
            logger.error('Real-time subscription error', {
              channelName,
              dentistId,
              status,
            });
            if (callbacks.onError) {
              callbacks.onError(error);
            }
          }
        });

      const subscription: SyncSubscription = {
        id: `${channelName}-${Date.now()}`,
        channelName,
        active: true,
        unsubscribe: () => this.unsubscribe({ id: `${channelName}-${Date.now()}`, unsubscribe: () => {} }),
      };

      this.subscriptions.set(subscription.id, subscription);

      return subscription;
    } catch (error) {
      logger.error('Failed to subscribe to availability', {
        dentistId,
        error,
      });
      throw error;
    }
  }

  /**
   * Subscribe to all availability changes (for chatbot)
   * Allows chatbot to see all dentist availability updates
   */
  subscribeToGlobalAvailability(
    callbacks: RealtimeSyncCallbacks
  ): SyncSubscription {
    try {
      const channelName = 'availability:global';

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'dentists',
          },
          (payload) => {
            // Only trigger if available_times changed
            const oldTimes = JSON.stringify(payload.old?.available_times);
            const newTimes = JSON.stringify(payload.new?.available_times);

            if (oldTimes !== newTimes && payload.new) {
              logger.info('Real-time: Global availability changed', {
                dentistId: payload.new.id,
                newTimes: payload.new.available_times,
              });

              if (callbacks.onAvailabilityChanged) {
                callbacks.onAvailabilityChanged(
                  payload.new.id,
                  payload.new.available_times
                );
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info('Successfully subscribed to global availability', {
              channelName,
            });
          } else if (status === 'CHANNEL_ERROR') {
            const error = new Error('Failed to subscribe to global availability');
            logger.error('Real-time subscription error', {
              channelName,
              status,
            });
            if (callbacks.onError) {
              callbacks.onError(error);
            }
          }
        });

      const subscription: SyncSubscription = {
        id: `${channelName}-${Date.now()}`,
        channelName,
        active: true,
        unsubscribe: () => this.unsubscribe({ id: `${channelName}-${Date.now()}`, unsubscribe: () => {} }),
      };

      this.subscriptions.set(subscription.id, subscription);

      return subscription;
    } catch (error) {
      logger.error('Failed to subscribe to global availability', { error });
      throw error;
    }
  }

  /**
   * Subscribe to all appointment changes (for admin dashboard)
   */
  subscribeToAllAppointments(
    callbacks: RealtimeSyncCallbacks
  ): SyncSubscription {
    try {
      const channelName = 'appointments:all:admin';

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments',
          },
          (payload) => {
            const eventType = payload.eventType as RealtimeEventType;

            logger.info('Real-time: Admin appointment change', {
              eventType,
              appointmentId: payload.new?.id || payload.old?.id,
            });

            if (eventType === 'INSERT' && callbacks.onAppointmentCreated && payload.new) {
              callbacks.onAppointmentCreated(payload.new as Appointment);
            } else if (eventType === 'UPDATE' && callbacks.onAppointmentUpdated && payload.new) {
              callbacks.onAppointmentUpdated(payload.new as Appointment);
            } else if (eventType === 'DELETE' && callbacks.onAppointmentDeleted && payload.old) {
              callbacks.onAppointmentDeleted(payload.old.id);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info('Successfully subscribed to all appointments', {
              channelName,
            });
          } else if (status === 'CHANNEL_ERROR') {
            const error = new Error('Failed to subscribe to all appointments');
            logger.error('Real-time subscription error', {
              channelName,
              status,
            });
            if (callbacks.onError) {
              callbacks.onError(error);
            }
          }
        });

      const subscription: SyncSubscription = {
        id: `${channelName}-${Date.now()}`,
        channelName,
        active: true,
        unsubscribe: () => this.unsubscribe({ id: `${channelName}-${Date.now()}`, unsubscribe: () => {} }),
      };

      this.subscriptions.set(subscription.id, subscription);

      return subscription;
    } catch (error) {
      logger.error('Failed to subscribe to all appointments', { error });
      throw error;
    }
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscription: Subscription): void {
    try {
      const syncSub = this.subscriptions.get(subscription.id);

      if (syncSub) {
        // Find the channel and remove it
        const channel = (supabase as any).channels.find(
          (ch: any) => ch.topic === syncSub.channelName
        );

        if (channel) {
          supabase.removeChannel(channel);
        }

        syncSub.active = false;
        this.subscriptions.delete(subscription.id);

        logger.info('Unsubscribed from channel', {
          subscriptionId: subscription.id,
          channelName: syncSub.channelName,
        });
      }
    } catch (error) {
      logger.error('Failed to unsubscribe', {
        subscriptionId: subscription.id,
        error,
      });
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    try {
      this.subscriptions.forEach((subscription) => {
        const channel = (supabase as any).channels.find(
          (ch: any) => ch.topic === subscription.channelName
        );

        if (channel) {
          supabase.removeChannel(channel);
        }
      });

      this.subscriptions.clear();

      logger.info('Unsubscribed from all channels');
    } catch (error) {
      logger.error('Failed to unsubscribe from all channels', { error });
    }
  }

  /**
   * Get active subscriptions count
   */
  getActiveSubscriptionsCount(): number {
    return Array.from(this.subscriptions.values()).filter((sub) => sub.active).length;
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): SyncSubscription[] {
    return Array.from(this.subscriptions.values()).filter((sub) => sub.active);
  }

  /**
   * Start heartbeat to maintain connection
   */
  startHeartbeat(intervalMs: number = 30000): void {
    if (this.heartbeatInterval) {
      this.stopHeartbeat();
    }

    this.heartbeatInterval = setInterval(() => {
      const activeCount = this.getActiveSubscriptionsCount();
      logger.debug('Real-time heartbeat', {
        activeSubscriptions: activeCount,
        timestamp: new Date().toISOString(),
      });
    }, intervalMs);

    logger.info('Started real-time heartbeat', { intervalMs });
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info('Stopped real-time heartbeat');
    }
  }
}

// Export singleton instance
export const realtimeSyncService = new RealtimeSyncService();
