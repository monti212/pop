import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/authService';
import { Shield, AlertTriangle, Activity, TrendingUp, Filter, RefreshCw } from 'lucide-react';

interface SecurityEvent {
  id: string;
  event_type: 'vendor_probe' | 'prompt_injection' | 'response_leakage' | 'identity_override';
  threat_level: 'low' | 'medium' | 'high';
  user_id?: string;
  session_id?: string;
  input_text: string;
  matched_patterns: string[];
  redacted: boolean;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface SecurityStats {
  total_events: number;
  high_threat_count: number;
  medium_threat_count: number;
  low_threat_count: number;
  redacted_count: number;
  top_patterns: Array<{ pattern: string; count: number }>;
}

const SecurityMonitoring: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [filter, eventTypeFilter, timeRange]);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);

      // Calculate time threshold
      const now = new Date();
      let timeThreshold = new Date();
      switch (timeRange) {
        case '1h':
          timeThreshold = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          timeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      // Build query
      let query = supabase
        .from('prompt_injection_attempts')
        .select('*')
        .gte('created_at', timeThreshold.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('threat_level', filter);
      }

      if (eventTypeFilter !== 'all') {
        query = query.eq('event_type', eventTypeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setEvents(data || []);

      // Calculate stats
      if (data) {
        const stats: SecurityStats = {
          total_events: data.length,
          high_threat_count: data.filter(e => e.threat_level === 'high').length,
          medium_threat_count: data.filter(e => e.threat_level === 'medium').length,
          low_threat_count: data.filter(e => e.threat_level === 'low').length,
          redacted_count: data.filter(e => e.redacted).length,
          top_patterns: []
        };

        // Count pattern frequency
        const patternCounts: Record<string, number> = {};
        data.forEach(event => {
          event.matched_patterns?.forEach((pattern: string) => {
            patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
          });
        });

        stats.top_patterns = Object.entries(patternCounts)
          .map(([pattern, count]) => ({ pattern, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setStats(stats);
      }
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'vendor_probe':
        return '🔍';
      case 'prompt_injection':
        return '⚠️';
      case 'response_leakage':
        return '📤';
      case 'identity_override':
        return '🎭';
      default:
        return '🛡️';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Security Monitoring</h1>
              <p className="text-gray-600">Identity protection and threat detection</p>
            </div>
          </div>
          <button
            onClick={fetchSecurityData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_events}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">High Threat</p>
                  <p className="text-2xl font-bold text-red-600">{stats.high_threat_count}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Medium Threat</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.medium_threat_count}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Low Threat</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.low_threat_count}</p>
                </div>
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Redacted</p>
                  <p className="text-2xl font-bold text-green-600">{stats.redacted_count}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>
        )}

        {/* Top Patterns */}
        {stats && stats.top_patterns.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top Attack Patterns</h2>
            <div className="space-y-2">
              {stats.top_patterns.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <code className="text-sm text-gray-700">{item.pattern.substring(0, 50)}...</code>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {item.count} matches
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-4 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Threat Level</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="vendor_probe">Vendor Probe</option>
                <option value="prompt_injection">Prompt Injection</option>
                <option value="response_leakage">Response Leakage</option>
                <option value="identity_override">Identity Override</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Events Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Security Events</h2>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No security events detected in this time range</p>
              </div>
            ) : (
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
                      Threat Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Input Preview
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="flex items-center space-x-2">
                          <span>{getEventTypeIcon(event.event_type)}</span>
                          <span className="text-gray-700">{event.event_type.replace(/_/g, ' ')}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getThreatLevelColor(
                            event.threat_level
                          )}`}
                        >
                          {event.threat_level.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                        {event.input_text.substring(0, 100)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {event.redacted ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            Redacted
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                            Logged
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {event.ip_address || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityMonitoring;
