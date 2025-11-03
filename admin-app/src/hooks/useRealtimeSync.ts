/**
 * React Hook for Real-time Synchronization - Admin App
 * Provides easy-to-use hooks for subscribing to real-time updates
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export type UserRole = 'patient' | 'dentist' | 'admin';

export type AppointmentCallback = (appointment: any, event: 'INSERT' | 'UPDATE' | 'DELETE') => void;

/**
 * Hook to subscribe to appointment changes (for admin - sees all appointments)
 */
export function useRealtimeAppointments(
  userId: string | undefined,
  role: UserRole,
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
    // Admin can subscribe even without userId (sees all appointments)
    if (role !== 'admin' && !userId) {
      setIsSubscribed(false);
      return;
    }

    let channel: RealtimeChannel;

    try {
      // Admin sees all appointments (no filter)
      const channelKey = `appointments:${role}:${userId}`;

      channel = supabase
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'appointments',
          },
          (payload) => {
            console.log('Real-time: New appointment created', payload.new?.id);
            callbacksRef.current.onCreated?.(payload.new, 'INSERT');
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
            console.log('Real-time: Appointment updated', payload.new?.id);
            callbacksRef.current.onUpdated?.(payload.new, 'UPDATE');
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
            console.log('Real-time: Appointment deleted', payload.old?.id);
            if (callbacksRef.current.onDeleted && payload.old?.id) {
              callbacksRef.current.onDeleted(payload.old.id);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to appointment updates', { userId, role });
            setIsSubscribed(true);
            setError(null);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to appointment updates', { userId, role, status });
            setError(new Error('Failed to subscribe to appointment updates'));
            setIsSubscribed(false);
          }
        });

      return () => {
        if (channel) {
          console.log('Unsubscribing from appointment updates', { userId, role });
          supabase.removeChannel(channel);
          setIsSubscribed(false);
        }
      };
    } catch (err) {
      console.error('Error setting up appointment subscription', err, { userId, role });
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIsSubscribed(false);
    }
  }, [userId, role]);

  return { isSubscribed, error };
}

/**
 * Hook to subscribe to any table changes with generic callbacks
 */
export function useRealtimeSync(options: {
  table: string;
  onInsert?: (record: any) => void;
  onUpdate?: (record: any) => void;
  onDelete?: (recordId: string) => void;
}) {
  const { table, onInsert, onUpdate, onDelete } = options;
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete });

  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete };
  }, [onInsert, onUpdate, onDelete]);

  useEffect(() => {
    let channel: RealtimeChannel;

    try {
      const channelKey = `realtime:${table}:${Date.now()}`;

      channel = supabase
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table,
          },
          (payload) => {
            console.log(`Real-time: New ${table} created`, payload.new?.id);
            callbacksRef.current.onInsert?.(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table,
          },
          (payload) => {
            console.log(`Real-time: ${table} updated`, payload.new?.id);
            callbacksRef.current.onUpdate?.(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table,
          },
          (payload) => {
            console.log(`Real-time: ${table} deleted`, payload.old?.id);
            if (callbacksRef.current.onDelete && payload.old?.id) {
              callbacksRef.current.onDelete(payload.old.id);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Successfully subscribed to ${table} updates`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`Error subscribing to ${table} updates`, status);
          }
        });

      return () => {
        if (channel) {
          console.log(`Unsubscribing from ${table} updates`);
          supabase.removeChannel(channel);
        }
      };
    } catch (err) {
      console.error(`Error setting up ${table} subscription`, err);
    }
  }, [table]);
}

