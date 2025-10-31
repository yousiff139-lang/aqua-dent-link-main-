/**
 * Comprehensive Real-Time Sync Hook
 * Provides real-time synchronization for admin, patient, and chatbot modules
 * Handles appointments, availability, and bidirectional communication
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

export interface Appointment {
  id: string;
  patient_id?: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  dentist_id: string;
  dentist_email: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason?: string;
  [key: string]: any;
}

export interface RealtimeCallbacks {
  onAppointmentCreated?: (appointment: Appointment) => void;
  onAppointmentUpdated?: (appointment: Appointment) => void;
  onAppointmentDeleted?: (appointmentId: string) => void;
  onAvailabilityChanged?: (dentistId: string, availability: any) => void;
  onError?: (error: Error) => void;
}

export interface UseRealtimeSyncOptions {
  userId?: string;
  role?: 'patient' | 'dentist' | 'admin';
  subscribeToAppointments?: boolean;
  subscribeToAvailability?: boolean;
  dentistId?: string;
  globalAvailability?: boolean; // For chatbot to see all dentist availability
}

/**
 * Main hook for real-time synchronization
 * Supports patient, dentist, admin, and chatbot use cases
 */
export function useRealtimeSync(
  options: UseRealtimeSyncOptions,
  callbacks: RealtimeCallbacks = {}
) {
  const {
    userId,
    role = 'patient',
    subscribeToAppointments = true,
    subscribeToAvailability = false,
    dentistId,
    globalAvailability = false,
  } = options;

  const channelsRef = useRef<RealtimeChannel[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    channelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];
    setIsConnected(false);
    logger.info('Cleaned up real-time subscriptions');
  }, []);

  useEffect(() => {
    // Don't subscribe if no userId (for appointments) and not global availability
    if (!userId && !globalAvailability && subscribeToAppointments) {
      return;
    }

    // Don't subscribe to availability if no dentistId and not global
    if (subscribeToAvailability && !dentistId && !globalAvailability) {
      return;
    }

    const channels: RealtimeChannel[] = [];

    // Subscribe to appointments
    if (subscribeToAppointments) {
      let filter = '';
      let channelName = '';

      if (role === 'admin' || globalAvailability) {
        // Admin sees all appointments
        channelName = `appointments:all:admin`;
        filter = ''; // No filter for admin
      } else if (role === 'patient' && userId) {
        channelName = `appointments:patient:${userId}`;
        filter = `patient_id=eq.${userId}`;
      } else if (role === 'dentist' && userId) {
        channelName = `appointments:dentist:${userId}`;
        filter = `dentist_id=eq.${userId}`;
      }

      if (channelName) {
        const appointmentsChannel = supabase
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
              logger.success('Real-time: New appointment created', {
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
              logger.warn('Real-time: Appointment deleted', {
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
              setIsConnected(true);
              logger.success('Successfully subscribed to appointments', {
                channelName,
                userId,
                role,
              });
            } else if (status === 'CHANNEL_ERROR') {
              const err = new Error('Failed to subscribe to appointments channel');
              setError(err);
              logger.error('Real-time subscription error', {
                channelName,
                userId,
                role,
                status,
              });
              if (callbacks.onError) {
                callbacks.onError(err);
              }
            }
          });

        channels.push(appointmentsChannel);
      }
    }

    // Subscribe to availability
    if (subscribeToAvailability) {
      let availabilityChannelName = '';
      let availabilityFilter = '';

      if (globalAvailability) {
        // Chatbot subscribes to all dentists
        availabilityChannelName = 'availability:global';
      } else if (dentistId) {
        availabilityChannelName = `availability:dentist:${dentistId}`;
        availabilityFilter = `id=eq.${dentistId}`;
      }

      if (availabilityChannelName) {
        const availabilityChannel = supabase
          .channel(availabilityChannelName)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'dentists',
              ...(availabilityFilter && { filter: availabilityFilter }),
            },
            (payload) => {
              // Only trigger if available_times actually changed
              const oldTimes = JSON.stringify(payload.old?.available_times);
              const newTimes = JSON.stringify(payload.new?.available_times);

              if (oldTimes !== newTimes && payload.new) {
                logger.info('Real-time: Availability changed', {
                  dentistId: payload.new.id || dentistId,
                  newTimes: payload.new.available_times,
                });

                if (callbacks.onAvailabilityChanged) {
                  callbacks.onAvailabilityChanged(
                    payload.new.id || dentistId!,
                    payload.new.available_times
                  );
                }
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              logger.success('Successfully subscribed to availability', {
                channelName: availabilityChannelName,
                dentistId,
              });
            } else if (status === 'CHANNEL_ERROR') {
              const err = new Error('Failed to subscribe to availability channel');
              setError(err);
              logger.error('Real-time subscription error', {
                channelName: availabilityChannelName,
                dentistId,
                status,
              });
              if (callbacks.onError) {
                callbacks.onError(err);
              }
            }
          });

        channels.push(availabilityChannel);
      }
    }

    channelsRef.current = channels;

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [
    userId,
    role,
    subscribeToAppointments,
    subscribeToAvailability,
    dentistId,
    globalAvailability,
    callbacks.onAppointmentCreated,
    callbacks.onAppointmentUpdated,
    callbacks.onAppointmentDeleted,
    callbacks.onAvailabilityChanged,
    callbacks.onError,
    cleanup,
  ]);

  return {
    isConnected,
    error,
    disconnect: cleanup,
  };
}

/**
 * Simplified hook for appointment subscriptions (backward compatibility)
 */
export function useRealtimeAppointments(
  userId: string | undefined,
  role: 'patient' | 'dentist' | 'admin' = 'patient',
  callbacks: RealtimeCallbacks = {}
) {
  return useRealtimeSync(
    {
      userId,
      role,
      subscribeToAppointments: true,
      subscribeToAvailability: false,
      globalAvailability: role === 'admin',
    },
    callbacks
  );
}

/**
 * Hook for availability subscriptions (used by chatbot and patient dashboard)
 */
export function useRealtimeAvailability(
  dentistId: string | undefined,
  callbacks: RealtimeCallbacks = {}
) {
  return useRealtimeSync(
    {
      subscribeToAppointments: false,
      subscribeToAvailability: true,
      dentistId,
    },
    callbacks
  );
}

/**
 * Hook for chatbot global subscriptions (all dentists, all appointments)
 */
export function useChatbotRealtimeSync(callbacks: RealtimeCallbacks = {}) {
  return useRealtimeSync(
    {
      subscribeToAppointments: true,
      subscribeToAvailability: true,
      globalAvailability: true,
    },
    callbacks
  );
}
