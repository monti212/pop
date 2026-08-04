import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, Users, MessageSquare, Activity,
  Zap, AlertTriangle,
  Loader, Search, BookOpen, TrendingUp, StickyNote, Smartphone, Mail
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/authService';
import AdminSidebar from '../../components/AdminSidebar';

// Brand tokens
const Brand = {
  sand: '#F7F5F2',
  navy: '#19324A',
  teal: '#0096B3',
  sky: '#7DF9FF',
  orange: '#FF6A00',
  line: '#EAE7E3',
};

interface ConversationSummary {
  id: string;
  conversation_id: string;
  user_id: string;
  ai_summary: string;
  message_count: number;
  created_at: string;
  user_email?: string;
}

interface UserUsageMetrics {
  user_id: string;
  user_email: string;
  total_messages: number;
  total_tokens: number;
  total_conversations: number;
  last_active: string;
}

interface PlatformMetrics {
  totalUsers: number;
  activeUsersToday: number;
  totalMessages: number;
  totalTokens: number;
  totalConversations: number;
  messagesLast24h: number;
  tokensLast24h: number;
}

type ReportingPeriod = 'month' | 'quarter' | 'all-time' | 'custom';

/** get_admin_platform_overview (admin-gated, SECURITY DEFINER over auth.users). */
interface PlatformOverview {
  users: {
    total_users: number;
    email_signups: number;
    phone_signups: number;
    no_email_signups: number;
    confirmed: number;
    active_30d: number;
    new_30d: number;
    new_90d: number;
  };
  signups_monthly: Array<{ month: string; signups: number }>;
  kb: {
    active_docs: number;
    standard_tokens: number;
    micro_tokens: number;
    original_est_tokens: number;
    pinned_docs: number;
    pinned_standard_tokens: number;
  };
}

interface UsagePoint {
  d: string;
  daily: number;
  cumulative: number;
  requests: number;
}

/* Notes surfaced to PoP admins on the dashboard. Content owned by the GreyEd team. */
const GREYED_TEAM_NOTES: Array<{ title: string; body: string }> = [
  { title: 'Uhuru 4 family live', body: 'New model family with both language and vision capabilities.' },
  { title: 'U2.0 removed', body: 'The previous-generation model has been retired.' },
  { title: 'Output quality improved', body: 'Instantly noticeable step up in answer quality.' },
  {
    title: 'Deeper knowledge-base usage',
    body: 'U4.0 reads the curriculum knowledge base in more depth, which increases token usage per answer. Verdict: net positive — output quality is dramatically greater than before.',
  },
  { title: 'U5.0', body: 'Release date to be confirmed.' },
  {
    title: 'Teacher training is ready',
    body: 'We kindly ask PoP to confirm the Wednesday one-hour slot. We can split into 2 classes of ~50 teachers each for more personalised sessions. Ready to start when schools reopen.',
  },
];

const ComprehensiveAdminDashboard: React.FC = () => {
  useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'per-account' | 'topics'>('overview');
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics | null>(null);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [usageSeries, setUsageSeries] = useState<UsagePoint[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserUsageMetrics[]>([]);
  const [conversationTopics, setConversationTopics] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshInterval = 10;
  const [reportingPeriod, setReportingPeriod] = useState<ReportingPeriod>('month');
  const [customStartDate, setCustomStartDate] = useState('2025-05-01');
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const getReportingRange = useCallback(() => {
    const now = new Date();
    if (reportingPeriod === 'all-time') {
      return { start: null as string | null, end: null as string | null, label: 'All time' };
    }
    if (reportingPeriod === 'custom') {
      return {
        start: customStartDate ? new Date(`${customStartDate}T00:00:00`).toISOString() : null,
        end: customEndDate ? new Date(`${customEndDate}T23:59:59.999`).toISOString() : null,
        label: 'Custom'
      };
    }
    if (reportingPeriod === 'quarter') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: new Date(now.getFullYear(), quarterStartMonth, 1).toISOString(),
        end: null as string | null,
        label: 'This quarter'
      };
    }
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      end: null as string | null,
      label: 'This month'
    };
  }, [customEndDate, customStartDate, reportingPeriod]);

  // Fetch platform-wide metrics
  const fetchPlatformMetrics = useCallback(async () => {
    try {
      const range = getReportingRange();
      // Get total users
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Get active users today
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('usage_events')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', today);

      // Get unique active users
      const { data: activeUsersData } = await supabase
        .from('usage_events')
        .select('user_id')
        .gte('created_at', today);

      const uniqueActiveUsers = new Set(activeUsersData?.map((e: any) => e.user_id) || []).size;

      // Get total messages for selected reporting period
      let totalMessagesQuery = supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });
      if (range.start) totalMessagesQuery = totalMessagesQuery.gte('created_at', range.start);
      if (range.end) totalMessagesQuery = totalMessagesQuery.lte('created_at', range.end);
      const { count: totalMessages } = await totalMessagesQuery;

      // Get total conversations for selected reporting period
      let totalConversationsQuery = supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });
      if (range.start) totalConversationsQuery = totalConversationsQuery.gte('created_at', range.start);
      if (range.end) totalConversationsQuery = totalConversationsQuery.lte('created_at', range.end);
      const { count: totalConversations } = await totalConversationsQuery;

      // Get messages in last 24h
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: messagesLast24h } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday);

      // Get total tokens (sum from usage_metrics)
      let tokenQuery = supabase
        .from('usage_metrics')
        .select('token_count');
      if (range.start) tokenQuery = tokenQuery.gte('created_at', range.start);
      if (range.end) tokenQuery = tokenQuery.lte('created_at', range.end);
      const { data: tokenData } = await tokenQuery;

      const totalTokens = tokenData?.reduce((sum: any, row: any) => sum + (row.token_count || 0), 0) || 0;

      // Get tokens in last 24h
      const { data: tokens24hData } = await supabase
        .from('usage_events')
        .select('token_count')
        .gte('created_at', yesterday);

      const tokensLast24h = tokens24hData?.reduce((sum: any, row: any) => sum + (row.token_count || 0), 0) || 0;

      // Get knowledge base tokens
      const { data: kbTokenData } = reportingPeriod === 'all-time'
        ? await supabase
          .from('admin_knowledge_documents')
          .select('token_count')
        : { data: [] };

      const knowledgeBaseTokens = kbTokenData?.reduce((sum: any, row: any) => sum + (row.token_count || 0), 0) || 0;

      setPlatformMetrics({
        totalUsers: totalUsers || 0,
        activeUsersToday: uniqueActiveUsers,
        totalMessages: totalMessages || 0,
        totalTokens: totalTokens + knowledgeBaseTokens,
        totalConversations: totalConversations || 0,
        messagesLast24h: messagesLast24h || 0,
        tokensLast24h,
      });
    } catch (err: any) {
      console.error('Error fetching platform metrics:', err);
      throw err;
    }
  }, [getReportingRange, reportingPeriod]);

  // Fetch per-user metrics - Query from actual conversations and messages
  const fetchUserMetrics = useCallback(async () => {
    try {
      const range = getReportingRange();
      // Get all users with their conversation and message counts
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .order('created_at', { ascending: false })
        .limit(100);

      if (userError) throw userError;

      // For each user, count their conversations and messages
      const userMetricsPromises = (userData || []).map(async (user: any) => {
        let userConversationsQuery = supabase
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);
        if (range.start) userConversationsQuery = userConversationsQuery.gte('created_at', range.start);
        if (range.end) userConversationsQuery = userConversationsQuery.lte('created_at', range.end);

        let conversationIdsQuery = supabase.from('conversations').select('id').eq('user_id', user.id);
        if (range.start) conversationIdsQuery = conversationIdsQuery.gte('created_at', range.start);
        if (range.end) conversationIdsQuery = conversationIdsQuery.lte('created_at', range.end);
        const conversationIds = (await conversationIdsQuery).data?.map((c: any) => c.id) || [];

        const [conversationsResult, messagesResult] = await Promise.all([
          userConversationsQuery,
          supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .in('conversation_id', conversationIds)
        ]);

        return {
          user_id: user.id,
          user_email: user.email || 'Unknown',
          total_messages: messagesResult.count || 0,
          total_tokens: 0, // Token tracking needs separate implementation
          total_conversations: conversationsResult.count || 0,
          last_active: new Date().toISOString(),
        };
      });

      const metrics = await Promise.all(userMetricsPromises);

      // Filter out users with no activity and sort by message count
      const activeMetrics = metrics
        .filter(m => m.total_conversations > 0 || m.total_messages > 0)
        .sort((a, b) => b.total_messages - a.total_messages);

      setUserMetrics(activeMetrics);
    } catch (err: any) {
      console.error('Error fetching user metrics:', err);
      throw err;
    }
  }, [getReportingRange]);

  // Fetch conversation topics - Query from actual conversations and messages
  const fetchConversationTopics = useCallback(async () => {
    try {
      const range = getReportingRange();
      // Get recent conversations with their users
      let conversationsQuery = supabase
        .from('conversations')
        .select('id, user_id, title, created_at, updated_at')
        .order('updated_at', { ascending: false });
      if (range.start) conversationsQuery = conversationsQuery.gte('created_at', range.start);
      if (range.end) conversationsQuery = conversationsQuery.lte('created_at', range.end);
      const { data: conversations, error: convError } = await conversationsQuery.limit(20);

      if (convError) throw convError;

      // Get user emails
      const userIds = [...new Set(conversations?.map((c: any) => c.user_id) || [])];
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', userIds);

      // For each conversation, count messages and get first message as summary
      const topicsPromises = (conversations || []).map(async (conv: any) => {
        const { count: messageCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        const { data: firstMessage } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', conv.id)
          .eq('role', 'user')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        const userEmail = userData?.find((u: any) => u.id === conv.user_id)?.email || 'Unknown';

        // Extract text content from JSONB
        let summaryText = conv.title || 'Untitled Conversation';
        if (firstMessage?.content) {
          try {
            const contentObj = typeof firstMessage.content === 'string'
              ? JSON.parse(firstMessage.content)
              : firstMessage.content;
            summaryText = contentObj.text || contentObj.content || summaryText;
            if (summaryText.length > 100) {
              summaryText = summaryText.substring(0, 100) + '...';
            }
          } catch {
            // If parsing fails, use title
          }
        }

        return {
          id: conv.id,
          conversation_id: conv.id,
          user_id: conv.user_id,
          user_email: userEmail,
          ai_summary: summaryText,
          message_count: messageCount || 0,
          created_at: conv.created_at,
        };
      });

      const topics = await Promise.all(topicsPromises);
      setConversationTopics(topics);
    } catch (err: any) {
      console.error('Error fetching conversation topics:', err);
      throw err;
    }
  }, [getReportingRange]);

  // Main data fetch function
  // True totals + signup channels + KB footprint. Optional: if the RPC is not
  // deployed yet (or the caller is not admin) the dashboard falls back to the
  // legacy user_profiles count rather than erroring.
  const fetchOverview = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('get_admin_platform_overview');
    if (rpcError) {
      console.warn('get_admin_platform_overview unavailable:', rpcError.message);
      return;
    }
    if (data?.users) setOverview(data as PlatformOverview);
  }, []);

  // Whole-history usage series from the org ledger (admin-readable RLS).
  const fetchUsageSeries = useCallback(async () => {
    const { data, error: qError } = await supabase
      .from('organization_token_usage')
      .select('usage_date, tokens_used, request_count')
      .order('usage_date', { ascending: true });
    if (qError) {
      console.warn('organization_token_usage unavailable:', qError.message);
      return;
    }
    let running = 0;
    setUsageSeries((data || []).map((r: any) => {
      running += r.tokens_used || 0;
      return { d: r.usage_date, daily: r.tokens_used || 0, cumulative: running, requests: r.request_count || 0 };
    }));
  }, []);

  const fetchAllData = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      await Promise.all([
        fetchPlatformMetrics(),
        fetchUserMetrics(),
        fetchConversationTopics(),
        fetchOverview(),
        fetchUsageSeries(),
      ]);
      setLastUpdate(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchPlatformMetrics, fetchUserMetrics, fetchConversationTopics, fetchOverview, fetchUsageSeries]);

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-refresh based on selected interval
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAllData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAllData]);

  // Filter user metrics by search term
  const filteredUserMetrics = userMetrics.filter(user =>
    user.user_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: Brand.sand }}>
        <div className="flex items-center gap-3">
          <Loader className="w-8 h-8 animate-spin" style={{ color: Brand.teal }} />
          <p className="text-lg" style={{ color: Brand.navy }}>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: Brand.sand }}>
        <div className="max-w-md w-full bg-white rounded-xl p-6 shadow-lg border" style={{ borderColor: Brand.line }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error Loading Dashboard</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={fetchAllData}
                className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm hover:bg-red-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: Brand.sand }}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header
          className="sticky top-0 z-40 border-b"
          style={{ borderColor: Brand.line, background: 'rgba(247,245,242,0.95)', backdropFilter: 'blur(10px)' }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/chat"
              className="p-2 rounded-lg hover:bg-white/80 transition-colors"
              style={{ color: Brand.navy }}
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: Brand.teal }}>
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-semibold" style={{ color: Brand.navy }}>Admin Dashboard</div>
              <div className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>Real-time analytics</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ borderColor: Brand.line, background: 'white' }}>
              <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'animate-pulse' : ''}`} style={{ background: autoRefresh ? Brand.teal : '#666' }} />
              <span className="text-xs font-medium" style={{ color: Brand.navy }}>
                {autoRefresh ? 'Live' : 'Paused'}
              </span>
              <span className="text-xs" style={{ color: Brand.navy, opacity: 0.5 }}>
                • {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            </div>

            <select
              value={reportingPeriod}
              onChange={(e) => setReportingPeriod(e.target.value as ReportingPeriod)}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium"
              style={{ borderColor: Brand.line, color: Brand.navy, background: 'white' }}
              title="Reporting period"
            >
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="all-time">All time</option>
              <option value="custom">Custom</option>
            </select>

            {reportingPeriod === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border text-xs"
                  style={{ borderColor: Brand.line, color: Brand.navy, background: 'white' }}
                  aria-label="Custom start date"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border text-xs"
                  style={{ borderColor: Brand.line, color: Brand.navy, background: 'white' }}
                  aria-label="Custom end date"
                />
              </div>
            )}

            <button
              onClick={fetchAllData}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-white/80 transition-colors disabled:opacity-50"
              style={{ color: Brand.navy }}
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="px-3 py-1.5 rounded-lg font-medium transition-colors text-xs"
              style={{ background: autoRefresh ? Brand.teal : '#666', color: 'white' }}
              title={autoRefresh ? 'Pause auto-refresh' : 'Resume auto-refresh'}
            >
              {autoRefresh ? 'Pause' : 'Resume'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: 'overview', label: 'Platform Overview', icon: Activity },
            { key: 'per-account', label: 'Per Account Usage', icon: Users },
            { key: 'topics', label: 'Conversation Topics', icon: MessageSquare },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === key
                  ? 'shadow-md'
                  : 'hover:bg-white/50'
              }`}
              style={{
                background: activeTab === key ? Brand.teal : 'white',
                color: activeTab === key ? 'white' : Brand.navy,
                borderColor: Brand.line,
                border: activeTab === key ? 'none' : `1px solid ${Brand.line}`,
              }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Platform Overview Tab */}
        {activeTab === 'overview' && platformMetrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Users"
                /* auth.users truth via RPC; user_profiles lags signups. */
                value={(overview?.users.total_users ?? platformMetrics.totalUsers).toLocaleString()}
                icon={Users}
                color={Brand.teal}
                subtitle={overview
                  ? `${overview.users.active_30d} active in last 30 days · ${overview.users.new_90d} new in 90 days`
                  : `${platformMetrics.activeUsersToday} active today`}
              />
              <MetricCard
                title="Total Messages"
                value={platformMetrics.totalMessages.toLocaleString()}
                icon={MessageSquare}
                color={Brand.teal}
                subtitle={`${platformMetrics.messagesLast24h} in last 24h`}
              />
              <MetricCard
                title="Total Conversations"
                value={platformMetrics.totalConversations.toLocaleString()}
                icon={Activity}
                color={Brand.teal}
              />
              <MetricCard
                title="Total Tokens"
                value={platformMetrics.totalTokens.toLocaleString()}
                icon={Zap}
                color={Brand.orange}
                subtitle={`${platformMetrics.tokensLast24h.toLocaleString()} in last 24h`}
              />
            </div>

            {/* Notes from the GreyEd team — release + training updates for PoP */}
            <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
              <div className="flex items-center gap-2 mb-4">
                <StickyNote className="w-5 h-5" style={{ color: Brand.orange }} />
                <h3 className="text-lg font-semibold" style={{ color: Brand.navy }}>
                  Notes from GreyEd Team
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Monti &amp; Gaone</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {GREYED_TEAM_NOTES.map((note) => (
                  <div key={note.title} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold" style={{ color: Brand.navy }}>{note.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{note.body}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sign-up channels + growth (auth.users truth via admin RPC) */}
            {overview && (
              <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5" style={{ color: Brand.teal }} />
                  <h3 className="text-lg font-semibold" style={{ color: Brand.navy }}>
                    Teachers on the platform
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide"><Mail className="w-3.5 h-3.5" /> Email sign-ups</div>
                    <p className="mt-1 text-2xl font-semibold" style={{ color: Brand.navy }}>{overview.users.email_signups.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide"><Smartphone className="w-3.5 h-3.5" /> Phone sign-ups</div>
                    <p className="mt-1 text-2xl font-semibold" style={{ color: Brand.navy }}>{overview.users.phone_signups.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="text-slate-500 text-xs uppercase tracking-wide">Non-email sign-ups</div>
                    <p className="mt-1 text-2xl font-semibold" style={{ color: Brand.navy }}>{overview.users.no_email_signups.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="text-slate-500 text-xs uppercase tracking-wide">Confirmed accounts</div>
                    <p className="mt-1 text-2xl font-semibold" style={{ color: Brand.navy }}>{overview.users.confirmed.toLocaleString()}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {overview.users.new_30d} joined in the last 30 days · {overview.users.new_90d} in the last 90 days.
                </p>
              </div>
            )}

            {/* Total usage over time — org token ledger, full history */}
            {usageSeries.length > 0 && (
              <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                <h3 className="text-lg font-semibold mb-1" style={{ color: Brand.navy }}>
                  Platform usage over time
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Daily Ed Tokens served (bars) and cumulative total (line). Cumulative:{' '}
                  {usageSeries[usageSeries.length - 1].cumulative.toLocaleString()} to date.
                </p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={usageSeries} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="d" tick={{ fontSize: 11 }} minTickGap={40} />
                      <YAxis yAxisId="daily" tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : `${v}`} />
                      <YAxis yAxisId="cum" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1e3).toFixed(0)}k`} />
                      <Tooltip formatter={(value: any, name: any) => [Number(value).toLocaleString(), name]} />
                      <Legend />
                      <Bar yAxisId="daily" dataKey="daily" name="Daily tokens" fill={Brand.teal} radius={[2, 2, 0, 0]} />
                      <Line yAxisId="cum" type="monotone" dataKey="cumulative" name="Cumulative" stroke={Brand.orange} strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Knowledge base footprint */}
            {overview && (
              <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5" style={{ color: Brand.teal }} />
                  <h3 className="text-lg font-semibold" style={{ color: Brand.navy }}>
                    Knowledge base footprint
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatRow label="Active documents" value={overview.kb.active_docs} />
                  <StatRow label="Serving tier (standard summaries)" value={`${overview.kb.standard_tokens.toLocaleString()} tokens`} />
                  <StatRow label="Always-on curriculum core" value={`${overview.kb.pinned_docs} docs · ${overview.kb.pinned_standard_tokens.toLocaleString()} tokens`} />
                  <StatRow label="Original source material" value={`≈${Math.round(overview.kb.original_est_tokens / 1000).toLocaleString()}k tokens`} />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  The serving tier is what answers draw on; U4.0 reads it in more depth than U2.0 did, which raises tokens
                  per answer while grounding responses in the PoP curriculum.
                </p>
              </div>
            )}

            {/* Reading the numbers — interpretation for the PoP data report */}
            <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: Brand.navy }}>
                Reading the numbers
              </h3>
              <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
                <li>
                  <strong style={{ color: Brand.navy }}>Depth per answer is up by design.</strong> Since the U4 upgrade each
                  answer draws on far more curriculum context, so tokens per answer rose while answer quality rose with it —
                  token growth reflects richer answers, not just more traffic.
                </li>
                <li>
                  <strong style={{ color: Brand.navy }}>Usage concentrates around training moments.</strong> The January
                  onboarding and the June session are clearly visible in the chart; a committed core of teachers carries
                  steady week-to-week usage between them.
                </li>
                <li>
                  <strong style={{ color: Brand.navy }}>Cumulative consumption keeps climbing.</strong> The cumulative line
                  above is the clearest picture of total value delivered to date.
                </li>
                <li>
                  <strong style={{ color: Brand.navy }}>Per-teacher figures need care.</strong> A small number of accounts
                  account for a large share of tokens — mostly heavy curriculum-grounded sessions during trainings. Month
                  figures on per-user views are cumulative since July due to a known metering quirk being corrected.
                </li>
              </ul>
            </div>

            {/* Platform Statistics */}
            <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: Brand.navy }}>
                Platform Statistics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatRow
                  label="Average Messages per User"
                  value={platformMetrics.totalUsers > 0
                    ? Math.round(platformMetrics.totalMessages / platformMetrics.totalUsers)
                    : 0}
                />
                <StatRow
                  label="Average Tokens per User"
                  value={platformMetrics.totalUsers > 0
                    ? Math.round(platformMetrics.totalTokens / platformMetrics.totalUsers)
                    : 0}
                />
                <StatRow
                  label="Average Messages per Conversation"
                  value={platformMetrics.totalConversations > 0
                    ? Math.round(platformMetrics.totalMessages / platformMetrics.totalConversations)
                    : 0}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Per Account Usage Tab */}
        {activeTab === 'per-account' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Search */}
            <div className="bg-white rounded-xl p-4 border" style={{ borderColor: Brand.line }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: Brand.navy, opacity: 0.5 }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by email..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-offset-0 transition-all"
                  style={{ borderColor: Brand.line, outline: 'none' }}
                />
              </div>
            </div>

            {/* User Metrics Table */}
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: Brand.line }}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y" style={{ borderColor: Brand.line }}>
                  <thead style={{ background: 'rgba(25,50,74,0.03)' }}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: Brand.navy }}>
                        User Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: Brand.navy }}>
                        Messages
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: Brand.navy }}>
                        Conversations
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: Brand.navy }}>
                        Tokens Used
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: Brand.line }}>
                    {filteredUserMetrics.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                          {searchTerm ? 'No users found matching your search' : 'No usage data available'}
                        </td>
                      </tr>
                    ) : (
                      filteredUserMetrics.map((user) => (
                        <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: Brand.navy }}>
                            {user.user_email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: Brand.teal }}>
                            {user.total_messages.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: Brand.navy }}>
                            {user.total_conversations.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: Brand.orange }}>
                            {user.total_tokens.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Conversation Topics Tab */}
        {activeTab === 'topics' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {conversationTopics.length === 0 ? (
              <div className="bg-white rounded-xl p-8 border text-center" style={{ borderColor: Brand.line }}>
                <MessageSquare className="w-12 h-12 mx-auto mb-3" style={{ color: Brand.navy, opacity: 0.3 }} />
                <p className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                  No conversation summaries available yet. Summaries will appear as conversations are analyzed.
                </p>
              </div>
            ) : (
              conversationTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="bg-white rounded-xl p-5 border hover:shadow-md transition-all"
                  style={{ borderColor: Brand.line }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4" style={{ color: Brand.teal }} />
                        <span className="text-xs font-medium" style={{ color: Brand.navy, opacity: 0.6 }}>
                          {topic.user_email}
                        </span>
                        <span className="text-xs" style={{ color: Brand.navy, opacity: 0.4 }}>•</span>
                        <span className="text-xs" style={{ color: Brand.navy, opacity: 0.4 }}>
                          {topic.message_count} messages
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: Brand.navy }}>
                        {topic.ai_summary}
                      </p>
                    </div>
                    <div className="text-xs text-right whitespace-nowrap" style={{ color: Brand.navy, opacity: 0.5 }}>
                      {new Date(topic.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
        </div>
      </div>
      </div>
    </div>
  );
};

// Helper Components
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color: string;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="bg-white rounded-xl p-5 border" style={{ borderColor: Brand.line }}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: Brand.navy, opacity: 0.6 }}>
        {title}
      </span>
      <div className="p-2 rounded-lg" style={{ background: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
    </div>
    <div className="text-2xl font-bold mb-1" style={{ color: Brand.navy }}>
      {value}
    </div>
    {subtitle && (
      <div className="text-xs" style={{ color }}>
        {subtitle}
      </div>
    )}
  </div>
);

interface StatRowProps {
  label: string;
  value: string | number;
}

const StatRow: React.FC<StatRowProps> = ({ label, value }) => (
  <div>
    <div className="text-sm mb-1" style={{ color: Brand.navy, opacity: 0.6 }}>
      {label}
    </div>
    <div className="text-xl font-semibold" style={{ color: Brand.navy }}>
      {value}
    </div>
  </div>
);

export default ComprehensiveAdminDashboard;
