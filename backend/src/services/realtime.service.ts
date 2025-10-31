import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import {
  Appointment,
  AvailabilitySchedule,
  RealtimeEvent,
  RealtimeEventType,
  Subscription,
} from '../types/index.js';

export class RealtimeService {
  private subscriptions: Map<string, any> = new Map();

  /**
   * Broadcast appointment change to all connected clients
   * Note: Actual broadcasting is handled by database triggers via pg_notify
   * This method is for application-level broadcasting if needed
   */
  async broadcastAppointmentChange(
    event: RealtimeEventType,
    appointment: Appointment
  ): Promise<void> {
    try {
      const startTime = Date.now();

      // The database trigger already handles pg_notify
      // This is for additional application-level logic if needed
      
      const latency = Date.now() - startTime;

      logger.info('Appointment change broadcasted', {
        event,
        appointmentId: appointment.id,
        dentistId: appointment.dentist_id,
        patientId: appointment.patient_id,
        latency: `${latency}ms`,
      });
    } catch (error) {
      logger.error('Failed to broadcast appointment change', {
        event,
        appointment,
        error,
      });
      // Don't throw - broadcasting failures shouldn't break the main flow
    }
  }

  /**
   * Broadcast availability change to all connected clients
   * Note: Actual broadcasting is handled by database triggers via pg_notify
   */
  async broadcastAvailabilityChange(
    dentistId: string,
    availability: AvailabilitySchedule
  ): Promise<void> {
    try {
      const startTime = Date.now();

      // The database trigger already handles pg_notify
      // This is for additional application-level logic if needed

      const latency = Date.now() - startTime;

      logger.info('Availability change broadcasted', {
        dentistId,
        availability,
        latency: `${latency}ms`,
      });
    } catch (error) {
      logger.error('Failed to broadcast availability change', {
        dentistId,
        availability,
        error,
      });
      // Don't throw - broadcasting failures shouldn't break the main flow
    }
  }

  /**
   * Subscribe to appointment changes for a specific user
   * This is meant to be used by client applications
   */
  subscribeToAppointments(
    userId: string,
    role: 'patient' | 'dentist' | 'admin',
    callback: (event: RealtimeEvent) => void
  ): Subscription {
    try {
      const channelName = `appointments:${role}:${userId}`;

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments',
            filter:
              role === 'patient'
                ? `patient_id=eq.${userId}`
                : `dentist_id=eq.${userId}`,
          },
          (payload) => {
            const realtimeEvent: RealtimeEvent = {
              event: payload.eventType as RealtimeEventType,
              table: 'appointments',
              record_id: (payload.new as any)?.id || (payload.old as any)?.id,
              payload: payload.new || payload.old,
              timestamp: new Date(),
            };

            callback(realtimeEvent);

            logger.debug('Appointment change received', {
              userId,
              role,
              event: payload.eventType,
            });
          }
        )
        .subscribe();

      const subscriptionId = `${channelName}-${Date.now()}`;
      this.subscriptions.set(subscriptionId, channel);

      logger.info('Subscribed to appointments', {
        userId,
        role,
        subscriptionId,
      });

      return {
        id: subscriptionId,
        unsubscribe: () => this.unsubscribe({ id: subscriptionId, unsubscribe: () => {} }),
      };
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
   */
  subscribeToAvailability(
    dentistId: string,
    callback: (event: RealtimeEvent) => void
  ): Subscription {
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
            if (
              JSON.stringify(payload.old?.available_times) !==
              JSON.stringify(payload.new?.available_times)
            ) {
              const realtimeEvent: RealtimeEvent = {
                event: 'UPDATE',
                table: 'dentists',
                record_id: payload.new.id,
                payload: {
                  dentist_id: payload.new.id,
                  available_times: payload.new.available_times,
                },
                timestamp: new Date(),
              };

              callback(realtimeEvent);

              logger.debug('Availability change received', {
                dentistId,
              });
            }
          }
        )
        .subscribe();

      const subscriptionId = `${channelName}-${Date.now()}`;
      this.subscriptions.set(subscriptionId, channel);

      logger.info('Subscribed to availability', {
        dentistId,
        subscriptionId,
      });

      return {
        id: subscriptionId,
        unsubscribe: () => this.unsubscribe({ id: subscriptionId, unsubscribe: () => {} }),
      };
    } catch (error) {
      logger.error('Failed to subscribe to availability', {
        dentistId,
        error,
      });
      throw error;
    }
  }

  /**
   * Subscribe to global availability changes (for chatbot)
   */
  subscribeToGlobalAvailability(
    callback: (event: RealtimeEvent) => void
  ): Subscription {
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
            if (
              JSON.stringify(payload.old?.available_times) !==
              JSON.stringify(payload.new?.available_times)
            ) {
              const realtimeEvent: RealtimeEvent = {
                event: 'UPDATE',
                table: 'dentists',
                record_id: payload.new.id,
                payload: {
                  dentist_id: payload.new.id,
                  available_times: payload.new.available_times,
                },
                timestamp: new Date(),
              };

              callback(realtimeEvent);

              logger.debug('Global availability change received', {
                dentistId: payload.new.id,
              });
            }
          }
        )
        .subscribe();

      const subscriptionId = `${channelName}-${Date.now()}`;
      this.subscriptions.set(subscriptionId, channel);

      logger.info('Subscribed to global availability', {
        subscriptionId,
      });

      return {
        id: subscriptionId,
        unsubscribe: () => this.unsubscribe({ id: subscriptionId, unsubscribe: () => {} }),
      };
    } catch (error) {
      logger.error('Failed to subscribe to global availability', { error });
      throw error;
    }
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(subscription: Subscription): void {
    try {
      const channel = this.subscriptions.get(subscription.id);

      if (channel) {
        supabase.removeChannel(channel);
        this.subscriptions.delete(subscription.id);

        logger.info('Unsubscribed from channel', {
          subscriptionId: subscription.id,
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
      this.subscriptions.forEach((channel, id) => {
        supabase.removeChannel(channel);
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
    return this.subscriptions.size;
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();
