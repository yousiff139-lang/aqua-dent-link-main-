import { useState, useEffect, useCallback } from 'react';
import { Appointment } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UseAppointmentNotificationsResult {
  unreadAppointments: Set<string>;
  markAsRead: (appointmentId: string) => void;
  markAllAsRead: () => void;
  unreadCount: number;
}

export const useAppointmentNotifications = (
  dentistEmail: string | undefined,
  onNewAppointment?: (appointment: Appointment) => void,
  onAppointmentUpdate?: (appointment: Appointment) => void
): UseAppointmentNotificationsResult => {
  const [unreadAppointments, setUnreadAppointments] = useState<Set<string>>(new Set());

  const markAsRead = useCallback((appointmentId: string) => {
    setUnreadAppointments((prev) => {
      const newSet = new Set(prev);
      newSet.delete(appointmentId);
      return newSet;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setUnreadAppointments(new Set());
  }, []);

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!dentistEmail) return;

    const channel = supabase
      .channel('appointment-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `dentist_email=eq.${dentistEmail}`,
        },
        (payload) => {
          const newAppointment = payload.new as Appointment;
          
          // Add to unread set
          setUnreadAppointments((prev) => new Set(prev).add(newAppointment.id));

          // Format appointment time
          const appointmentTime = format(
            new Date(`${newAppointment.appointment_date}T${newAppointment.appointment_time}`),
            'MMM dd, yyyy h:mm a'
          );

          // Show toast notification
          toast.success('New Appointment Booked!', {
            description: `${newAppointment.patient_name} - ${appointmentTime}`,
            duration: 5000,
          });

          // Call callback if provided
          if (onNewAppointment) {
            onNewAppointment(newAppointment);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `dentist_email=eq.${dentistEmail}`,
        },
        (payload) => {
          const updatedAppointment = payload.new as Appointment;
          const oldAppointment = payload.old as Appointment;

          // Check if status changed
          if (oldAppointment.status !== updatedAppointment.status) {
            let message = '';
            
            switch (updatedAppointment.status) {
              case 'cancelled':
                message = `Appointment with ${updatedAppointment.patient_name} was cancelled`;
                toast.info('Appointment Cancelled', {
                  description: message,
                  duration: 5000,
                });
                break;
              case 'confirmed':
                message = `Appointment with ${updatedAppointment.patient_name} was confirmed`;
                break;
              case 'completed':
                message = `Appointment with ${updatedAppointment.patient_name} was marked as completed`;
                break;
            }
          }

          // Call callback if provided
          if (onAppointmentUpdate) {
            onAppointmentUpdate(updatedAppointment);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dentistEmail, onNewAppointment, onAppointmentUpdate]);

  return {
    unreadAppointments,
    markAsRead,
    markAllAsRead,
    unreadCount: unreadAppointments.size,
  };
};
