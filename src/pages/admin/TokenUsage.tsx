import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, Zap, Users, AlertTriangle,
  Clock, Activity, Package,
  Image as ImageIcon, Plus, Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/authService';
import AdminSidebar from '../../components/AdminSidebar';

const Brand = {
  sand: '#F7F5F2',
  navy: '#19324A',
  teal: '#0096B3',
  sky: '#7DF9FF',
  orange: '#FF6A00',
  line: '#EAE7E3',
};

interface TokenMetrics {
  organization_name: string;
  total_token_cap: number;
  used_text_today: number;
  used_text_this_month: number;
  used_text_total_ytd: number;
  rollover_tokens: number;
  monthly_cap: number;
  monthly_balance: number;
  refill_balance: number;
  total_plan_balance: number;
  tokens_remaining: number;
  image_low_count: number;
  image_med_count: number;
  image_high_count: number;
  image_tokens_used: number;
  image_tokens_remaining: number;
  image_token_cap: number;
  daily_usage_percent: number;
  monthly_usage_percent: number;
  ytd_usage_percent: number;
  image_usage_percent: number;
}

interface UserTokenUsage {
  user_id: string;
  user_email: string;
  used_text_this_month: number;
  used_text_total_ytd: number;
  image_count_craft1: number;
  image_count_craft2: number;
  total_image_tokens: number;
  last_active_at: string;
}

interface TokenRefill {
  id: string;
  amount: number;
  consumed: number;
  purchased_at: string;
  expires_at: string;
  notes: string | null;
  added_by_email: string;
}

const TokenUsage: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');
  const [metrics, setMetrics] = useState<TokenMetrics | null>(null);
  const [userUsage, setUserUsage] = useState<UserTokenUsage[]>([]);
  const [refills, setRefills] = useState<TokenRefill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [, setShowAddRefillModal] = useState(false);
  const [, setShowAdjustCapModal] = useState(false);

  const isSuperAdmin = profile?.team_role === 'supa_admin';

  const fetchTokenMetrics = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_token_metrics', {
        p_organization_name: 'Pencils of Promise'
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setMetrics(data[0]);
      }
    } catch (err: any) {
      console.error('Error fetching token metrics:', err);
      throw err;
    }
  }, []);

  const fetchUserUsage = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_token_usage_details', {
        p_organization_name: 'Pencils of Promise',
        p_limit: 100
      });

      if (error) throw error;
      setUserUsage(data || []);
    } catch (err: any) {
      console.error('Error fetching user usage:', err);
      throw err;
    }
  }, []);

  const fetchRefills = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('token_refills')
        .select(`
          id,
          amount,
          consumed,
          purchased_at,
          expires_at,
          notes,
          added_by_user_id
        `)
        .eq('organization_name', 'Pencils of Promise')
        .order('expires_at', { ascending: true });

      if (error) throw error;

      const userIds = [...new Set(data?.map((r: any) => r.added_by_user_id).filter(Boolean) || [])];
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', userIds);

      const refillsWithEmails = data?.map((refill: any) => ({
        ...refill,
        added_by_email: userData?.find((u: any) => u.id === refill.added_by_user_id)?.email || 'Unknown'
      })) || [];

      setRefills(refillsWithEmails);
    } catch (err: any) {
      console.error('Error fetching refills:', err);
      throw err;
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      await Promise.all([
        fetchTokenMetrics(),
        fetchUserUsage(),
        fetchRefills()
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load token usage data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchTokenMetrics, fetchUserUsage, fetchRefills]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAllData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchAllData]);

  const filteredUserUsage = userUsage.filter(user =>
    user.user_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAlertLevel = (percentage: number): 'none' | 'warning' | 'critical' => {
    if (percentage >= 95) return 'critical';
    if (percentage >= 80) return 'warning';
    return 'none';
  };

  const monthlyAlertLevel = metrics ? getAlertLevel(metrics.monthly_usage_percent) : 'none';
  const imageAlertLevel = metrics ? getAlertLevel(metrics.image_usage_percent) : 'none';

  const expiringRefills = refills.filter(refill => {
    const daysUntilExpiry = Math.ceil(
      (new Date(refill.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0 && refill.consumed < refill.amount;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: Brand.sand }}>
        <div className="flex items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin" style={{ color: Brand.teal }} />
          <p className="text-lg" style={{ color: Brand.navy }}>Loading token usage data...</p>
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
              <h3 className="text-lg font-semibold text-red-800">Error Loading Data</h3>
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
                to="/admin"
                className="p-2 rounded-lg hover:bg-white/80 transition-colors"
                style={{ color: Brand.navy }}
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: Brand.orange }}>
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-semibold" style={{ color: Brand.navy }}>Token Usage</div>
                <div className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
                  {metrics?.organization_name || 'Organization'} - Real-time tracking
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchAllData}
                disabled={isRefreshing}
                className="p-2 rounded-lg hover:bg-white/80 transition-colors disabled:opacity-50"
                style={{ color: Brand.navy }}
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <label className="flex items-center gap-2 text-xs" style={{ color: Brand.navy }}>
                <span>Auto-refresh</span>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                  style={{ accentColor: Brand.teal }}
                />
              </label>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {/* Alerts */}
            {(monthlyAlertLevel !== 'none' || imageAlertLevel !== 'none' || expiringRefills.length > 0) && (
              <div className="mb-6 space-y-3">
                {monthlyAlertLevel === 'critical' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-800">Critical: 95% of Monthly Tokens Used</h4>
                        <p className="text-sm text-red-700 mt-1">
                          You have used {metrics?.monthly_usage_percent.toFixed(1)}% of your monthly token allocation.
                          {metrics && metrics.refill_balance > 0 && ' Using refill balance.'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {monthlyAlertLevel === 'warning' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-amber-800">Warning: 80% of Monthly Tokens Used</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          You have used {metrics?.monthly_usage_percent.toFixed(1)}% of your monthly token allocation.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {imageAlertLevel !== 'none' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <ImageIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-amber-800">Warning: Image Tokens Running Low</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          You have used {metrics?.image_usage_percent.toFixed(1)}% of your image token allocation.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {expiringRefills.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-800">
                          {expiringRefills.length} Refill{expiringRefills.length > 1 ? 's' : ''} Expiring Soon
                        </h4>
                        <p className="text-sm text-blue-700 mt-1">
                          You have token refills expiring within the next 30 days. Use them before they expire.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
              {[
                { key: 'overview', label: 'Organization Overview', icon: Activity },
                { key: 'users', label: 'Individual Users', icon: Users },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === key ? 'shadow-md' : 'hover:bg-white/50'
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

            {/* Organization Overview Tab */}
            {activeTab === 'overview' && metrics && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Token Balance Summary */}
                <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold" style={{ color: Brand.navy }}>
                      Token Balance Summary
                    </h3>
                    <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: Brand.teal, color: 'white' }}>
                      Uhuru 2.0 Default
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="text-sm mb-1" style={{ color: Brand.navy, opacity: 0.6 }}>
                        Total Token Cap
                      </div>
                      <div className="text-3xl font-bold" style={{ color: Brand.navy }}>
                        {metrics.total_token_cap.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm mb-1" style={{ color: Brand.navy, opacity: 0.6 }}>
                        Tokens Used YTD
                      </div>
                      <div className="text-3xl font-bold" style={{ color: Brand.orange }}>
                        {metrics.used_text_total_ytd.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm mb-1" style={{ color: Brand.navy, opacity: 0.6 }}>
                        Tokens Remaining
                      </div>
                      <div className="text-3xl font-bold" style={{ color: Brand.teal }}>
                        {metrics.tokens_remaining.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                        Usage Progress
                      </span>
                      <span className="text-sm font-semibold" style={{ color: Brand.navy }}>
                        {metrics.ytd_usage_percent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(metrics.ytd_usage_percent, 100)}%`,
                          background: metrics.ytd_usage_percent >= 90 ? '#ef4444' : metrics.ytd_usage_percent >= 75 ? Brand.orange : Brand.teal
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t" style={{ borderColor: Brand.line }}>
                    <p className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
                      Need more tokens? <span className="font-semibold">Contact sales for refill options</span>
                    </p>
                  </div>
                </div>

                {/* Monthly Token Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: Brand.navy }}>
                      Monthly Token Metrics
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>Used This Month</span>
                        <span className="text-lg font-bold" style={{ color: Brand.navy }}>
                          {metrics.used_text_this_month.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>Monthly Cap</span>
                        <span className="text-lg font-bold" style={{ color: Brand.navy }}>
                          {metrics.monthly_cap.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>Monthly Balance</span>
                        <span className="text-lg font-bold" style={{ color: Brand.teal }}>
                          {metrics.monthly_balance.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>Rollover from Prev Month</span>
                        <span className="text-lg font-bold" style={{ color: Brand.navy }}>
                          {metrics.rollover_tokens.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>Monthly Progress</span>
                        <span className="text-sm font-semibold" style={{ color: Brand.navy }}>
                          {metrics.monthly_usage_percent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(metrics.monthly_usage_percent, 100)}%`,
                            background: metrics.monthly_usage_percent >= 95 ? '#ef4444' : metrics.monthly_usage_percent >= 80 ? Brand.orange : Brand.teal
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: Brand.navy }}>
                      Daily Usage
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>Tokens Used Today</span>
                        <span className="text-lg font-bold" style={{ color: Brand.navy }}>
                          {metrics.used_text_today.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>Daily Limit</span>
                        <span className="text-lg font-bold" style={{ color: Brand.navy }}>
                          30,000
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>Remaining Today</span>
                        <span className="text-lg font-bold" style={{ color: Brand.teal }}>
                          {(30000 - metrics.used_text_today).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>Daily Progress</span>
                        <span className="text-sm font-semibold" style={{ color: Brand.navy }}>
                          {metrics.daily_usage_percent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(metrics.daily_usage_percent, 100)}%`,
                            background: metrics.daily_usage_percent >= 90 ? '#ef4444' : metrics.daily_usage_percent >= 75 ? Brand.orange : Brand.teal
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Generation Statistics */}
                <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: Brand.navy }}>
                    Image Generation Statistics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="text-sm mb-1" style={{ color: Brand.navy, opacity: 0.6 }}>
                        Total Images Generated
                      </div>
                      <div className="text-3xl font-bold" style={{ color: Brand.navy }}>
                        {(metrics.image_low_count + metrics.image_med_count + metrics.image_high_count).toLocaleString()}
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span style={{ color: Brand.navy, opacity: 0.6 }}>Craft-1:</span>
                          <span className="font-semibold" style={{ color: Brand.navy }}>{metrics.image_low_count.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span style={{ color: Brand.navy, opacity: 0.6 }}>Craft-2:</span>
                          <span className="font-semibold" style={{ color: Brand.navy }}>{(metrics.image_med_count + metrics.image_high_count).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm mb-1" style={{ color: Brand.navy, opacity: 0.6 }}>
                        Image Tokens Used
                      </div>
                      <div className="text-3xl font-bold" style={{ color: Brand.orange }}>
                        {metrics.image_tokens_used.toLocaleString()}
                      </div>
                      <div className="mt-2 text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
                        All images at low quality (50 tokens each)
                      </div>
                    </div>
                    <div>
                      <div className="text-sm mb-1" style={{ color: Brand.navy, opacity: 0.6 }}>
                        Image Tokens Remaining
                      </div>
                      <div className="text-3xl font-bold" style={{ color: Brand.teal }}>
                        {metrics.image_tokens_remaining.toLocaleString()}
                      </div>
                      <div className="mt-2 text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
                        Out of {metrics.image_token_cap.toLocaleString()} total
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                        Image Token Usage
                      </span>
                      <span className="text-sm font-semibold" style={{ color: Brand.navy }}>
                        {metrics.image_usage_percent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(metrics.image_usage_percent, 100)}%`,
                          background: metrics.image_usage_percent >= 90 ? '#ef4444' : metrics.image_usage_percent >= 80 ? Brand.orange : Brand.teal
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Active Refills */}
                <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold" style={{ color: Brand.navy }}>
                      Active Refills
                    </h3>
                    {isSuperAdmin && (
                      <button
                        onClick={() => setShowAddRefillModal(true)}
                        className="px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
                        style={{ background: Brand.teal, color: 'white' }}
                      >
                        <Plus className="w-4 h-4" />
                        Add Refill
                      </button>
                    )}
                  </div>

                  {metrics.refill_balance > 0 && (
                    <div className="mb-4 p-4 rounded-lg" style={{ background: `${Brand.teal}15` }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: Brand.navy }}>
                          Total Refill Balance
                        </span>
                        <span className="text-2xl font-bold" style={{ color: Brand.teal }}>
                          {metrics.refill_balance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {refills.length === 0 ? (
                    <div className="text-center py-8" style={{ color: Brand.navy, opacity: 0.6 }}>
                      <Package className="w-12 h-12 mx-auto mb-3" style={{ opacity: 0.3 }} />
                      <p className="text-sm">No refills added yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead style={{ background: 'rgba(25,50,74,0.03)' }}>
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: Brand.navy }}>
                              Amount
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: Brand.navy }}>
                              Consumed
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: Brand.navy }}>
                              Remaining
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: Brand.navy }}>
                              Purchase Date
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: Brand.navy }}>
                              Expiry Date
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: Brand.navy }}>
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: Brand.line }}>
                          {refills.map((refill) => {
                            const isExpired = new Date(refill.expires_at) < new Date();
                            const isFullyConsumed = refill.consumed >= refill.amount;
                            const daysUntilExpiry = Math.ceil(
                              (new Date(refill.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                            );
                            const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;

                            return (
                              <tr key={refill.id} className={isExpired || isFullyConsumed ? 'opacity-50' : ''}>
                                <td className="px-4 py-3 text-sm font-semibold" style={{ color: Brand.navy }}>
                                  {refill.amount.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-sm" style={{ color: Brand.orange }}>
                                  {refill.consumed.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold" style={{ color: Brand.teal }}>
                                  {(refill.amount - refill.consumed).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                                  {new Date(refill.purchased_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                                  {new Date(refill.expires_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3">
                                  {isFullyConsumed ? (
                                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                                      Consumed
                                    </span>
                                  ) : isExpired ? (
                                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                      Expired
                                    </span>
                                  ) : isExpiringSoon ? (
                                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                      Expires in {daysUntilExpiry}d
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ background: `${Brand.teal}20`, color: Brand.teal }}>
                                      Active
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Enforcement Status */}
                <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: Brand.navy }}>
                    Enforcement Status
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border" style={{ borderColor: Brand.line }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color: Brand.navy }}>Daily Limit</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          metrics.used_text_today >= 30000 ? 'bg-red-100 text-red-700' :
                          metrics.used_text_today >= 25000 ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {metrics.used_text_today >= 30000 ? 'Exceeded' : 'OK'}
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
                        {metrics.used_text_today.toLocaleString()} / 30,000 tokens
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border" style={{ borderColor: Brand.line }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color: Brand.navy }}>Per-Chat Limit</span>
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          OK
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
                        7,500 tokens per chat
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border" style={{ borderColor: Brand.line }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color: Brand.navy }}>Monthly Limit</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          metrics.used_text_this_month >= metrics.monthly_cap ? 'bg-red-100 text-red-700' :
                          metrics.used_text_this_month >= metrics.monthly_cap * 0.9 ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {metrics.used_text_this_month >= metrics.monthly_cap ?
                            (metrics.refill_balance > 0 ? 'Using Refills' : 'Exceeded') :
                            'OK'}
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
                        {metrics.used_text_this_month.toLocaleString()} / {metrics.monthly_cap.toLocaleString()} tokens
                      </div>
                    </div>
                  </div>
                </div>

                {/* Super Admin Controls */}
                {isSuperAdmin && (
                  <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: Brand.navy }}>
                      Super Admin Controls
                    </h3>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowAdjustCapModal(true)}
                        className="px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 border"
                        style={{ borderColor: Brand.line, color: Brand.navy }}
                      >
                        <Settings className="w-4 h-4" />
                        Adjust Token Cap
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Individual Users Tab */}
            {activeTab === 'users' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Search */}
                <div className="bg-white rounded-xl p-4 border" style={{ borderColor: Brand.line }}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by email..."
                    className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-offset-0 transition-all"
                    style={{ borderColor: Brand.line, outline: 'none' }}
                  />
                </div>

                {/* User Usage Table */}
                <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: Brand.line }}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y" style={{ borderColor: Brand.line }}>
                      <thead style={{ background: 'rgba(25,50,74,0.03)' }}>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: Brand.navy }}>
                            User Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: Brand.navy }}>
                            Text Tokens (Month)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: Brand.navy }}>
                            Text Tokens (YTD)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: Brand.navy }}>
                            Craft-1 Images
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: Brand.navy }}>
                            Craft-2 Images
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: Brand.navy }}>
                            Image Tokens
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: Brand.navy }}>
                            Last Active
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: Brand.line }}>
                        {filteredUserUsage.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                              {searchTerm ? 'No users found matching your search' : 'No usage data available'}
                            </td>
                          </tr>
                        ) : (
                          filteredUserUsage.map((user) => (
                            <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: Brand.navy }}>
                                {user.user_email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: Brand.teal }}>
                                {user.used_text_this_month.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: Brand.orange }}>
                                {user.used_text_total_ytd.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: Brand.navy }}>
                                {user.image_count_craft1.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: Brand.navy }}>
                                {user.image_count_craft2.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: Brand.navy, opacity: 0.8 }}>
                                {user.total_image_tokens.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                                {new Date(user.last_active_at).toLocaleDateString()}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenUsage;
