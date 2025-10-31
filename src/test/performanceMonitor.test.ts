import { describe, it, expect, beforeEach } from 'vitest';
import { performanceMonitor } from '@/utils/performanceMonitor';

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    performanceMonitor.clearMetrics();
  });

  it('should record page load metrics', () => {
    const endTracking = performanceMonitor.trackPageLoad('TestPage');
    
    // Simulate some work
    const start = Date.now();
    while (Date.now() - start < 10) {
      // Wait 10ms
    }
    
    endTracking();
    
    const metrics = performanceMonitor.getMetricsByType('page_load');
    expect(metrics.length).toBeGreaterThan(0);
    
    const testPageMetric = metrics.find(m => m.name === 'TestPage');
    expect(testPageMetric).toBeDefined();
    expect(testPageMetric?.success).toBe(true);
    expect(testPageMetric?.duration).toBeGreaterThan(0);
  });

  it('should track successful database queries', async () => {
    const mockQuery = async () => {
      return { data: 'test' };
    };

    const result = await performanceMonitor.trackDatabaseQuery('test_query', mockQuery);
    
    expect(result).toEqual({ data: 'test' });
    
    const metrics = performanceMonitor.getMetricsByType('database_query');
    expect(metrics.length).toBe(1);
    expect(metrics[0].name).toBe('test_query');
    expect(metrics[0].success).toBe(true);
  });

  it('should track failed database queries', async () => {
    const mockQuery = async () => {
      throw new Error('Query failed');
    };

    await expect(
      performanceMonitor.trackDatabaseQuery('failing_query', mockQuery)
    ).rejects.toThrow('Query failed');
    
    const metrics = performanceMonitor.getMetricsByType('database_query');
    expect(metrics.length).toBe(1);
    expect(metrics[0].name).toBe('failing_query');
    expect(metrics[0].success).toBe(false);
    expect(metrics[0].error).toBe('Query failed');
  });

  it('should track booking attempts', () => {
    performanceMonitor.trackBookingAttempt(true, undefined, {
      dentistId: 'test-123',
      paymentMethod: 'stripe',
    });

    const metrics = performanceMonitor.getMetricsByType('booking_attempt');
    expect(metrics.length).toBe(1);
    expect(metrics[0].success).toBe(true);
    expect(metrics[0].metadata?.dentistId).toBe('test-123');
  });

  it('should calculate statistics correctly', () => {
    // Record multiple metrics
    performanceMonitor.recordMetric({
      type: 'page_load',
      name: 'TestPage',
      duration: 100,
      success: true,
    });

    performanceMonitor.recordMetric({
      type: 'page_load',
      name: 'TestPage',
      duration: 200,
      success: true,
    });

    performanceMonitor.recordMetric({
      type: 'page_load',
      name: 'TestPage',
      duration: 300,
      success: false,
    });

    const stats = performanceMonitor.getStats('page_load', 'TestPage');
    
    expect(stats.totalMetrics).toBe(3);
    expect(stats.successRate).toBe(66.66666666666666);
    expect(stats.errorCount).toBe(1);
    expect(stats.averageDuration).toBe(200);
  });

  it('should get recent errors', () => {
    performanceMonitor.recordMetric({
      type: 'database_query',
      name: 'query1',
      success: false,
      error: 'Error 1',
    });

    performanceMonitor.recordMetric({
      type: 'booking_attempt',
      name: 'booking1',
      success: false,
      error: 'Error 2',
    });

    const errors = performanceMonitor.getRecentErrors(10);
    
    expect(errors.length).toBe(2);
    expect(errors[0].error).toBe('Error 2'); // Most recent first
    expect(errors[1].error).toBe('Error 1');
  });

  it('should generate summary', () => {
    performanceMonitor.recordMetric({
      type: 'page_load',
      name: 'Page1',
      duration: 100,
      success: true,
    });

    performanceMonitor.recordMetric({
      type: 'database_query',
      name: 'Query1',
      duration: 50,
      success: true,
    });

    performanceMonitor.recordMetric({
      type: 'booking_attempt',
      name: 'Booking1',
      success: true,
    });

    const summary = performanceMonitor.getSummary();
    
    expect(summary.pageLoads.totalMetrics).toBe(1);
    expect(summary.databaseQueries.totalMetrics).toBe(1);
    expect(summary.bookingAttempts.totalMetrics).toBe(1);
    expect(summary.timeRange).toBe('1 hour');
  });

  it('should clear metrics', () => {
    performanceMonitor.recordMetric({
      type: 'page_load',
      name: 'TestPage',
      duration: 100,
      success: true,
    });

    expect(performanceMonitor.getAllMetrics().length).toBe(1);
    
    performanceMonitor.clearMetrics();
    
    expect(performanceMonitor.getAllMetrics().length).toBe(0);
  });

  it('should limit stored metrics', () => {
    // Record more than maxMetrics (1000)
    for (let i = 0; i < 1100; i++) {
      performanceMonitor.recordMetric({
        type: 'page_load',
        name: `Page${i}`,
        duration: 100,
        success: true,
      });
    }

    const metrics = performanceMonitor.getAllMetrics();
    expect(metrics.length).toBeLessThanOrEqual(1000);
  });
});
