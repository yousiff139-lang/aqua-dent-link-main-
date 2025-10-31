import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Dentist } from '@/types/dentist';
import { logger, DatabaseOperation, withDatabaseLogging } from '@/utils/logger';
import { trackDatabaseQuery } from '@/utils/performanceMonitor';

/**
 * React Query hook to fetch all dentists
 * 
 * @returns Query result with array of dentists, loading state, and error
 * 
 * Features:
 * - Automatic caching with 5 minute stale time
 * - 2 retry attempts on failure
 * - Dentists sorted by rating (highest first)
 * - Type-safe dentist data
 * - Comprehensive error logging
 * - Performance monitoring
 */
export function useDentists() {
  return useQuery({
    queryKey: ['dentists'],
    queryFn: async () => {
      return trackDatabaseQuery('fetch_all_dentists', () =>
        withDatabaseLogging(
          DatabaseOperation.SELECT,
          'dentists',
          async () => {
            const { data, error } = await supabase
              .from('dentists')
              .select('*')
              .order('rating', { ascending: false });

            if (error) {
              throw error;
            }

            return (data || []) as Dentist[];
          },
          { orderBy: 'rating DESC' }
        )
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
  });
}
