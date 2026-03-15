import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/authService';
import { Activity, Clock, Zap, TrendingUp, ArrowLeft, Download, RefreshCw } from 'lucide-react';

interface PerformanceData {
  endpoint: string;
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  count: number;
}

interface SlowQuery {
  id: string;
  endpoint: string;
  response_time_ms: number;
  recorded_at: string;
  status_code: number;
}

interface HourlyPerformance {
  hour: string;
  p50: number;
  p95: number;
  p99: number;
}

export default function PerformanceMetrics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [performanceByEndpoint, setPerformanceByEndpoint] = useState<PerformanceData[]>([]);
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [hourlyTrends, setHourlyTrends] = useState<HourlyPerformance[]>([]);
  const [overallStats, setOverallStats] = useState({
    avgResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
    totalRequests: 0,
    errorRate: 0
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const getTimeRangeHours = () => {
    switch (timeRange) {
      case '1h': return 1;
      case '24h': return 24;
      case '7d': return 168;
      case '30d': return 720;
    }
  };

  const fetchPerformanceMetrics = async () => {
    try {
      setLoading(true);
      const hoursAgo = getTimeRangeHours();
      const startTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

      const { data: apiLogs, error } = await supabase
        .from('api_performance_log')
        .select('*')
        .gte('recorded_at', startTime)
        .order('recorded_at', { ascending: false });

      if (error) throw error;

      if (apiLogs && apiLogs.length > 0) {
        const endpointGroups = apiLogs.reduce((acc: any, log: any) => {
          if (!acc[log.endpoint]) {
            acc[log.endpoint] = [];
          }
          acc[log.endpoint].push(log.response_time_ms);
          return acc;
        }, {} as Record<string, number[]>);

        const endpointStats: PerformanceData[] = Object.entries(endpointGroups).map(([endpoint, times]: [string, any]) => {
          const sorted = (times as number[]).sort((a: any, b: any) => a - b);
          return {
            endpoint,
            p50: sorted[Math.floor(sorted.length * 0.5)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)],
            avg: sorted.reduce((a: any, b: any) => a + b, 0) / sorted.length,
            count: sorted.length
          };
        });

        setPerformanceByEndpoint(endpointStats);

        const allTimes = apiLogs.map((log: any) => log.response_time_ms).sort((a: any, b: any) => a - b);
        const errorCount = apiLogs.filter((log: any) => log.status_code >= 400).length;

        setOverallStats({
          avgResponseTime: allTimes.reduce((a: any, b: any) => a + b, 0) / allTimes.length,
          p95ResponseTime: allTimes[Math.floor(allTimes.length * 0.95)],
          p99ResponseTime: allTimes[Math.floor(allTimes.length * 0.99)],
          totalRequests: apiLogs.length,
          errorRate: (errorCount / apiLogs.length) * 100
        });

        const hourGroups = apiLogs.reduce((acc: any, log: any) => {
          const hour = new Date(log.recorded_at).toISOString().slice(0, 13);
          if (!acc[hour]) {
            acc[hour] = [];
          }
          acc[hour].push(log.response_time_ms);
          return acc;
        }, {} as Record<string, number[]>);

        const hourlyData: HourlyPerformance[] = Object.entries(hourGroups)
          .map(([hour, times]: [string, any]) => {
            const sorted = (times as number[]).sort((a: any, b: any) => a - b);
            return {
              hour,
              p50: sorted[Math.floor(sorted.length * 0.5)],
              p95: sorted[Math.floor(sorted.length * 0.95)],
              p99: sorted[Math.floor(sorted.length * 0.99)]
            };
          })
          .sort((a, b) => a.hour.localeCompare(b.hour))
          .slice(-24);

        setHourlyTrends(hourlyData);
      }

      const { data: slowQueriesData, error: slowError } = await supabase
        .from('api_performance_log')
        .select('*')
        .gte('recorded_at', startTime)
        .gt('response_time_ms', 1000)
        .order('response_time_ms', { ascending: false })
        .limit(20);

      if (slowError) throw slowError;
      setSlowQueries(slowQueriesData || []);

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceMetrics();
  }, [timeRange]);

  const exportData = () => {
    const csvData = [
      ['Endpoint', 'P50 (ms)', 'P95 (ms)', 'P99 (ms)', 'Avg (ms)', 'Request Count'],
      ...performanceByEndpoint.map(ep => [
        ep.endpoint,
        ep.p50.toFixed(0),
        ep.p95.toFixed(0),
        ep.p99.toFixed(0),
        ep.avg.toFixed(0),
        ep.count.toString()
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString()}.csv`;
    a.click();
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatHour = (hour: string) => {
    const date = new Date(hour);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPerformanceColor = (ms: number) => {
    if (ms < 500) return 'text-green-600';
    if (ms < 2000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBg = (ms: number) => {
    if (ms < 500) return 'bg-green-100';
    if (ms < 2000) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link
            to="/supa-admin"
            className="p-2 rounded-lg bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Performance Analytics</h1>
            <p className="text-gray-600 mt-1">Deep dive into API response times and system performance</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right text-sm">
            <div className="text-gray-500">Last Updated</div>
            <div className="font-medium text-gray-900">{lastUpdate.toLocaleTimeString()}</div>
          </div>
          <button
            onClick={fetchPerformanceMetrics}
            className="p-2 rounded-lg bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
          >
            <RefreshCw className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={exportData}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center space-x-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex space-x-2">
          {(['1h', '24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '1h' && 'Last Hour'}
              {range === '24h' && 'Last 24 Hours'}
              {range === '7d' && 'Last 7 Days'}
              {range === '30d' && 'Last 30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-gray-600">Average Response</div>
          <div className={`text-3xl font-bold mt-2 ${getPerformanceColor(overallStats.avgResponseTime)}`}>
            {formatTime(overallStats.avgResponseTime)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-gray-600">P95 Response</div>
          <div className={`text-3xl font-bold mt-2 ${getPerformanceColor(overallStats.p95ResponseTime)}`}>
            {formatTime(overallStats.p95ResponseTime)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-gray-600">P99 Response</div>
          <div className={`text-3xl font-bold mt-2 ${getPerformanceColor(overallStats.p99ResponseTime)}`}>
            {formatTime(overallStats.p99ResponseTime)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-gray-600">Total Requests</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {overallStats.totalRequests.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-gray-600">Error Rate</div>
          <div className={`text-3xl font-bold mt-2 ${overallStats.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
            {overallStats.errorRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Response Time Trends (P50, P95, P99)
        </h2>
        <div className="h-64 flex items-end space-x-1">
          {hourlyTrends.map((trend, index) => {
            const maxValue = Math.max(...hourlyTrends.flatMap(t => [t.p50, t.p95, t.p99]));
            return (
              <div key={index} className="flex-1 flex flex-col justify-end space-y-1">
                <div className="relative group">
                  <div
                    className="bg-red-400 rounded-t hover:bg-red-500 transition-colors"
                    style={{ height: `${(trend.p99 / maxValue) * 200}px`, minHeight: '2px' }}
                  />
                  <div
                    className="bg-yellow-400 rounded-t hover:bg-yellow-500 transition-colors"
                    style={{ height: `${(trend.p95 / maxValue) * 200}px`, minHeight: '2px' }}
                  />
                  <div
                    className="bg-green-400 rounded-t hover:bg-green-500 transition-colors"
                    style={{ height: `${(trend.p50 / maxValue) * 200}px`, minHeight: '2px' }}
                  />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                    <div>P99: {formatTime(trend.p99)}</div>
                    <div>P95: {formatTime(trend.p95)}</div>
                    <div>P50: {formatTime(trend.p50)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{hourlyTrends[0] ? formatHour(hourlyTrends[0].hour) : ''}</span>
          <span>{hourlyTrends[hourlyTrends.length - 1] ? formatHour(hourlyTrends[hourlyTrends.length - 1].hour) : ''}</span>
        </div>
        <div className="flex justify-center space-x-4 mt-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded" />
            <span>P50</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-400 rounded" />
            <span>P95</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-400 rounded" />
            <span>P99</span>
          </div>
        </div>
      </div>

      {/* Performance by Endpoint */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2" />
          Performance by Endpoint
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Endpoint</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Requests</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Average</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">P50</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">P95</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">P99</th>
              </tr>
            </thead>
            <tbody>
              {performanceByEndpoint.map((ep, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{ep.endpoint}</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-600">{ep.count.toLocaleString()}</td>
                  <td className={`py-3 px-4 text-sm text-right font-medium ${getPerformanceColor(ep.avg)}`}>
                    {formatTime(ep.avg)}
                  </td>
                  <td className={`py-3 px-4 text-sm text-right font-medium ${getPerformanceColor(ep.p50)}`}>
                    {formatTime(ep.p50)}
                  </td>
                  <td className={`py-3 px-4 text-sm text-right font-medium ${getPerformanceColor(ep.p95)}`}>
                    {formatTime(ep.p95)}
                  </td>
                  <td className={`py-3 px-4 text-sm text-right font-medium ${getPerformanceColor(ep.p99)}`}>
                    {formatTime(ep.p99)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slow Queries */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Slow Queries (Over 1 second)
        </h2>
        {slowQueries.length > 0 ? (
          <div className="space-y-2">
            {slowQueries.map((query) => (
              <div
                key={query.id}
                className={`p-4 rounded-lg border ${getPerformanceBg(query.response_time_ms)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{query.endpoint}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {new Date(query.recorded_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getPerformanceColor(query.response_time_ms)}`}>
                      {formatTime(query.response_time_ms)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Status: {query.status_code}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No slow queries detected - excellent performance!</p>
          </div>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </div>
      )}
    </div>
  );
}
