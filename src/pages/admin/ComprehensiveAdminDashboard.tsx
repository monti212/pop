import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, Users, MessageSquare, Activity, TrendingUp,
  Clock, Calendar, Zap, Database, ChevronLeft, ChevronRight, AlertTriangle,
  CheckCircle, XCircle, Loader, Eye, Search, Filter
} from 'lucide-react';
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

const ComprehensiveAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'per-account' | 'topics'>('overview');
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserUsageMetrics[]>([]);
  const [conversationTopics, setConversationTopics] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch platform-wide metrics
  const fetchPlatformMetrics = useCallback(async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Get active users today
      const today = new Date().toISOString().split('T')[0];
      const { count: activeUsersToday } = await supabase
        .from('usage_events')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', today);

      // Get unique active users
      const { data: activeUsersData } = await supabase
        .from('usage_events')
        .select('user_id')
        .gte('created_at', today);

      const uniqueActiveUsers = new Set(activeUsersData?.map(e => e.user_id) || []).size;

      // Get total messages
      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      // Get total conversations
      const { count: totalConversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });

      // Get messages in last 24h
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: messagesLast24h } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday);

      // Get total tokens (sum from usage_metrics)
      const { data: tokenData } = await supabase
        .from('usage_metrics')
        .select('token_count');

      const totalTokens = tokenData?.reduce((sum, row) => sum + (row.token_count || 0), 0) || 0;

      // Get tokens in last 24h
      const { data: tokens24hData } = await supabase
        .from('usage_events')
        .select('token_count')
        .gte('created_at', yesterday);

      const tokensLast24h = tokens24hData?.reduce((sum, row) => sum + (row.token_count || 0), 0) || 0;

      // Get knowledge base tokens
      const { data: kbTokenData } = await supabase
        .from('admin_knowledge_documents')
        .select('token_count');

      const knowledgeBaseTokens = kbTokenData?.reduce((sum, row) => sum + (row.token_count || 0), 0) || 0;

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
  }, []);

  // Fetch per-user metrics
  const fetchUserMetrics = useCallback(async () => {
    try {
      const { data: usageData, error: usageError } = await supabase
        .from('usage_metrics')
        .select(`
          user_id,
          message_count,
          token_count,
          conversation_count
        `)
        .order('message_count', { ascending: false })
        .limit(50);

      if (usageError) throw usageError;

      // Get user details
      const userIds = [...new Set(usageData?.map(u => u.user_id) || [])];
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', userIds);

      if (userError) throw userError;

      // Aggregate metrics per user
      const userMap = new Map<string, UserUsageMetrics>();

      usageData?.forEach((metric) => {
        const existing = userMap.get(metric.user_id);
        const userInfo = userData?.find(u => u.id === metric.user_id);

        if (existing) {
          existing.total_messages += metric.message_count || 0;
          existing.total_tokens += metric.token_count || 0;
          existing.total_conversations += metric.conversation_count || 0;
        } else {
          userMap.set(metric.user_id, {
            user_id: metric.user_id,
            user_email: userInfo?.email || 'Unknown',
            total_messages: metric.message_count || 0,
            total_tokens: metric.token_count || 0,
            total_conversations: metric.conversation_count || 0,
            last_active: new Date().toISOString(),
          });
        }
      });

      setUserMetrics(Array.from(userMap.values()));
    } catch (err: any) {
      console.error('Error fetching user metrics:', err);
      throw err;
    }
  }, []);

  // Fetch conversation topics
  const fetchConversationTopics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('conversation_summaries')
        .select(`
          id,
          conversation_id,
          user_id,
          ai_summary,
          message_count,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get user emails
      const userIds = [...new Set(data?.map(s => s.user_id) || [])];
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', userIds);

      const summariesWithEmails = data?.map(summary => ({
        ...summary,
        user_email: userData?.find(u => u.id === summary.user_id)?.email || 'Unknown',
      })) || [];

      setConversationTopics(summariesWithEmails);
    } catch (err: any) {
      console.error('Error fetching conversation topics:', err);
      throw err;
    }
  }, []);

  // Main data fetch function
  const fetchAllData = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      await Promise.all([
        fetchPlatformMetrics(),
        fetchUserMetrics(),
        fetchConversationTopics(),
      ]);
      setLastUpdate(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchPlatformMetrics, fetchUserMetrics, fetchConversationTopics]);

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
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              disabled={!autoRefresh}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-50"
              style={{ borderColor: Brand.line, color: Brand.navy, background: 'white' }}
            >
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>

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
                value={platformMetrics.totalUsers.toLocaleString()}
                icon={Users}
                color={Brand.teal}
                subtitle={`${platformMetrics.activeUsersToday} active today`}
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
