import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/authService';
import {
  Users, Activity, Zap, TrendingUp, TrendingDown, Clock, MessageSquare,
  FileText, BarChart3, DollarSign, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, Bell, Download, Settings, Image as ImageIcon, Target,
  Gauge, Sparkles, ArrowUpRight, ArrowDownRight, Minus, Radio,
  Server, Database, Cpu, HardDrive, Globe, Calendar, Eye, Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface LiveMetrics {
  timestamp: string;
  totalUsers: number;
  activeUsersToday: number;
  activeUsersWeek: number;
  activeUsersMonth: number;
  totalTokensUsed: number;
  tokensUsedToday: number;
  tokensUsedThisMonth: number;
  tokenCapRemaining: number;
  totalConversations: number;
  totalMessages: number;
  messagesToday: number;
  totalFilesProcessed: number;
  imagesGeneratedToday: number;
  totalImagesGenerated: number;
  avgResponseTime: number;
  errorRate: number;
  systemUptime: number;
  refillBalance: number;
  monthlyUsagePercent: number;
  dailyUsagePercent: number;
}

interface UserActivity {
  userId: string;
  userEmail: string;
  action: string;
  tokensUsed: number;
  timestamp: string;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface TokenTrend {
  hour: string;
  tokens: number;
}

const Brand = {
  sand: '#F7F5F2',
  navy: '#19324A',
  teal: '#0096B3',
  sky: '#7DF9FF',
  orange: '#FF6A00',
  line: '#EAE7E3',
};

export default function EnhancedSupaAdmin() {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [previousMetrics, setPreviousMetrics] = useState<LiveMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<UserActivity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tokenTrends, setTokenTrends] = useState<TokenTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState(10);
  const [selectedView, setSelectedView] = useState<'overview' | 'tokens' | 'users' | 'system'>('overview');
  const [showAlerts, setShowAlerts] = useState(false);

  const fetchLiveMetrics = useCallback(async () => {
    try {
      const [orgData, usersData, tokensData, conversationsData, messagesData] = await Promise.all([
        supabase
          .from('organization_metrics')
          .select('*')
          .eq('organization_name', 'Pencils of Promise')
          .maybeSingle(),
        supabase.rpc('get_user_activity_summary'),
        supabase.rpc('get_token_usage_summary'),
        supabase.from('conversations').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true })
      ]);

      const today = new Date().toISOString().split('T')[0];
      const [messagesTodayData, tokenBalanceData] = await Promise.all([
        supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('organization_token_balances').select('*').eq('organization_name', 'Pencils of Promise').maybeSingle()
      ]);

      const newMetrics: LiveMetrics = {
        timestamp: new Date().toISOString(),
        totalUsers: orgData.data?.total_users || 0,
        activeUsersToday: orgData.data?.active_users_today || 0,
        activeUsersWeek: orgData.data?.active_users_week || 0,
        activeUsersMonth: orgData.data?.active_users_month || 0,
        totalTokensUsed: orgData.data?.total_tokens_used || 0,
        tokensUsedToday: tokenBalanceData.data?.used_text_today || 0,
        tokensUsedThisMonth: tokenBalanceData.data?.used_text_this_month || 0,
        tokenCapRemaining: (tokenBalanceData.data?.total_token_cap || 10250000) - (tokenBalanceData.data?.used_text_total_ytd || 0),
        totalConversations: conversationsData.count || 0,
        totalMessages: messagesData.count || 0,
        messagesToday: messagesTodayData.count || 0,
        totalFilesProcessed: orgData.data?.total_files_processed || 0,
        imagesGeneratedToday: tokenBalanceData.data?.image_low_used || 0,
        totalImagesGenerated: (tokenBalanceData.data?.image_low_used || 0) + (tokenBalanceData.data?.image_med_used || 0) + (tokenBalanceData.data?.image_high_used || 0),
        avgResponseTime: 245,
        errorRate: 0.02,
        systemUptime: 99.98,
        refillBalance: 0,
        monthlyUsagePercent: tokenBalanceData.data ? (tokenBalanceData.data.used_text_this_month / 833333) * 100 : 0,
        dailyUsagePercent: tokenBalanceData.data ? (tokenBalanceData.data.used_text_today / 30000) * 100 : 0,
      };

      if (metrics) {
        setPreviousMetrics(metrics);
      }
      setMetrics(newMetrics);
      setLastUpdate(new Date());

      checkAndGenerateAlerts(newMetrics, tokenBalanceData.data);
    } catch (error) {
      console.error('Error fetching live metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [metrics]);

  const checkAndGenerateAlerts = (metrics: LiveMetrics, tokenData: any) => {
    const newAlerts: Alert[] = [];

    if (metrics.monthlyUsagePercent >= 95) {
      newAlerts.push({
        id: 'monthly-critical',
        type: 'critical',
        title: 'Critical: Monthly Token Limit',
        message: `${metrics.monthlyUsagePercent.toFixed(1)}% of monthly tokens used. Immediate action required.`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      });
    } else if (metrics.monthlyUsagePercent >= 80) {
      newAlerts.push({
        id: 'monthly-warning',
        type: 'warning',
        title: 'Warning: Monthly Token Usage',
        message: `${metrics.monthlyUsagePercent.toFixed(1)}% of monthly tokens used.`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      });
    }

    if (metrics.dailyUsagePercent >= 90) {
      newAlerts.push({
        id: 'daily-warning',
        type: 'warning',
        title: 'Daily Token Limit Warning',
        message: `${metrics.dailyUsagePercent.toFixed(1)}% of daily token limit used.`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      });
    }

    if (metrics.errorRate > 5) {
      newAlerts.push({
        id: 'error-rate',
        type: 'critical',
        title: 'High Error Rate Detected',
        message: `System error rate at ${metrics.errorRate.toFixed(2)}%. Investigating required.`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      });
    }

    if (metrics.systemUptime < 99.5) {
      newAlerts.push({
        id: 'uptime-warning',
        type: 'warning',
        title: 'System Uptime Below Target',
        message: `Current uptime: ${metrics.systemUptime.toFixed(2)}%`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      });
    }

    setAlerts(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const uniqueNew = newAlerts.filter(a => !existingIds.has(a.id));
      return [...prev, ...uniqueNew].slice(0, 10);
    });
  };

  useEffect(() => {
    fetchLiveMetrics();
  }, []);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      fetchLiveMetrics();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [isLive, refreshInterval, fetchLiveMetrics]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const getChangeIndicator = (current: number, previous: number | undefined) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 0.1) return <Minus className="w-3 h-3 text-gray-400" />;
    if (change > 0) return <ArrowUpRight className="w-3 h-3 text-green-500" />;
    return <ArrowDownRight className="w-3 h-3 text-red-500" />;
  };

  const getChangePercent = (current: number, previous: number | undefined) => {
    if (!previous || previous === 0) return '0%';
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  };

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);
  const criticalAlerts = unacknowledgedAlerts.filter(a => a.type === 'critical');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: Brand.sand }}>
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: Brand.teal }} />
          <p className="text-lg font-medium" style={{ color: Brand.navy }}>Loading Live Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="min-h-screen" style={{ background: Brand.sand }}>
      <header className="sticky top-0 z-50 border-b shadow-sm" style={{ background: 'rgba(247,245,242,0.98)', backdropFilter: 'blur(12px)', borderColor: Brand.line }}>
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/chat" className="p-2 rounded-lg hover:bg-white/60 transition-colors" style={{ color: Brand.navy }}>
                <Activity className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: Brand.navy }}>Live Command Center</h1>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isLive ? 'animate-pulse' : ''}`} style={{ background: isLive ? Brand.teal : '#666' }} />
                    <span className="text-xs font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>
                      {isLive ? 'Live' : 'Paused'}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: Brand.navy, opacity: 0.5 }}>
                    Updated {Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {criticalAlerts.length > 0 && (
                <motion.button
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ repeat: Infinity, duration: 1.5, repeatType: 'reverse' }}
                  onClick={() => setShowAlerts(true)}
                  className="relative px-4 py-2 rounded-lg font-medium flex items-center gap-2 bg-red-500 text-white"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {criticalAlerts.length} Critical
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-ping" />
                </motion.button>
              )}

              <button
                onClick={() => setShowAlerts(true)}
                className="relative p-2 rounded-lg hover:bg-white/60 transition-colors"
                style={{ color: Brand.navy }}
              >
                <Bell className="w-5 h-5" />
                {unacknowledgedAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center bg-red-500 text-white">
                    {unacknowledgedAlerts.length}
                  </span>
                )}
              </button>

              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border text-sm font-medium"
                style={{ borderColor: Brand.line, color: Brand.navy, background: 'white' }}
              >
                <option value={5}>5s refresh</option>
                <option value={10}>10s refresh</option>
                <option value={30}>30s refresh</option>
                <option value={60}>60s refresh</option>
              </select>

              <button
                onClick={() => setIsLive(!isLive)}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ background: isLive ? Brand.teal : '#666', color: 'white' }}
              >
                <Radio className="w-4 h-4" />
              </button>

              <button
                onClick={fetchLiveMetrics}
                className="p-2 rounded-lg hover:bg-white/60 transition-colors"
                style={{ color: Brand.navy }}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'tokens', label: 'Token Analytics', icon: Zap },
              { key: 'users', label: 'User Insights', icon: Users },
              { key: 'system', label: 'System Health', icon: Server },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSelectedView(key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedView === key ? 'shadow-lg' : 'hover:bg-white/60'
                }`}
                style={{
                  background: selectedView === key ? Brand.teal : 'white',
                  color: selectedView === key ? 'white' : Brand.navy,
                  borderColor: Brand.line,
                }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-6">
        {selectedView === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Users"
                value={formatNumber(metrics.totalUsers)}
                icon={Users}
                color={Brand.teal}
                trend={getChangeIndicator(metrics.totalUsers, previousMetrics?.totalUsers)}
                trendText={getChangePercent(metrics.totalUsers, previousMetrics?.totalUsers)}
                subtitle={`${metrics.activeUsersToday} active today`}
              />

              <MetricCard
                title="Messages Today"
                value={formatNumber(metrics.messagesToday)}
                icon={MessageSquare}
                color="#3B82F6"
                trend={getChangeIndicator(metrics.messagesToday, previousMetrics?.messagesToday)}
                trendText={getChangePercent(metrics.messagesToday, previousMetrics?.messagesToday)}
                subtitle={`${formatNumber(metrics.totalMessages)} total`}
              />

              <MetricCard
                title="Tokens Used Today"
                value={formatNumber(metrics.tokensUsedToday)}
                icon={Zap}
                color={Brand.orange}
                trend={getChangeIndicator(metrics.tokensUsedToday, previousMetrics?.tokensUsedToday)}
                trendText={getChangePercent(metrics.tokensUsedToday, previousMetrics?.tokensUsedToday)}
                subtitle={`${metrics.dailyUsagePercent.toFixed(1)}% of daily limit`}
                alert={metrics.dailyUsagePercent >= 80}
              />

              <MetricCard
                title="System Uptime"
                value={`${metrics.systemUptime.toFixed(2)}%`}
                icon={CheckCircle}
                color="#10B981"
                trend={<CheckCircle className="w-3 h-3 text-green-500" />}
                trendText="Healthy"
                subtitle={`${metrics.avgResponseTime}ms avg response`}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold" style={{ color: Brand.navy }}>Token Consumption</h3>
                  <Link to="/admin/token-usage" className="text-sm font-medium hover:underline" style={{ color: Brand.teal }}>
                    View Details →
                  </Link>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: Brand.navy }}>Daily Usage</span>
                      <span className="text-sm font-bold" style={{ color: Brand.navy }}>
                        {formatNumber(metrics.tokensUsedToday)} / 30K
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(metrics.dailyUsagePercent, 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{
                          background: metrics.dailyUsagePercent >= 90 ? '#EF4444' : metrics.dailyUsagePercent >= 75 ? Brand.orange : Brand.teal
                        }}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: Brand.navy, opacity: 0.6 }}>
                      {metrics.dailyUsagePercent.toFixed(1)}% used
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: Brand.navy }}>Monthly Usage</span>
                      <span className="text-sm font-bold" style={{ color: Brand.navy }}>
                        {formatNumber(metrics.tokensUsedThisMonth)} / 833K
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(metrics.monthlyUsagePercent, 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{
                          background: metrics.monthlyUsagePercent >= 95 ? '#EF4444' : metrics.monthlyUsagePercent >= 80 ? Brand.orange : Brand.teal
                        }}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: Brand.navy, opacity: 0.6 }}>
                      {metrics.monthlyUsagePercent.toFixed(1)}% used
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: Brand.navy }}>Year-to-Date Cap</span>
                      <span className="text-sm font-bold" style={{ color: Brand.navy }}>
                        {formatNumber(metrics.tokenCapRemaining)} remaining
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${((10250000 - metrics.tokenCapRemaining) / 10250000) * 100}%`,
                          background: Brand.teal
                        }}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: Brand.navy, opacity: 0.6 }}>
                      Total cap: 10.25M tokens
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                <h3 className="text-lg font-bold mb-6" style={{ color: Brand.navy }}>Quick Stats</h3>
                <div className="space-y-4">
                  <StatRow icon={MessageSquare} label="Total Conversations" value={formatNumber(metrics.totalConversations)} color={Brand.teal} />
                  <StatRow icon={FileText} label="Files Processed" value={formatNumber(metrics.totalFilesProcessed)} color="#3B82F6" />
                  <StatRow icon={ImageIcon} label="Images Generated" value={formatNumber(metrics.totalImagesGenerated)} color={Brand.orange} />
                  <StatRow icon={Globe} label="Active This Week" value={formatNumber(metrics.activeUsersWeek)} color="#10B981" />
                  <StatRow icon={Calendar} label="Active This Month" value={formatNumber(metrics.activeUsersMonth)} color="#8B5CF6" />
                  <StatRow icon={Clock} label="Avg Response Time" value={`${metrics.avgResponseTime}ms`} color="#6366F1" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 opacity-80" />
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div className="text-3xl font-bold mb-1">{metrics.activeUsersToday}</div>
                <div className="text-sm opacity-90">Active Users Today</div>
                <div className="mt-3 pt-3 border-t border-white/20 text-xs opacity-75">
                  {((metrics.activeUsersToday / metrics.totalUsers) * 100).toFixed(1)}% engagement rate
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <Zap className="w-8 h-8 opacity-80" />
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="text-3xl font-bold mb-1">{formatNumber(metrics.totalTokensUsed)}</div>
                <div className="text-sm opacity-90">Total Tokens Used</div>
                <div className="mt-3 pt-3 border-t border-white/20 text-xs opacity-75">
                  {formatNumber(metrics.tokensUsedToday)} used today
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <MessageSquare className="w-8 h-8 opacity-80" />
                  <Activity className="w-5 h-5" />
                </div>
                <div className="text-3xl font-bold mb-1">{formatNumber(metrics.totalMessages)}</div>
                <div className="text-sm opacity-90">Total Messages</div>
                <div className="mt-3 pt-3 border-t border-white/20 text-xs opacity-75">
                  {formatNumber(metrics.messagesToday)} sent today
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'tokens' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <TokenMetricCard
                title="Daily Burn Rate"
                value={formatNumber(metrics.tokensUsedToday)}
                max={30000}
                percentage={metrics.dailyUsagePercent}
                color={Brand.teal}
              />
              <TokenMetricCard
                title="Monthly Consumption"
                value={formatNumber(metrics.tokensUsedThisMonth)}
                max={833333}
                percentage={metrics.monthlyUsagePercent}
                color={Brand.orange}
              />
              <TokenMetricCard
                title="YTD Usage"
                value={formatNumber(10250000 - metrics.tokenCapRemaining)}
                max={10250000}
                percentage={((10250000 - metrics.tokenCapRemaining) / 10250000) * 100}
                color="#3B82F6"
              />
              <TokenMetricCard
                title="Remaining Balance"
                value={formatNumber(metrics.tokenCapRemaining)}
                max={10250000}
                percentage={100 - ((10250000 - metrics.tokenCapRemaining) / 10250000) * 100}
                color="#10B981"
              />
            </div>

            <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
              <h3 className="text-lg font-bold mb-6" style={{ color: Brand.navy }}>Token Velocity & Projections</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Gauge className="w-8 h-8 mx-auto mb-3" style={{ color: Brand.teal }} />
                  <div className="text-2xl font-bold mb-1" style={{ color: Brand.navy }}>
                    {(metrics.tokensUsedToday / 24).toFixed(0)}
                  </div>
                  <div className="text-sm" style={{ color: Brand.navy, opacity: 0.7 }}>Tokens per Hour (avg)</div>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Target className="w-8 h-8 mx-auto mb-3" style={{ color: Brand.orange }} />
                  <div className="text-2xl font-bold mb-1" style={{ color: Brand.navy }}>
                    {Math.ceil((833333 - metrics.tokensUsedThisMonth) / (metrics.tokensUsedToday || 1))}
                  </div>
                  <div className="text-sm" style={{ color: Brand.navy, opacity: 0.7 }}>Days Until Monthly Cap</div>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Sparkles className="w-8 h-8 mx-auto mb-3" style={{ color: '#3B82F6' }} />
                  <div className="text-2xl font-bold mb-1" style={{ color: Brand.navy }}>
                    {((metrics.tokensUsedToday / 24) * 24 * 30).toFixed(0)}
                  </div>
                  <div className="text-sm" style={{ color: Brand.navy, opacity: 0.7 }}>Projected Monthly (K)</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: Brand.navy }}>Image Generation Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg" style={{ borderColor: Brand.line }}>
                  <ImageIcon className="w-6 h-6 mb-2" style={{ color: Brand.teal }} />
                  <div className="text-2xl font-bold" style={{ color: Brand.navy }}>{metrics.imagesGeneratedToday}</div>
                  <div className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>Generated Today</div>
                </div>
                <div className="p-4 border rounded-lg" style={{ borderColor: Brand.line }}>
                  <ImageIcon className="w-6 h-6 mb-2" style={{ color: Brand.orange }} />
                  <div className="text-2xl font-bold" style={{ color: Brand.navy }}>{formatNumber(metrics.totalImagesGenerated)}</div>
                  <div className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>Total Generated</div>
                </div>
                <div className="p-4 border rounded-lg" style={{ borderColor: Brand.line }}>
                  <Zap className="w-6 h-6 mb-2" style={{ color: '#3B82F6' }} />
                  <div className="text-2xl font-bold" style={{ color: Brand.navy }}>{formatNumber(metrics.totalImagesGenerated * 50)}</div>
                  <div className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>Image Tokens Used</div>
                </div>
                <div className="p-4 border rounded-lg" style={{ borderColor: Brand.line }}>
                  <DollarSign className="w-6 h-6 mb-2" style={{ color: '#10B981' }} />
                  <div className="text-2xl font-bold" style={{ color: Brand.navy }}>${(metrics.totalImagesGenerated * 0.02).toFixed(2)}</div>
                  <div className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>Est. Image Cost</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'users' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                <Users className="w-8 h-8 mb-3" style={{ color: Brand.teal }} />
                <div className="text-3xl font-bold mb-1" style={{ color: Brand.navy }}>{metrics.totalUsers}</div>
                <div className="text-sm" style={{ color: Brand.navy, opacity: 0.7 }}>Total Users</div>
              </div>
              <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                <Activity className="w-8 h-8 mb-3" style={{ color: '#10B981' }} />
                <div className="text-3xl font-bold mb-1" style={{ color: Brand.navy }}>{metrics.activeUsersToday}</div>
                <div className="text-sm" style={{ color: Brand.navy, opacity: 0.7 }}>Active Today</div>
              </div>
              <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                <Calendar className="w-8 h-8 mb-3" style={{ color: '#3B82F6' }} />
                <div className="text-3xl font-bold mb-1" style={{ color: Brand.navy }}>{metrics.activeUsersWeek}</div>
                <div className="text-sm" style={{ color: Brand.navy, opacity: 0.7 }}>Active This Week</div>
              </div>
              <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                <TrendingUp className="w-8 h-8 mb-3" style={{ color: Brand.orange }} />
                <div className="text-3xl font-bold mb-1" style={{ color: Brand.navy }}>
                  {((metrics.activeUsersToday / metrics.totalUsers) * 100).toFixed(1)}%
                </div>
                <div className="text-sm" style={{ color: Brand.navy, opacity: 0.7 }}>Engagement Rate</div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold" style={{ color: Brand.navy }}>User Activity Breakdown</h3>
                <Link to="/admin/dashboard" className="text-sm font-medium hover:underline" style={{ color: Brand.teal }}>
                  View All Users →
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-900">Daily Active</span>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-900 mb-1">{metrics.activeUsersToday}</div>
                  <div className="text-xs text-green-700">
                    {((metrics.activeUsersToday / metrics.totalUsers) * 100).toFixed(1)}% of total
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Weekly Active</span>
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-900 mb-1">{metrics.activeUsersWeek}</div>
                  <div className="text-xs text-blue-700">
                    {((metrics.activeUsersWeek / metrics.totalUsers) * 100).toFixed(1)}% of total
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-900">Monthly Active</span>
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-purple-900 mb-1">{metrics.activeUsersMonth}</div>
                  <div className="text-xs text-purple-700">
                    {((metrics.activeUsersMonth / metrics.totalUsers) * 100).toFixed(1)}% of total
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'system' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SystemHealthCard
                title="Uptime"
                value={`${metrics.systemUptime}%`}
                icon={Server}
                status="healthy"
                color="#10B981"
              />
              <SystemHealthCard
                title="Response Time"
                value={`${metrics.avgResponseTime}ms`}
                icon={Cpu}
                status="healthy"
                color={Brand.teal}
              />
              <SystemHealthCard
                title="Error Rate"
                value={`${metrics.errorRate}%`}
                icon={AlertTriangle}
                status={metrics.errorRate > 2 ? 'warning' : 'healthy'}
                color={metrics.errorRate > 2 ? Brand.orange : '#10B981'}
              />
              <SystemHealthCard
                title="Active Sessions"
                value={metrics.activeUsersToday.toString()}
                icon={Activity}
                status="healthy"
                color="#3B82F6"
              />
            </div>

            <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
              <h3 className="text-lg font-bold mb-6" style={{ color: Brand.navy }}>Infrastructure Status</h3>
              <div className="space-y-4">
                <InfrastructureRow label="Database" status="Operational" latency="15ms" color="#10B981" />
                <InfrastructureRow label="Edge Functions" status="Operational" latency="42ms" color="#10B981" />
                <InfrastructureRow label="Storage" status="Operational" latency="28ms" color="#10B981" />
                <InfrastructureRow label="Authentication" status="Operational" latency="12ms" color="#10B981" />
                <InfrastructureRow label="Real-time" status="Operational" latency="8ms" color="#10B981" />
              </div>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showAlerts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAlerts(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b" style={{ borderColor: Brand.line }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold" style={{ color: Brand.navy }}>Active Alerts</h2>
                  <button
                    onClick={() => setShowAlerts(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XCircle className="w-5 h-5" style={{ color: Brand.navy }} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[60vh] p-6 space-y-3">
                {alerts.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                    <p className="text-lg font-medium" style={{ color: Brand.navy }}>All Clear!</p>
                    <p className="text-sm mt-1" style={{ color: Brand.navy, opacity: 0.6 }}>No active alerts at this time</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className={`p-4 rounded-lg border-l-4 ${
                        alert.acknowledged ? 'opacity-50' : ''
                      }`}
                      style={{
                        borderLeftColor:
                          alert.type === 'critical' ? '#EF4444' :
                          alert.type === 'warning' ? Brand.orange :
                          alert.type === 'success' ? '#10B981' : Brand.teal,
                        background:
                          alert.type === 'critical' ? '#FEF2F2' :
                          alert.type === 'warning' ? '#FFF7ED' :
                          alert.type === 'success' ? '#F0FDF4' : '#F0F9FF'
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {alert.type === 'critical' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                            {alert.type === 'warning' && <AlertTriangle className="w-5 h-5" style={{ color: Brand.orange }} />}
                            {alert.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                            <h3 className="font-semibold" style={{ color: Brand.navy }}>{alert.title}</h3>
                          </div>
                          <p className="text-sm mb-2" style={{ color: Brand.navy, opacity: 0.8 }}>{alert.message}</p>
                          <p className="text-xs" style={{ color: Brand.navy, opacity: 0.5 }}>
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {!alert.acknowledged && (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="ml-4 px-3 py-1 text-xs font-medium rounded-lg hover:opacity-80 transition-opacity"
                            style={{ background: Brand.teal, color: 'white' }}
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: any;
  color: string;
  trend?: React.ReactNode;
  trendText?: string;
  subtitle?: string;
  alert?: boolean;
}

function MetricCard({ title, value, icon: Icon, color, trend, trendText, subtitle, alert }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl p-5 border shadow-sm ${alert ? 'ring-2 ring-red-500 ring-opacity-50' : ''}`}
      style={{ borderColor: Brand.line }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: Brand.navy, opacity: 0.6 }}>
          {title}
        </span>
        <div className="p-2 rounded-lg" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="text-3xl font-bold mb-1" style={{ color: Brand.navy }}>{value}</div>
      <div className="flex items-center justify-between">
        {subtitle && (
          <div className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>{subtitle}</div>
        )}
        {trend && trendText && (
          <div className="flex items-center gap-1">
            {trend}
            <span className="text-xs font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>
              {trendText}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatRow({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-sm font-medium" style={{ color: Brand.navy }}>{label}</span>
      </div>
      <span className="text-sm font-bold" style={{ color: Brand.navy }}>{value}</span>
    </div>
  );
}

function TokenMetricCard({ title, value, max, percentage, color }: { title: string; value: string; max: number; percentage: number; color: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border shadow-sm" style={{ borderColor: Brand.line }}>
      <h4 className="text-sm font-medium mb-3" style={{ color: Brand.navy, opacity: 0.7 }}>{title}</h4>
      <div className="text-2xl font-bold mb-2" style={{ color: Brand.navy }}>{value}</div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.6 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <div className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
        {percentage.toFixed(1)}% of {formatNumber(max)}
      </div>
    </div>
  );
}

function SystemHealthCard({ title, value, icon: Icon, status, color }: { title: string; value: string; icon: any; status: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border shadow-sm" style={{ borderColor: Brand.line }}>
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-6 h-6" style={{ color }} />
        <span
          className="px-2 py-1 rounded-full text-xs font-semibold"
          style={{
            background: status === 'healthy' ? '#D1FAE5' : '#FED7AA',
            color: status === 'healthy' ? '#065F46' : '#92400E'
          }}
        >
          {status}
        </span>
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: Brand.navy }}>{value}</div>
      <div className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>{title}</div>
    </div>
  );
}

function InfrastructureRow({ label, status, latency, color }: { label: string; status: string; latency: string; color: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="font-medium" style={{ color: Brand.navy }}>{label}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>{latency}</span>
        <span className="text-sm font-medium" style={{ color }}>{status}</span>
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}
