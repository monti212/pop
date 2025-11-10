import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/authService';
import { Activity, Users, Database, AlertTriangle, Zap, TrendingUp, Clock } from 'lucide-react';

interface SystemMetric {
  metric_type: string;
  metric_value: number;
  metadata: any;
  recorded_at: string;
}

interface DatabaseMetric {
  active_connections: number;
  max_connections: number;
  database_size_mb: number;
  cache_hit_ratio: number;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  recorded_at: string;
}

interface RecentError {
  id: string;
  error_type: string;
  severity: string;
  error_message: string;
  recorded_at: string;
  user_id?: string;
}

interface TokenUsage {
  used_today: number;
  daily_limit: number;
  percentage: number;
}

export default function LiveSystemMonitor() {
  const [concurrentUsers, setConcurrentUsers] = useState<number>(0);
  const [connectionPool, setConnectionPool] = useState({ used: 0, total: 500 });
  const [errorRate, setErrorRate] = useState<number>(0);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({ used_today: 0, daily_limit: 30000, percentage: 0 });
  const [recentErrors, setRecentErrors] = useState<RecentError[]>([]);
  const [systemHealth, setSystemHealth] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const [userTrend, setUserTrend] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch concurrent users count
  const fetchConcurrentUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_concurrent_users_count');

      if (error) throw error;

      setConcurrentUsers(data || 0);

      // Update trend data (keep last 24 points)
      setUserTrend(prev => [...prev.slice(-23), data || 0]);
    } catch (error) {
      console.error('Error fetching concurrent users:', error);
    }
  };

  // Fetch database connection pool metrics
  const fetchConnectionPool = async () => {
    try {
      const { data, error } = await supabase
        .from('database_metrics')
        .select('active_connections, max_connections')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setConnectionPool({
          used: data.active_connections,
          total: data.max_connections || 500
        });
      }
    } catch (error) {
      console.error('Error fetching connection pool:', error);
    }
  };

  // Fetch error rate (last 5 minutes)
  const fetchErrorRate = async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('error_log')
        .select('id', { count: 'exact', head: true })
        .gte('recorded_at', fiveMinutesAgo);

      if (error) throw error;

      const errorCount = data || 0;
      const rate = (errorCount / 5) * 60; // Errors per hour
      setErrorRate(rate);
    } catch (error) {
      console.error('Error fetching error rate:', error);
    }
  };

  // Fetch token usage for today
  const fetchTokenUsage = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('organization_token_usage')
        .select('tokens_used')
        .gte('usage_date', today)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const usedToday = data?.tokens_used || 0;
      const dailyLimit = 30000;

      setTokenUsage({
        used_today: usedToday,
        daily_limit: dailyLimit,
        percentage: (usedToday / dailyLimit) * 100
      });
    } catch (error) {
      console.error('Error fetching token usage:', error);
    }
  };

  // Fetch recent errors
  const fetchRecentErrors = async () => {
    try {
      const { data, error } = await supabase
        .from('error_log')
        .select('id, error_type, severity, error_message, recorded_at, user_id')
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setRecentErrors(data || []);
    } catch (error) {
      console.error('Error fetching recent errors:', error);
    }
  };

  // Calculate overall system health
  const calculateSystemHealth = () => {
    const poolPercentage = (connectionPool.used / connectionPool.total) * 100;
    const tokenPercentage = tokenUsage.percentage;
    const currentHour = new Date().getHours();
    const isLateDay = currentHour >= 18;

    if (
      poolPercentage >= 95 ||
      errorRate > 100 ||
      (tokenPercentage >= 90 && !isLateDay) ||
      concurrentUsers >= 480
    ) {
      return 'critical';
    } else if (
      poolPercentage >= 80 ||
      errorRate > 50 ||
      (tokenPercentage >= 80 && currentHour < 18) ||
      concurrentUsers >= 450
    ) {
      return 'warning';
    }
    return 'healthy';
  };

  // Fetch all metrics
  const fetchAllMetrics = async () => {
    setLoading(true);
    await Promise.all([
      fetchConcurrentUsers(),
      fetchConnectionPool(),
      fetchErrorRate(),
      fetchTokenUsage(),
      fetchRecentErrors()
    ]);
    setLastUpdate(new Date());
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    fetchAllMetrics();
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllMetrics();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Update system health when metrics change
  useEffect(() => {
    setSystemHealth(calculateSystemHealth());
  }, [concurrentUsers, connectionPool, errorRate, tokenUsage]);

  const getHealthColor = (health: 'healthy' | 'warning' | 'critical') => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
    }
  };

  const getHealthBorderColor = (health: 'healthy' | 'warning' | 'critical') => {
    switch (health) {
      case 'healthy': return 'border-green-500';
      case 'warning': return 'border-yellow-500';
      case 'critical': return 'border-red-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'error': return 'text-orange-600 bg-orange-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const connectionPoolPercentage = (connectionPool.used / connectionPool.total) * 100;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live System Monitor</h1>
          <p className="text-gray-600 mt-1">Real-time monitoring for 500 concurrent teachers</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-gray-500">Last Updated</div>
            <div className="text-sm font-medium text-gray-900 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg font-semibold ${getHealthColor(systemHealth)}`}>
            {systemHealth === 'healthy' && '● System Healthy'}
            {systemHealth === 'warning' && '⚠ System Warning'}
            {systemHealth === 'critical' && '🔴 Critical Alert'}
          </div>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Concurrent Users */}
        <div className={`bg-white rounded-lg shadow-lg border-l-4 ${getHealthBorderColor(concurrentUsers >= 450 ? (concurrentUsers >= 480 ? 'critical' : 'warning') : 'healthy')} p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Concurrent Users</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{concurrentUsers}</p>
              <p className="text-sm text-gray-500 mt-1">of 500 capacity</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          {concurrentUsers >= 450 && (
            <div className="mt-3 text-sm text-yellow-600 font-medium">
              ⚠ Approaching capacity limit
            </div>
          )}
        </div>

        {/* Connection Pool */}
        <div className={`bg-white rounded-lg shadow-lg border-l-4 ${getHealthBorderColor(connectionPoolPercentage >= 80 ? (connectionPoolPercentage >= 95 ? 'critical' : 'warning') : 'healthy')} p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Connection Pool</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{connectionPool.used}</p>
              <p className="text-sm text-gray-500 mt-1">of {connectionPool.total} connections</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Database className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{connectionPoolPercentage.toFixed(1)}% used</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  connectionPoolPercentage >= 95 ? 'bg-red-500' :
                  connectionPoolPercentage >= 80 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(connectionPoolPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Error Rate */}
        <div className={`bg-white rounded-lg shadow-lg border-l-4 ${getHealthBorderColor(errorRate > 50 ? (errorRate > 100 ? 'critical' : 'warning') : 'healthy')} p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{errorRate.toFixed(0)}</p>
              <p className="text-sm text-gray-500 mt-1">errors per hour</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          {errorRate > 50 && (
            <div className="mt-3 text-sm text-orange-600 font-medium">
              ⚠ Elevated error rate detected
            </div>
          )}
        </div>

        {/* Token Usage */}
        <div className={`bg-white rounded-lg shadow-lg border-l-4 ${getHealthBorderColor(tokenUsage.percentage >= 80 ? (tokenUsage.percentage >= 90 ? 'critical' : 'warning') : 'healthy')} p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Token Usage Today</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{(tokenUsage.used_today / 1000).toFixed(1)}K</p>
              <p className="text-sm text-gray-500 mt-1">of 30K daily limit</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Zap className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{tokenUsage.percentage.toFixed(1)}% used</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  tokenUsage.percentage >= 90 ? 'bg-red-500' :
                  tokenUsage.percentage >= 80 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(tokenUsage.percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Concurrent Users Trend */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Concurrent Users - Last 4 Hours
        </h2>
        <div className="flex items-end space-x-1 h-32">
          {userTrend.length > 0 ? (
            userTrend.map((count, index) => {
              const maxCount = Math.max(...userTrend, 100);
              const height = (count / maxCount) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                  style={{ height: `${height}%`, minHeight: '4px' }}
                  title={`${count} users`}
                />
              );
            })
          ) : (
            <div className="w-full text-center text-gray-500">Loading trend data...</div>
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>4h ago</span>
          <span>Now</span>
        </div>
      </div>

      {/* Recent Errors */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Recent Errors (Last 10)
        </h2>
        {recentErrors.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {recentErrors.map((error) => (
              <div
                key={error.id}
                className={`p-3 rounded-lg border ${getSeverityColor(error.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold uppercase">{error.severity}</span>
                      <span className="text-xs text-gray-500">{error.error_type}</span>
                      <span className="text-xs text-gray-400">{formatTimestamp(error.recorded_at)}</span>
                    </div>
                    <p className="text-sm mt-1 text-gray-900">{error.error_message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No recent errors - system running smoothly</p>
          </div>
        )}
      </div>

      {/* System Status Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Database</span>
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600 font-medium">
              Online
            </span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Edge Functions</span>
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600 font-medium">
              Operational
            </span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">LLM API</span>
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600 font-medium">
              Connected
            </span>
          </div>
        </div>
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
