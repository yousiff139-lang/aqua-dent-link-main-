import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

/**
 * Custom hook to subscribe to real-time appointment updates
 * Listens for INSERT, UPDATE, and DELETE events on the appointments table
 * 
 * @param userId - The user ID to filter appointments for
 * @param onAppointmentCreated - Callback when a new appointment is created
 * @param onAppointmentUpdated - Callback when an appointment is updated
 * @param onAppointmentDeleted - Callback when an appointment is deleted
 */
export function useAppointmentSubscription(
  userId: string | undefined,
  onAppointmentCreated?: (appointment: any) => void,
  onAppointmentUpdated?: (appointment: any) => void,
  onAppointmentDeleted?: (appointmentId: string) => void
) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsSubscribed(false);
      return;
    }

    let channel: RealtimeChannel;

    const setupSubscription = async () => {
      try {
        logger.info('Setting up appointment subscription', { userId });
        
        // Create a channel for appointments table
        channel = supabase
          .channel(`appointments:patient_id=eq.${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'appointments',
              filter: `patient_id=eq.${userId}`,
            },
            (payload) => {
              logger.success('Real-time: New appointment created', {
                appointmentId: payload.new?.id,
                userId,
              });
              if (onAppointmentCreated) {
                onAppointmentCreated(payload.new);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'appointments',
              filter: `patient_id=eq.${userId}`,
            },
            (payload) => {
              logger.info('Real-time: Appointment updated', {
                appointmentId: payload.new?.id,
                userId,
              });
              if (onAppointmentUpdated) {
                onAppointmentUpdated(payload.new);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'appointments',
              filter: `patient_id=eq.${userId}`,
            },
            (payload) => {
              logger.info('Real-time: Appointment deleted', {
                appointmentId: payload.old?.id,
                userId,
              });
              if (onAppointmentDeleted && payload.old?.id) {
                onAppointmentDeleted(payload.old.id);
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              logger.success('Successfully subscribed to appointment updates', { userId });
              setIsSubscribed(true);
              setError(null);
            } else if (status === 'CHANNEL_ERROR') {
              logger.error('Error subscribing to appointment updates', null, { userId, status });
              setError(new Error('Failed to subscribe to appointment updates'));
              setIsSubscribed(false);
            } else if (status === 'TIMED_OUT') {
              logger.error('Subscription timed out', null, { userId, status });
              setError(new Error('Subscription timed out'));
              setIsSubscribed(false);
            }
          });
      } catch (err) {
        logger.error('Error setting up appointment subscription', err, { userId });
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsSubscribed(false);
      }
    };

    setupSubscription();

    // Cleanup function
    return () => {
      if (channel) {
        logger.debug('Unsubscribing from appointment updates', { userId });
        supabase.removeChannel(channel);
        setIsSubscribed(false);
      }
    };
  }, [userId, onAppointmentCreated, onAppointmentUpdated, onAppointmentDeleted]);

  return { isSubscribed, error };
}
