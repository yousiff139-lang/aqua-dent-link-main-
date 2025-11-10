/**
 * Chatbot Real-Time Sync Service
 * Integrates chatbot with real-time synchronization system
 * Ensures chatbot sees all appointment and availability changes instantly
 */

import { supabase } from '@/integrations/supabase/client';
import { useChatbotRealtimeSync } from '@/hooks/useRealtimeSync';
import { logger } from '@/utils/logger';

export interface ChatbotSyncCallbacks {
  onAppointmentCreated?: (appointment: any) => void;
  onAvailabilityUpdated?: (dentistId: string, availability: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Chatbot Real-Time Sync Manager
 * Manages real-time subscriptions for the chatbot
 */
export class ChatbotRealtimeSync {
  private isInitialized = false;
  private unsubscribe: (() => void) | null = null;

  /**
   * Initialize real-time sync for chatbot
   * Subscribes to all appointments and all dentist availability
   */
  initialize(callbacks: ChatbotSyncCallbacks = {}): void {
    if (this.isInitialized) {
      logger.warn('Chatbot real-time sync already initialized');
      return;
    }

    try {
      // Subscribe to all appointments (to see when patients book)
      const appointmentsChannel = supabase
        .channel('chatbot:appointments:all')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments',
          },
          (payload) => {
            const eventType = payload.eventType;

            logger.info('Chatbot: Appointment change detected', {
              eventType,
              appointmentId: (payload.new as any)?.id || (payload.old as any)?.id,
            });

            if (eventType === 'INSERT' && callbacks.onAppointmentCreated && payload.new) {
              callbacks.onAppointmentCreated(payload.new);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.success('Chatbot subscribed to all appointments');
          } else if (status === 'CHANNEL_ERROR') {
            const error = new Error('Failed to subscribe chatbot to appointments');
            logger.error('Chatbot subscription error', null, { status });
            if (callbacks.onError) {
              callbacks.onError(error);
            }
          }
        });

      // Subscribe to all dentist availability changes
      const availabilityChannel = supabase
        .channel('chatbot:availability:all')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'dentists',
          },
          (payload) => {
            // Only trigger if available_times changed
            const oldTimes = JSON.stringify((payload.old as any)?.available_times);
            const newTimes = JSON.stringify((payload.new as any)?.available_times);

            if (oldTimes !== newTimes && payload.new) {
              logger.info('Chatbot: Availability change detected', {
                dentistId: (payload.new as any).id,
                newTimes: (payload.new as any).available_times,
              });

              if (callbacks.onAvailabilityUpdated) {
                callbacks.onAvailabilityUpdated(
                  (payload.new as any).id,
                  (payload.new as any).available_times
                );
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.success('Chatbot subscribed to all availability changes');
          } else if (status === 'CHANNEL_ERROR') {
            const error = new Error('Failed to subscribe chatbot to availability');
            logger.error('Chatbot subscription error', null, { status });
            if (callbacks.onError) {
              callbacks.onError(error);
            }
          }
        });

      this.unsubscribe = () => {
        supabase.removeChannel(appointmentsChannel);
        supabase.removeChannel(availabilityChannel);
        this.isInitialized = false;
        logger.info('Chatbot real-time sync disconnected');
      };

      this.isInitialized = true;
      logger.success('Chatbot real-time sync initialized');
    } catch (error) {
      logger.error('Failed to initialize chatbot real-time sync', error);
      if (callbacks.onError) {
        callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
      }
    }
  }

  /**
   * Disconnect from real-time sync
   */
  disconnect(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Check if sync is initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const chatbotRealtimeSync = new ChatbotRealtimeSync();

/**
 * React hook for chatbot real-time sync
 * Use this in chatbot components
 */
export function useChatbotSync(callbacks: ChatbotSyncCallbacks = {}) {
  const { isConnected, error, disconnect } = useChatbotRealtimeSync({
    onAppointmentCreated: callbacks.onAppointmentCreated,
    onAvailabilityChanged: callbacks.onAvailabilityUpdated,
    onError: callbacks.onError,
  });

  return {
    isConnected,
    error,
    disconnect,
  };
}

