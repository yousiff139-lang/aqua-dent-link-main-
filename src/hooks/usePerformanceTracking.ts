import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageLoad } from '@/utils/performanceMonitor';

/**
 * Hook to automatically track page load performance
 * Usage: Add to any page component to track its load time
 */
export function usePerformanceTracking(pageName?: string) {
  const location = useLocation();
  
  useEffect(() => {
    const name = pageName || location.pathname;
    const endTracking = trackPageLoad(name);
    
    // End tracking when component unmounts or route changes
    return () => {
      endTracking();
    };
  }, [location.pathname, pageName]);
}
