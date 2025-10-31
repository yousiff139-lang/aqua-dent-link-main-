/**
 * Performance Monitoring Utility
 * Tracks page load times, database query performance, and booking success rates
 */

export interface PerformanceMetric {
  id: string;
  type: 'page_load' | 'database_query' | 'booking_attempt' | 'api_call';
  name: string;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface PerformanceStats {
  totalMetrics: number;
  averageDuration: number;
  successRate: number;
  errorCount: number;
  p95Duration?: number;
  p99Duration?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics in memory
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    this.initializeWebVitals();
  }

  /**
   * Initialize Web Vitals monitoring (LCP, FID, CLS)
   */
  private initializeWebVitals() {
    if (typeof window === 'undefined') return;

    // Monitor Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          
          this.recordMetric({
            type: 'page_load',
            name: 'LCP',
            duration: lastEntry.renderTime || lastEntry.loadTime,
            success: true,
            metadata: {
              element: lastEntry.element?.tagName,
              url: lastEntry.url,
            },
          });
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // Monitor First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.recordMetric({
              type: 'page_load',
              name: 'FID',
              duration: entry.processingStart - entry.startTime,
              success: true,
              metadata: {
                eventType: entry.name,
              },
            });
          });
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Monitor Navigation Timing
      try {
        const navObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.recordMetric({
              type: 'page_load',
              name: 'Navigation',
              duration: entry.loadEventEnd - entry.fetchStart,
              success: true,
              metadata: {
                domContentLoaded: entry.domContentLoadedEventEnd - entry.fetchStart,
                domInteractive: entry.domInteractive - entry.fetchStart,
                type: entry.type,
              },
            });
          });
        });
        
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navObserver);
      } catch (e) {
        console.warn('Navigation observer not supported');
      }
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>) {
    const fullMetric: PerformanceMetric = {
      ...metric,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.metrics.push(fullMetric);

    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('[Performance]', fullMetric);
    }

    // Send to analytics service in production
    if (import.meta.env.PROD) {
      this.sendToAnalytics(fullMetric);
    }
  }

  /**
   * Track page load time
   */
  trackPageLoad(pageName: string) {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric({
        type: 'page_load',
        name: pageName,
        duration,
        success: true,
      });
    };
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();

    return queryFn()
      .then((result) => {
        const duration = performance.now() - startTime;
        this.recordMetric({
          type: 'database_query',
          name: queryName,
          duration,
          success: true,
        });
        return result;
      })
      .catch((error) => {
        const duration = performance.now() - startTime;
        this.recordMetric({
          type: 'database_query',
          name: queryName,
          duration,
          success: false,
          error: error.message,
        });
        throw error;
      });
  }

  /**
   * Track booking attempt
   */
  trackBookingAttempt(success: boolean, error?: string, metadata?: Record<string, any>) {
    this.recordMetric({
      type: 'booking_attempt',
      name: 'Booking',
      success,
      error,
      metadata,
    });
  }

  /**
   * Track API call performance
   */
  trackApiCall<T>(
    apiName: string,
    apiFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();

    return apiFn()
      .then((result) => {
        const duration = performance.now() - startTime;
        this.recordMetric({
          type: 'api_call',
          name: apiName,
          duration,
          success: true,
        });
        return result;
      })
      .catch((error) => {
        const duration = performance.now() - startTime;
        this.recordMetric({
          type: 'api_call',
          name: apiName,
          duration,
          success: false,
          error: error.message,
        });
        throw error;
      });
  }

  /**
   * Get statistics for a specific metric type
   */
  getStats(type?: PerformanceMetric['type'], name?: string): PerformanceStats {
    let filteredMetrics = this.metrics;

    if (type) {
      filteredMetrics = filteredMetrics.filter(m => m.type === type);
    }

    if (name) {
      filteredMetrics = filteredMetrics.filter(m => m.name === name);
    }

    const totalMetrics = filteredMetrics.length;
    const successCount = filteredMetrics.filter(m => m.success).length;
    const errorCount = filteredMetrics.filter(m => !m.success).length;
    const successRate = totalMetrics > 0 ? (successCount / totalMetrics) * 100 : 0;

    const durationsWithValues = filteredMetrics
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!);

    const averageDuration = durationsWithValues.length > 0
      ? durationsWithValues.reduce((a, b) => a + b, 0) / durationsWithValues.length
      : 0;

    // Calculate percentiles
    const sortedDurations = [...durationsWithValues].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedDurations.length * 0.95);
    const p99Index = Math.floor(sortedDurations.length * 0.99);

    return {
      totalMetrics,
      averageDuration,
      successRate,
      errorCount,
      p95Duration: sortedDurations[p95Index],
      p99Duration: sortedDurations[p99Index],
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by type
   */
  getMetricsByType(type: PerformanceMetric['type']): PerformanceMetric[] {
    return this.metrics.filter(m => m.type === type);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10): PerformanceMetric[] {
    return this.metrics
      .filter(m => !m.success)
      .slice(-limit)
      .reverse();
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
  }

  /**
   * Send metric to analytics service (placeholder for production)
   */
  private sendToAnalytics(metric: PerformanceMetric) {
    // In production, send to your analytics service
    // Example: Sentry, DataDog, New Relic, etc.
    
    // For now, we'll just store in localStorage for persistence
    try {
      const stored = localStorage.getItem('performance_metrics');
      const metrics = stored ? JSON.parse(stored) : [];
      metrics.push(metric);
      
      // Keep only last 100 metrics in localStorage
      const recentMetrics = metrics.slice(-100);
      localStorage.setItem('performance_metrics', JSON.stringify(recentMetrics));
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  /**
   * Get performance summary for dashboard
   */
  getSummary() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= oneHourAgo);

    return {
      pageLoads: this.getStats('page_load'),
      databaseQueries: this.getStats('database_query'),
      bookingAttempts: this.getStats('booking_attempt'),
      apiCalls: this.getStats('api_call'),
      recentErrors: this.getRecentErrors(5),
      totalMetrics: recentMetrics.length,
      timeRange: '1 hour',
    };
  }

  /**
   * Cleanup observers
   */
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export helper functions
export const trackPageLoad = (pageName: string) => 
  performanceMonitor.trackPageLoad(pageName);

export const trackDatabaseQuery = <T>(queryName: string, queryFn: () => Promise<T>) =>
  performanceMonitor.trackDatabaseQuery(queryName, queryFn);

export const trackBookingAttempt = (success: boolean, error?: string, metadata?: Record<string, any>) =>
  performanceMonitor.trackBookingAttempt(success, error, metadata);

export const trackApiCall = <T>(apiName: string, apiFn: () => Promise<T>) =>
  performanceMonitor.trackApiCall(apiName, apiFn);
