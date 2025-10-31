import { useState, useEffect } from 'react';
import { Appointment, AppointmentFilters } from '@/types';
import { dentistService } from '@/services/dentist.service';
import { appointmentService } from '@/services/appointment.service';
import { toast } from 'sonner';

export const usePatients = (email: string | undefined) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = async (filters?: AppointmentFilters) => {
    if (!email) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await dentistService.getPatients(email, filters);
      setAppointments(data);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load patients';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [email]);

  const markAsCompleted = async (appointmentId: string) => {
    try {
      const updated = await appointmentService.updateStatus(appointmentId, 'completed');
      setAppointments((prev) =>
        prev.map((apt) => (apt.id === appointmentId ? { ...apt, status: 'completed' } : apt))
      );
      toast.success('Appointment marked as completed');
      return updated;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update appointment';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateNotes = async (appointmentId: string, notes: string) => {
    try {
      // Update locally first (optimistic update)
      setAppointments((prev) =>
        prev.map((apt) => (apt.id === appointmentId ? { ...apt, notes } : apt))
      );
      
      // Then update on server
      await appointmentService.updateStatus(appointmentId, undefined, notes);
      toast.success('Notes saved successfully');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save notes';
      toast.error(errorMessage);
      // Revert on error
      fetchPatients();
      throw err;
    }
  };

  return {
    appointments,
    isLoading,
    error,
    markAsCompleted,
    updateNotes,
    refetch: fetchPatients,
  };
};
