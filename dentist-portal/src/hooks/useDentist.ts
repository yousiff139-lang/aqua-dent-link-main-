import { useState, useEffect } from 'react';
import { Dentist } from '@/types';
import { dentistService } from '@/services/dentist.service';
import { toast } from 'sonner';

export const useDentist = (email: string | undefined) => {
  const [dentist, setDentist] = useState<Dentist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDentist = async () => {
    if (!email) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await dentistService.getByEmail(email);
      setDentist(data);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load dentist profile';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDentist();
  }, [email]);

  return { dentist, isLoading, error, refetch: fetchDentist };
};
