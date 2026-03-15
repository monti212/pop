import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, XCircle, AlertCircle, Info, ArrowLeft, RefreshCw,
  Download, TrendingDown, Code, Server, Globe
} from 'lucide-react';

interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  criticalErrors: number;
  warningErrors: number;
  infoErrors: number;
  frontendErrors: number;
  backendErrors: number;
  resolvedErrors: number;
  avgResolutionTime: number;
}

interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'critical' | 'error' | 'warning' | 'info';
  source: 'frontend' | 'backend';
  message: string;
  stackTrace?: string;
  userId?: string;
  userEmail?: string;
  url?: string;
  browser?: string;
  resolved: boolean;
  occurrences: number;
}

export default function ErrorTrackingDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ErrorMetrics>({
    totalErrors: 0,
    errorRate: 0,
    criticalErrors: 0,
    warningErrors: 0,
    infoErrors: 0,
    frontendErrors: 0,
    backendErrors: 0,
    resolvedErrors: 0,
    avgResolutionTime: 0
  });
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [filterLevel, setFilterLevel] = useState<'all' | 'critical' | 'error' | 'warning' | 'info'>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'frontend' | 'backend'>('all');
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchErrorData = async () => {
    try {
      setLoading(true);

      const mockErrors: ErrorLog[] = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          level: 'critical',
          source: 'backend',
          message: 'Database connection pool exhausted',
          stackTrace: 'Error: Connection timeout\n  at Pool.connect (pool.js:234)\n  at async query (db.js:45)',
          userId: 'user-123',
          userEmail: 'teacher@pencilsofpromise.org',
          resolved: false,
          occurrences: 5
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          level: 'error',
          source: 'frontend',
          message: 'Failed to fetch messages: Network request failed',
          stackTrace: 'TypeError: Failed to fetch\n  at ChatInterface.tsx:156\n  at fetchMessages (chatService.ts:89)',
          userId: 'user-456',
          userEmail: 'admin@pencilsofpromise.org',
          url: '/chat',
          browser: 'Chrome 120.0.0',
          resolved: false,
          occurrences: 12
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          level: 'warning',
          source: 'backend',
          message: 'Slow query detected: SELECT took 1.2s',
          resolved: true,
          occurrences: 8
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          level: 'error',
          source: 'frontend',
          message: 'Cannot read property "map" of undefined',
          stackTrace: 'TypeError: Cannot read property "map" of undefined\n  at UserActivityDashboard.tsx:245',
          userId: 'user-789',
          resolved: false,
          occurrences: 3
        }
      ];

      let filteredErrors = mockErrors;
      if (filterLevel !== 'all') {
        filteredErrors = filteredErrors.filter(e => e.level === filterLevel);
      }
      if (filterSource !== 'all') {
        filteredErrors = filteredErrors.filter(e => e.source === filterSource);
      }

      setErrors(filteredErrors);

      const totalErrors = mockErrors.length;
      const criticalErrors = mockErrors.filter(e => e.level === 'critical').length;
      const warningErrors = mockErrors.filter(e => e.level === 'warning').length;
      const infoErrors = mockErrors.filter(e => e.level === 'info').length;
      const frontendErrors = mockErrors.filter(e => e.source === 'frontend').length;
      const backendErrors = mockErrors.filter(e => e.source === 'backend').length;
      const resolvedErrors = mockErrors.filter(e => e.resolved).length;

      setMetrics({
        totalErrors,
        errorRate: 2.5,
        criticalErrors,
        warningErrors,
        infoErrors,
        frontendErrors,
        backendErrors,
        resolvedErrors,
        avgResolutionTime: 45
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching error data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrorData();
  }, [timeRange, filterLevel, filterSource]);

  const exportData = () => {
    const csvData = [
      ['Timestamp', 'Level', 'Source', 'Message', 'User Email', 'Occurrences', 'Resolved'],
      ...errors.map(e => [
        new Date(e.timestamp).toLocaleString(),
        e.level,
        e.source,
        e.message,
        e.userEmail || 'N/A',
        e.occurrences.toString(),
        e.resolved ? 'Yes' : 'No'
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-log-${new Date().toISOString()}.csv`;
    a.click();
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'error':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen pb-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link to="/supa-admin" className="p-2 rounded-lg bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-200">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Error Tracking & Debugging</h1>
            <p className="text-gray-600 mt-1">Pencils of Promise - System Error Monitoring</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right text-sm">
            <div className="text-gray-500">Last Updated</div>
            <div className="font-medium text-gray-900">{lastUpdate.toLocaleTimeString()}</div>
          </div>
          <button onClick={fetchErrorData} className="p-2 rounded-lg bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-200">
            <RefreshCw className="w-5 h-5 text-gray-700" />
          </button>
          <button onClick={exportData} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center space-x-2 shadow-sm">
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Errors</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.criticalErrors}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="text-xs text-gray-600">
            Require immediate attention
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.errorRate}%</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <div className="text-xs text-gray-600 flex items-center space-x-1">
            <TrendingDown className="w-3 h-3 text-green-600" />
            <span>12% decrease from last week</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.resolvedErrors}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Code className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="text-xs text-gray-600">
            {((metrics.resolvedErrors / metrics.totalErrors) * 100).toFixed(0)}% resolution rate
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.avgResolutionTime}m</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <AlertCircle className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="text-xs text-gray-600">
            Target: under 60 minutes
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Time:</span>
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '24h' && 'Last 24 Hours'}
              {range === '7d' && 'Last 7 Days'}
              {range === '30d' && 'Last 30 Days'}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Level:</span>
          {(['all', 'critical', 'error', 'warning', 'info'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors capitalize ${
                filterLevel === level
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Source:</span>
          {(['all', 'frontend', 'backend'] as const).map((source) => (
            <button
              key={source}
              onClick={() => setFilterSource(source)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors capitalize ${
                filterSource === source
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {source}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Errors</h2>
        <div className="space-y-3">
          {errors.map((error) => (
            <div
              key={error.id}
              className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${getLevelColor(error.level)}`}
              onClick={() => setSelectedError(error)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getLevelIcon(error.level)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold uppercase text-xs">{error.level}</span>
                      <span className="text-xs text-gray-500">•</span>
                      {error.source === 'frontend' ? (
                        <Globe className="w-4 h-4" />
                      ) : (
                        <Server className="w-4 h-4" />
                      )}
                      <span className="text-xs capitalize">{error.source}</span>
                      {error.resolved && (
                        <>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-green-600 font-medium">Resolved</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm font-medium mb-1">{error.message}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <span>{new Date(error.timestamp).toLocaleString()}</span>
                      {error.userEmail && <span>User: {error.userEmail}</span>}
                      <span>{error.occurrences} occurrence{error.occurrences !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Error Details</h3>
                <button onClick={() => setSelectedError(null)} className="text-gray-500 hover:text-gray-700">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Level</label>
                    <p className="text-lg font-semibold capitalize">{selectedError.level}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Source</label>
                    <p className="text-lg font-semibold capitalize">{selectedError.source}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Timestamp</label>
                    <p className="text-lg">{new Date(selectedError.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Occurrences</label>
                    <p className="text-lg font-semibold">{selectedError.occurrences}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Message</label>
                  <p className="text-lg mt-1">{selectedError.message}</p>
                </div>

                {selectedError.userEmail && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">User</label>
                    <p className="text-lg mt-1">{selectedError.userEmail}</p>
                  </div>
                )}

                {selectedError.stackTrace && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Stack Trace</label>
                    <pre className="mt-1 bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                      {selectedError.stackTrace}
                    </pre>
                  </div>
                )}

                <button
                  onClick={() => setSelectedError(null)}
                  className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
