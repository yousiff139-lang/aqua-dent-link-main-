# Performance Monitoring Guide

## Overview

The booking system now includes comprehensive performance monitoring to track:
- Page load times
- Database query performance
- Booking success rates
- API call performance
- Error tracking

## Features

### 1. Automatic Metrics Collection

The system automatically collects:
- **Web Vitals**: LCP (Largest Contentful Paint), FID (First Input Delay), Navigation timing
- **Page Load Times**: Tracked for each page visit
- **Database Queries**: Execution time and success/failure rates
- **Booking Attempts**: Success rate and error tracking
- **API Calls**: Response times and error rates

### 2. Performance Dashboard

Access the performance dashboard at `/performance` (requires authentication).

The dashboard provides:
- **Summary Cards**: Quick overview of key metrics
- **Detailed Tabs**: In-depth analysis by metric type
- **Error Log**: Recent errors with full details
- **Export Functionality**: Download metrics as JSON
- **Real-time Updates**: Refreshes every 5 seconds

### 3. Metrics Storage

- **In-Memory**: Last 1000 metrics kept in memory
- **LocalStorage**: Last 100 metrics persisted for page reloads
- **Production**: Ready for integration with analytics services (Sentry, DataDog, etc.)

## Usage

### Tracking Page Load Performance

Automatically tracked for pages using the `usePerformanceTracking` hook:

```typescript
import { usePerformanceTracking } from '@/hooks/usePerformanceTracking';

function MyPage() {
  usePerformanceTracking('MyPage');
  // ... rest of component
}
```

### Tracking Database Queries

Automatically tracked in hooks that use `trackDatabaseQuery`:

```typescript
import { trackDatabaseQuery } from '@/utils/performanceMonitor';

const data = await trackDatabaseQuery('query_name', async () => {
  return await supabase.from('table').select('*');
});
```

### Tracking Booking Attempts

Automatically tracked in BookingForm component:

```typescript
import { trackBookingAttempt } from '@/utils/performanceMonitor';

// On success
trackBookingAttempt(true, undefined, {
  dentistId,
  paymentMethod,
  appointmentDate,
});

// On failure
trackBookingAttempt(false, error.message, {
  dentistId,
  errorCode,
});
```

### Tracking API Calls

```typescript
import { trackApiCall } from '@/utils/performanceMonitor';

const result = await trackApiCall('api_name', async () => {
  return await fetch('/api/endpoint');
});
```

## Dashboard Sections

### Overview Tab
- Total metrics collected
- Recent errors summary
- System health at a glance

### Page Loads Tab
- Average load time per page
- P95 and P99 percentiles
- Individual page performance breakdown

### Database Tab
- Query execution times
- Success rates by query type
- Slow query identification

### Bookings Tab
- Booking success rate
- Common failure reasons
- Payment method breakdown

### Errors Tab
- Complete error log
- Error details and metadata
- Timestamp and context

## Interpreting Metrics

### Success Rate Colors
- **Green (≥95%)**: Excellent performance
- **Yellow (80-94%)**: Acceptable, monitor for issues
- **Red (<80%)**: Needs attention

### Performance Thresholds
- **Page Load**: Target <2000ms
- **Database Query**: Target <500ms
- **API Call**: Target <1000ms

### Key Metrics

#### Largest Contentful Paint (LCP)
- **Good**: <2.5s
- **Needs Improvement**: 2.5s - 4s
- **Poor**: >4s

#### First Input Delay (FID)
- **Good**: <100ms
- **Needs Improvement**: 100ms - 300ms
- **Poor**: >300ms

## Exporting Data

1. Navigate to `/performance`
2. Click "Export" button
3. JSON file downloads with:
   - All current metrics
   - Summary statistics
   - Export timestamp

## Integration with Analytics Services

### Production Setup

To send metrics to an analytics service, modify the `sendToAnalytics` method in `src/utils/performanceMonitor.ts`:

```typescript
private sendToAnalytics(metric: PerformanceMetric) {
  // Example: Sentry
  Sentry.captureMessage('Performance Metric', {
    level: 'info',
    extra: metric,
  });

  // Example: DataDog
  datadogRum.addAction('performance_metric', metric);

  // Example: Custom API
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify(metric),
  });
}
```

## Troubleshooting

### Metrics Not Appearing

1. Check browser console for errors
2. Verify `usePerformanceTracking` is called in page components
3. Ensure localStorage is enabled
4. Check that PerformanceObserver is supported (modern browsers only)

### Dashboard Not Loading

1. Verify you're authenticated
2. Check route is accessible at `/performance`
3. Look for console errors
4. Ensure all UI components are installed

### High Error Rates

1. Check Error Log tab for details
2. Review error messages and codes
3. Check database connectivity
4. Verify API endpoints are responding

## Best Practices

1. **Monitor Regularly**: Check dashboard weekly
2. **Set Alerts**: Configure alerts for success rate drops
3. **Track Trends**: Export data periodically to track long-term trends
4. **Investigate Errors**: Address errors promptly to maintain user experience
5. **Optimize Slow Queries**: Use P95/P99 metrics to identify optimization opportunities

## API Reference

### performanceMonitor

```typescript
// Record custom metric
performanceMonitor.recordMetric({
  type: 'api_call',
  name: 'custom_operation',
  duration: 123,
  success: true,
  metadata: { key: 'value' },
});

// Get statistics
const stats = performanceMonitor.getStats('page_load', 'DentistProfile');

// Get all metrics
const metrics = performanceMonitor.getAllMetrics();

// Clear metrics
performanceMonitor.clearMetrics();

// Get summary
const summary = performanceMonitor.getSummary();
```

### Helper Functions

```typescript
// Track page load
const endTracking = trackPageLoad('PageName');
// ... page loads
endTracking();

// Track database query
const result = await trackDatabaseQuery('query_name', queryFn);

// Track booking attempt
trackBookingAttempt(success, error, metadata);

// Track API call
const result = await trackApiCall('api_name', apiFn);
```

## Future Enhancements

Planned improvements:
- Real-time alerting for critical metrics
- Historical trend analysis
- Automated performance reports
- Integration with CI/CD for performance regression testing
- User session replay for error debugging
- Geographic performance breakdown
- Device/browser performance comparison

## Support

For issues or questions about performance monitoring:
1. Check this guide first
2. Review browser console for errors
3. Export metrics and share with development team
4. Check application logs for backend issues
