import { useState, useEffect, useCallback } from 'react';
import { Appointment, AppointmentFilters, AppointmentStatus } from '@/types';
import api from '@/services/api';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface UseAppointmentsResult {
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useAppointments = (
  dentistEmail: string | undefined,
  filters?: AppointmentFilters
): UseAppointmentsResult => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!dentistEmail) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params: Record<string, any> = {};
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          params.status = filters.status.join(',');
        } else {
          params.status = filters.status;
        }
      }
      if (filters?.date_from) params.date_from = filters.date_from;
      if (filters?.date_to) params.date_to = filters.date_to;
      if (filters?.limit) params.limit = filters.limit;
      if (filters?.offset) params.offset = filters.offset;

      const response = await api.get(`/appointments/dentist/${dentistEmail}`, {
        params,
      });

      const data = response.data?.data || response.data || [];
      setAppointments(data);
    } catch (err: any) {
      let errorMessage = 'Failed to load appointments. Please try again.';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (err.status === 403) {
        errorMessage = 'You do not have permission to view these appointments.';
      } else if (err.status === 404) {
        errorMessage = 'No appointments found.';
      } else if (err.status && err.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      setError(errorMessage);
      console.error('Error fetching appointments:', err);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [dentistEmail, filters?.status, filters?.date_from, filters?.date_to, filters?.limit, filters?.offset]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Set up real-time subscription
  useEffect(() => {
    if (!dentistEmail) return;

    // Subscribe to appointments table changes for this dentist
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `dentist_email=eq.${dentistEmail}`,
        },
        (payload) => {
          console.log('Real-time appointment update:', payload);

          if (payload.eventType === 'INSERT') {
            // Add new appointment
            const newAppointment = payload.new as Appointment;
            setAppointments((prev) => [newAppointment, ...prev]);
            toast.success('New appointment received!');
          } else if (payload.eventType === 'UPDATE') {
            // Update existing appointment
            const updatedAppointment = payload.new as Appointment;
            setAppointments((prev) =>
              prev.map((apt) =>
                apt.id === updatedAppointment.id ? updatedAppointment : apt
              )
            );
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted appointment
            const deletedId = payload.old.id;
            setAppointments((prev) => prev.filter((apt) => apt.id !== deletedId));
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [dentistEmail]);

  return {
    appointments,
    isLoading,
    error,
    refetch: fetchAppointments,
  };
};
