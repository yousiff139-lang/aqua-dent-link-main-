import { useState, useEffect, useCallback } from 'react';
import { Appointment, AppointmentFilters, AppointmentStatus } from '@/types';
import { supabase } from '@/lib/supabase';
import { dentistService } from '@/services/dentist.service';
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

  const serializedFilters = JSON.stringify(filters ?? {});

  const fetchAppointments = useCallback(async () => {
    if (!dentistEmail) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await dentistService.getPatients(dentistEmail, filters);
      setAppointments(data);
    } catch (err: any) {
      let errorMessage = 'Failed to load appointments. Please try again.';
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [dentistEmail, serializedFilters]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Set up real-time subscription
  useEffect(() => {
    if (!dentistEmail) return;

    // Subscribe to appointments table changes for this dentist
    // Listen for changes by dentist_email (most reliable)
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
            // Refetch to get complete data
            fetchAppointments();
            toast.success('New appointment received!');
          } else if (payload.eventType === 'UPDATE') {
            // Refetch to ensure consistency
            fetchAppointments();
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
  }, [dentistEmail, fetchAppointments]);

  return {
    appointments,
    isLoading,
    error,
    refetch: fetchAppointments,
  };
};
