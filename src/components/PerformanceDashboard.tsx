import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Database, 
  Calendar, 
  TrendingUp, 
  AlertCircle,
  RefreshCw,
  Download
} from 'lucide-react';
import { performanceMonitor, PerformanceMetric, PerformanceStats } from '@/utils/performanceMonitor';

export function PerformanceDashboard() {
  const [summary, setSummary] = useState(performanceMonitor.getSummary());
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSummary(performanceMonitor.getSummary());
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [refreshKey]);

  const handleRefresh = () => {
    setSummary(performanceMonitor.getSummary());
    setRefreshKey(prev => prev + 1);
  };

  const handleExport = () => {
    const data = {
      summary,
      allMetrics: performanceMonitor.getAllMetrics(),
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all metrics?')) {
      performanceMonitor.clearMetrics();
      handleRefresh();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor system performance and track key metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="destructive" size="sm" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Page Loads"
          icon={<Activity className="h-4 w-4" />}
          stats={summary.pageLoads}
          unit="ms"
        />
        <MetricCard
          title="Database Queries"
          icon={<Database className="h-4 w-4" />}
          stats={summary.databaseQueries}
          unit="ms"
        />
        <MetricCard
          title="Booking Success"
          icon={<Calendar className="h-4 w-4" />}
          stats={summary.bookingAttempts}
          showSuccessRate
        />
        <MetricCard
          title="API Calls"
          icon={<TrendingUp className="h-4 w-4" />}
          stats={summary.apiCalls}
          unit="ms"
        />
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="page-loads">Page Loads</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>
                Performance metrics from the last {summary.timeRange}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Total Metrics</p>
                    <p className="text-2xl font-bold">{summary.totalMetrics}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Recent Errors</p>
                    <p className="text-2xl font-bold text-destructive">
                      {summary.recentErrors.length}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {summary.recentErrors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Recent Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ErrorList errors={summary.recentErrors} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="page-loads">
          <MetricDetailCard
            title="Page Load Performance"
            description="Track page load times and web vitals"
            metrics={performanceMonitor.getMetricsByType('page_load')}
            unit="ms"
          />
        </TabsContent>

        <TabsContent value="database">
          <MetricDetailCard
            title="Database Query Performance"
            description="Monitor database query execution times"
            metrics={performanceMonitor.getMetricsByType('database_query')}
            unit="ms"
          />
        </TabsContent>

        <TabsContent value="bookings">
          <MetricDetailCard
            title="Booking Attempts"
            description="Track booking success and failure rates"
            metrics={performanceMonitor.getMetricsByType('booking_attempt')}
            showSuccessRate
          />
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Error Log</CardTitle>
              <CardDescription>All errors from the last hour</CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorList errors={performanceMonitor.getRecentErrors(50)} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  stats: PerformanceStats;
  unit?: string;
  showSuccessRate?: boolean;
}

function MetricCard({ title, icon, stats, unit, showSuccessRate }: MetricCardProps) {
  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {showSuccessRate ? (
            <>
              <div className={`text-2xl font-bold ${getSuccessRateColor(stats.successRate)}`}>
                {stats.successRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalMetrics} total attempts
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">
                {stats.averageDuration.toFixed(0)}{unit}
              </div>
              <p className="text-xs text-muted-foreground">
                P95: {stats.p95Duration?.toFixed(0) || 0}{unit}
              </p>
            </>
          )}
          {stats.errorCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {stats.errorCount} errors
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricDetailCardProps {
  title: string;
  description: string;
  metrics: PerformanceMetric[];
  unit?: string;
  showSuccessRate?: boolean;
}

function MetricDetailCard({ title, description, metrics, unit, showSuccessRate }: MetricDetailCardProps) {
  // Group metrics by name
  const groupedMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.name]) {
      acc[metric.name] = [];
    }
    acc[metric.name].push(metric);
    return acc;
  }, {} as Record<string, PerformanceMetric[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {Object.entries(groupedMetrics).map(([name, metricList]) => {
              const successCount = metricList.filter(m => m.success).length;
              const successRate = (successCount / metricList.length) * 100;
              const durations = metricList
                .filter(m => m.duration !== undefined)
                .map(m => m.duration!);
              const avgDuration = durations.length > 0
                ? durations.reduce((a, b) => a + b, 0) / durations.length
                : 0;

              return (
                <div key={name} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {metricList.length} samples
                      </p>
                    </div>
                    <Badge variant={successRate >= 95 ? 'default' : 'destructive'}>
                      {successRate.toFixed(1)}% success
                    </Badge>
                  </div>
                  {!showSuccessRate && durations.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Avg</p>
                        <p className="font-medium">{avgDuration.toFixed(0)}{unit}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Min</p>
                        <p className="font-medium">{Math.min(...durations).toFixed(0)}{unit}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Max</p>
                        <p className="font-medium">{Math.max(...durations).toFixed(0)}{unit}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface ErrorListProps {
  errors: PerformanceMetric[];
}

function ErrorList({ errors }: ErrorListProps) {
  if (errors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No errors recorded
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3">
        {errors.map((error) => (
          <div key={error.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant="destructive">{error.type}</Badge>
                <p className="font-medium mt-1">{error.name}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(error.timestamp).toLocaleString()}
              </p>
            </div>
            {error.error && (
              <p className="text-sm text-destructive">{error.error}</p>
            )}
            {error.metadata && Object.keys(error.metadata).length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  Metadata
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                  {JSON.stringify(error.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
