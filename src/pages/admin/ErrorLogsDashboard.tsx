import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { errorLogService, ErrorLog, ErrorLogFilters } from '../../services/errorLogService';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Filter,
  RefreshCw,
  Info,
  AlertCircle,
  XOctagon
} from 'lucide-react';
import { format } from 'date-fns';

export default function ErrorLogsDashboard() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    unresolved: 0,
    byType: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
    byEnvironment: {} as Record<string, number>,
  });
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [filters, setFilters] = useState<ErrorLogFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    fetchErrorLogs();
    fetchErrorStats();
    const interval = setInterval(() => {
      fetchErrorLogs();
      fetchErrorStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [filters, currentPage]);

  const fetchErrorLogs = async () => {
    setLoading(true);
    const { logs: fetchedLogs, count } = await errorLogService.getErrorLogs(
      filters,
      pageSize,
      currentPage * pageSize
    );
    setLogs(fetchedLogs);
    setTotalCount(count);
    setLoading(false);
  };

  const fetchErrorStats = async () => {
    const fetchedStats = await errorLogService.getErrorStats();
    setStats(fetchedStats);
  };

  const handleResolve = async (log: ErrorLog) => {
    if (!resolutionNotes.trim()) {
      alert('Please provide resolution notes');
      return;
    }

    const result = await errorLogService.resolveError({
      id: log.id,
      resolution_notes: resolutionNotes,
    });

    if (result.success) {
      setSelectedLog(null);
      setResolutionNotes('');
      fetchErrorLogs();
      fetchErrorStats();
    } else {
      alert(`Failed to resolve error: ${result.error}`);
    }
  };

  const handleUnresolve = async (logId: string) => {
    const result = await errorLogService.unresolveError(logId);
    if (result.success) {
      fetchErrorLogs();
      fetchErrorStats();
    } else {
      alert(`Failed to unresolve error: ${result.error}`);
    }
  };

  const handleDelete = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this error log?')) {
      return;
    }

    const result = await errorLogService.deleteError(logId);
    if (result.success) {
      fetchErrorLogs();
      fetchErrorStats();
    } else {
      alert(`Failed to delete error: ${result.error}`);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XOctagon className="w-4 h-4" />;
      case 'high': return <AlertCircle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'low': return <Info className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'runtime': return 'text-purple-600 bg-purple-50';
      case 'network': return 'text-blue-600 bg-blue-50';
      case 'database': return 'text-red-600 bg-red-50';
      case 'authentication': return 'text-orange-600 bg-orange-50';
      case 'validation': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const applyFilters = () => {
    setCurrentPage(0);
    fetchErrorLogs();
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(0);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            to="/supa-admin"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Supa Admin
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Error Logs</h1>
              <p className="text-gray-600 mt-1">Monitor and manage application errors</p>
            </div>
            <button
              onClick={fetchErrorLogs}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Errors</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unresolved</p>
                <p className="text-3xl font-bold text-red-600">{stats.unresolved}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-3xl font-bold text-green-600">{stats.total - stats.unresolved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical</p>
                <p className="text-3xl font-bold text-red-600">{stats.bySeverity.critical || 0}</p>
              </div>
              <XOctagon className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center text-gray-700 hover:text-gray-900"
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {showFilters && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Error Type
                </label>
                <select
                  value={filters.error_type || ''}
                  onChange={(e) => setFilters({ ...filters, error_type: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="runtime">Runtime</option>
                  <option value="network">Network</option>
                  <option value="database">Database</option>
                  <option value="authentication">Authentication</option>
                  <option value="validation">Validation</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity
                </label>
                <select
                  value={filters.severity || ''}
                  onChange={(e) => setFilters({ ...filters, severity: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Environment
                </label>
                <select
                  value={filters.environment || ''}
                  onChange={(e) => setFilters({ ...filters, environment: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Environments</option>
                  <option value="development">Development</option>
                  <option value="production">Production</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.resolved === undefined ? '' : filters.resolved ? 'true' : 'false'}
                  onChange={(e) => setFilters({
                    ...filters,
                    resolved: e.target.value === '' ? undefined : e.target.value === 'true'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="false">Unresolved</option>
                  <option value="true">Resolved</option>
                </select>
              </div>

              <div className="md:col-span-2 flex items-end space-x-2">
                <button
                  onClick={applyFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply Filters
                </button>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Environment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No error logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(log.error_type)}`}>
                          {log.error_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(log.severity)}`}>
                          {getSeverityIcon(log.severity)}
                          <span className="ml-1">{log.severity}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          log.environment === 'production' ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'
                        }`}>
                          {log.environment}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                        {log.error_message}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.resolved ? (
                          <span className="flex items-center text-green-600">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Resolved
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600">
                            <XCircle className="w-4 h-4 mr-1" />
                            Unresolved
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        {!log.resolved ? (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Resolve
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnresolve(log.id)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Unresolve
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalCount > pageSize && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount} errors
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={(currentPage + 1) * pageSize >= totalCount}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Error Details</h2>
                <button
                  onClick={() => {
                    setSelectedLog(null);
                    setResolutionNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <span className={`inline-block mt-1 px-3 py-1 text-sm font-semibold rounded-full ${getTypeColor(selectedLog.error_type)}`}>
                      {selectedLog.error_type}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Severity</label>
                    <span className={`inline-flex items-center mt-1 px-3 py-1 text-sm font-semibold rounded-full ${getSeverityColor(selectedLog.severity)}`}>
                      {getSeverityIcon(selectedLog.severity)}
                      <span className="ml-1">{selectedLog.severity}</span>
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Environment</label>
                    <span className={`inline-block mt-1 px-3 py-1 text-sm font-semibold rounded-full ${
                      selectedLog.environment === 'production' ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'
                    }`}>
                      {selectedLog.environment}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {format(new Date(selectedLog.created_at), 'PPpp')}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Message</label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedLog.error_message}
                  </p>
                </div>

                {selectedLog.error_stack && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Stack Trace</label>
                    <pre className="mt-1 text-xs text-gray-900 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                      {selectedLog.error_stack}
                    </pre>
                  </div>
                )}

                {selectedLog.error_context && Object.keys(selectedLog.error_context).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Context</label>
                    <pre className="mt-1 text-xs text-gray-900 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(selectedLog.error_context, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.resolved && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Resolution</label>
                    <div className="mt-1 bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-900 mb-2">
                        Resolved on {format(new Date(selectedLog.resolved_at!), 'PPpp')}
                      </p>
                      <p className="text-sm text-gray-900">{selectedLog.resolution_notes}</p>
                    </div>
                  </div>
                )}

                {!selectedLog.resolved && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resolution Notes
                    </label>
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Describe how this error was resolved..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={4}
                    />
                    <button
                      onClick={() => handleResolve(selectedLog)}
                      className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Resolved
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
