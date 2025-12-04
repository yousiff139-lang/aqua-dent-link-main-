/**
 * React Hook for Real-time Synchronization - Dentist Portal
 * Provides easy-to-use hooks for subscribing to real-time updates
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export type AppointmentCallback = (appointment: any, event: 'INSERT' | 'UPDATE' | 'DELETE') => void;
export type AvailabilityCallback = (dentistId: string, availability: any) => void;

/**
 * Hook to subscribe to appointment changes for a dentist
 */
export function useRealtimeAppointments(
  dentistId: string | undefined,
  dentistEmail: string | undefined,
  callbacks: {
    onCreated?: AppointmentCallback;
    onUpdated?: AppointmentCallback;
    onDeleted?: (appointmentId: string) => void;
  }
) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const callbacksRef = useRef(callbacks);

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!dentistId && !dentistEmail) {
      setIsSubscribed(false);
      return;
    }

    let channel: RealtimeChannel;

    try {
      const channelKey = `appointments:dentist:${dentistId || 'email:' + dentistEmail}`;

      // Create filter string - prefer email as it's more reliable across tables
      const filter = dentistEmail
        ? `dentist_email=eq.${dentistEmail}`
        : `dentist_id=eq.${dentistId}`;

      channel = supabase
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'appointments',
            filter,
          },
          (payload) => {
            console.log('Real-time: New appointment created for dentist', payload.new?.id);
            callbacksRef.current.onCreated?.(payload.new, 'INSERT');
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'appointments',
            filter,
          },
          (payload) => {
            console.log('Real-time: Appointment updated for dentist', payload.new?.id);
            callbacksRef.current.onUpdated?.(payload.new, 'UPDATE');
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'appointments',
            filter,
          },
          (payload) => {
            console.log('Real-time: Appointment deleted for dentist', payload.old?.id);
            if (callbacksRef.current.onDeleted && payload.old?.id) {
              callbacksRef.current.onDeleted(payload.old.id);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to appointment updates', { dentistId, dentistEmail });
            setIsSubscribed(true);
            setError(null);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to appointment updates', { dentistId, status });
            setError(new Error('Failed to subscribe to appointment updates'));
            setIsSubscribed(false);
          }
        });

      return () => {
        if (channel) {
          console.log('Unsubscribing from appointment updates', { dentistId });
          supabase.removeChannel(channel);
          setIsSubscribed(false);
        }
      };
    } catch (err) {
      console.error('Error setting up appointment subscription', err, { dentistId });
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIsSubscribed(false);
    }
  }, [dentistId, dentistEmail]);

  return { isSubscribed, error };
}

/**
 * Hook to subscribe to availability changes
 */
export function useRealtimeAvailability(
  dentistId: string | undefined,
  callback: AvailabilityCallback
) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!dentistId) {
      setIsSubscribed(false);
      return;
    }

    let channel: RealtimeChannel;

    try {
      const channelKey = `availability:dentist:${dentistId}`;

      channel = supabase
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${dentistId}`,
          },
          (payload) => {
            // Only trigger if available_times changed
            if (
              JSON.stringify(payload.old?.available_times) !==
              JSON.stringify(payload.new?.available_times)
            ) {
              console.log('Real-time: Availability updated', { dentistId });
              callbackRef.current(dentistId, payload.new?.available_times);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to availability updates', { dentistId });
            setIsSubscribed(true);
            setError(null);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to availability updates', { dentistId, status });
            setError(new Error('Failed to subscribe to availability updates'));
            setIsSubscribed(false);
          }
        });

      return () => {
        if (channel) {
          supabase.removeChannel(channel);
          setIsSubscribed(false);
        }
      };
    } catch (err) {
      console.error('Error setting up availability subscription', err, { dentistId });
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIsSubscribed(false);
    }
  }, [dentistId]);

  return { isSubscribed, error };
}

