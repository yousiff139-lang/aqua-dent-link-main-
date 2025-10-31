import { useState, useEffect } from 'react';
import { DentistAvailability } from '@/types';
import { availabilityService } from '@/services/availability.service';
import { toast } from 'sonner';

export const useAvailability = (dentistId: string | undefined) => {
  const [availability, setAvailability] = useState<DentistAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = async () => {
    if (!dentistId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await availabilityService.getByDentistId(dentistId);
      setAvailability(data);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load availability';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [dentistId]);

  const saveAvailability = async (
    newAvailability: Omit<DentistAvailability, 'id' | 'created_at' | 'updated_at'>[]
  ) => {
    if (!dentistId) return;

    try {
      const data = await availabilityService.saveAvailability(dentistId, newAvailability);
      setAvailability(data);
      toast.success('Availability updated successfully');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update availability';
      toast.error(errorMessage);
      throw err;
    }
  };

  return { availability, isLoading, error, saveAvailability, refetch: fetchAvailability };
};
