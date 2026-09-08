import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, Zap, Users, AlertTriangle,
  Clock, Activity, Package,
  Image as ImageIcon, Plus, CalendarDays, Layers3, Gauge, Printer
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
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

const DAILY_LIMIT = 1_000_000;

// Quota/usage counters are denominated in CREDITS (raw_tokens x model.credit_weight).
// U4.0 = 1.0, U4.3 = 2.5. Legacy pre-metering rows have weight 1.0, so historical
// numbers are unchanged 1:1. Cost figures below use RAW tokens; quota uses CREDITS.

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
  /** SUM(amount) of unexpired refills still positive after netting overage — the balance denominator. */
  active_refill_pool: number;
  /** Plan cap + every token_purchase_history row: everything the org has ever bought. */
  lifetime_purchased: number;
  /** tokens_remaining as a % of active_refill_pool (falls back to cap when no refills). */
  remaining_percent: number;
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

interface TokenPurchaseHistory {
  id: string;
  organization_name: string;
  purchase_date: string;
  tokens_purchased: number;
  amount_paid: number;
  currency: string;
  notes: string | null;
  created_at: string;
}

// Per-model breakdown (get_model_usage_breakdown) + cache effectiveness (get_cache_effectiveness).
// Postgres numeric/bigint can arrive as strings via PostgREST, so coerce with Number() at render.
interface ModelUsageRow {
  model_key: string;
  display_name: string;
  category: string;
  credit_weight: number | string;
  request_count: number | string;
  raw_tokens: number | string;
  credits_charged: number | string;
  unique_users: number | string;
}

interface CacheStatRow {
  model_key: string;
  request_count: number | string;
  raw_tokens: number | string;
  cached_tokens: number | string;
  cache_hit_rate: number | string;
  credits_charged: number | string;
  credits_saved: number | string;
}

const TokenUsage: React.FC = () => {
  const location = useLocation();
  const { profile } = useAuth();
  const organizationName = profile?.organization_name || 'Pencils of Promise';
  const isSupaAdminView = location.pathname.startsWith('/supa-admin');
  const canEdit = isSupaAdminView && profile?.team_role === 'supa_admin';
  // Stored quota counters are already the canonical display scale. The previous admin formatter
  // multiplied these values by 100, which inflated every Ed Token limit and usage figure.
  const isEd = !isSupaAdminView;
  const unit = isEd ? 'Ed Tokens' : 'Credits';
  const fmtU = (value: number) => Number(value || 0).toLocaleString();
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');
  const [metrics, setMetrics] = useState<TokenMetrics | null>(null);
  const [userUsage, setUserUsage] = useState<UserTokenUsage[]>([]);
  const [refills, setRefills] = useState<TokenRefill[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<TokenPurchaseHistory[]>([]);
  const [modelBreakdown, setModelBreakdown] = useState<ModelUsageRow[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStatRow[]>([]);
  const [defaultModelName, setDefaultModelName] = useState<string>('U4.0');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddRefillModal, setShowAddRefillModal] = useState(false);
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [isSubmittingRefill, setIsSubmittingRefill] = useState(false);
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
  const [refillForm, setRefillForm] = useState({
    amount: '',
    expiresAt: '',
    notes: ''
  });
  const [purchaseForm, setPurchaseForm] = useState({
    purchaseDate: '',
    tokensPurchased: '',
    amountPaid: '',
    currency: 'USD',
    notes: ''
  });

  const fetchTokenMetrics = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_token_metrics', {
        p_organization_name: organizationName
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setMetrics(data[0]);
      }
    } catch (err: any) {
      console.error('Error fetching token metrics:', err);
      throw err;
    }
  }, [organizationName]);

  const fetchUserUsage = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_token_usage_details', {
        p_organization_name: organizationName,
        p_limit: 100
      });

      if (error) throw error;
      setUserUsage(data || []);
    } catch (err: any) {
      console.error('Error fetching user usage:', err);
      throw err;
    }
  }, [organizationName]);

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
        .eq('organization_name', organizationName)
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
  }, [organizationName]);

  const fetchPurchaseHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('token_purchase_history')
        .select('*')
        .eq('organization_name', organizationName)
        .order('purchase_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchaseHistory(data || []);
    } catch (err: any) {
      console.error('Error fetching purchase history:', err);
      throw err;
    }
  }, [organizationName]);

  const fetchModelBreakdown = useCallback(async () => {
    // Non-critical: never let this reject fetchAllData — swallow errors and keep empty state.
    try {
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [breakdownRes, cacheRes, registryRes] = await Promise.all([
        supabase.rpc('get_model_usage_breakdown', { p_organization_name: organizationName, p_since: since30d }),
        supabase.rpc('get_cache_effectiveness', { p_organization_name: organizationName, p_since: since7d }),
        supabase.from('uhuru_model_registry').select('display_name').eq('is_default', true).maybeSingle(),
      ]);
      setModelBreakdown((breakdownRes.data as ModelUsageRow[]) || []);
      setCacheStats((cacheRes.data as CacheStatRow[]) || []);
      if (registryRes.data?.display_name) setDefaultModelName(registryRes.data.display_name);
    } catch (err) {
      console.error('Error fetching model breakdown / cache stats:', err);
    }
  }, [organizationName]);

  const fetchAllData = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      await Promise.all([
        fetchTokenMetrics(),
        fetchUserUsage(),
        fetchRefills(),
        fetchPurchaseHistory(),
        fetchModelBreakdown()
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load token usage data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchTokenMetrics, fetchUserUsage, fetchRefills, fetchPurchaseHistory, fetchModelBreakdown]);

  const handleAddTokens = useCallback(async () => {
    if (!canEdit || isSubmittingRefill) return;

    const amount = Number(refillForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Please enter a valid token amount to add.');
      return;
    }

    if (!refillForm.expiresAt) {
      setError('Please select an expiry date.');
      return;
    }

    setIsSubmittingRefill(true);
    setError(null);
    try {
      const expiresAt = new Date(`${refillForm.expiresAt}T23:59:59Z`).toISOString();
      const { error } = await supabase.rpc('add_token_refill', {
        p_organization_name: organizationName,
        p_amount: amount,
        p_expires_at: expiresAt,
        p_notes: refillForm.notes || null
      });

      if (error) throw error;

      setShowAddRefillModal(false);
      setRefillForm({ amount: '', expiresAt: '', notes: '' });
      await fetchAllData();
    } catch (err: any) {
      setError(err.message || 'Failed to add tokens');
    } finally {
      setIsSubmittingRefill(false);
    }
  }, [canEdit, isSubmittingRefill, refillForm, organizationName, fetchAllData]);

  const handleAddPurchaseHistory = useCallback(async () => {
    if (!canEdit || isSubmittingPurchase) return;

    const tokensPurchased = Number(purchaseForm.tokensPurchased);
    const amountPaid = Number(purchaseForm.amountPaid);

    if (!purchaseForm.purchaseDate) {
      setError('Please choose a purchase date.');
      return;
    }

    if (!Number.isFinite(tokensPurchased) || tokensPurchased <= 0) {
      setError('Please enter a valid purchased token amount.');
      return;
    }

    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      setError('Please enter a valid paid amount.');
      return;
    }

    setIsSubmittingPurchase(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('token_purchase_history')
        .insert({
          organization_name: organizationName,
          purchase_date: purchaseForm.purchaseDate,
          tokens_purchased: tokensPurchased,
          amount_paid: amountPaid,
          currency: purchaseForm.currency,
          notes: purchaseForm.notes || null
        });

      if (error) throw error;

      setShowAddPurchaseModal(false);
      setPurchaseForm({
        purchaseDate: '',
        tokensPurchased: '',
        amountPaid: '',
        currency: 'USD',
        notes: ''
      });
      await fetchAllData();
    } catch (err: any) {
      setError(err.message || 'Failed to add purchase history record');
    } finally {
      setIsSubmittingPurchase(false);
    }
  }, [canEdit, isSubmittingPurchase, purchaseForm, organizationName, fetchAllData]);

  const handlePrintReport = useCallback(() => {
    window.print();
  }, []);

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
  const startingTokenPool = metrics
    ? Math.max(metrics.total_token_cap || 0, metrics.lifetime_purchased || 0, metrics.active_refill_pool || 0)
    : 0;
  const tokenPercentLeft = metrics && startingTokenPool > 0
    ? Math.min(Math.max((metrics.tokens_remaining / startingTokenPool) * 100, 0), 100)
    : 0;
  const reportGeneratedAt = new Date().toLocaleString();
  const userUsageSummary = userUsage.reduce(
    (summary, user) => ({
      userContacts: summary.userContacts + 1,
      textTokensThisMonth: summary.textTokensThisMonth + Number(user.used_text_this_month || 0),
      textTokensYtd: summary.textTokensYtd + Number(user.used_text_total_ytd || 0),
      craft1Images: summary.craft1Images + Number(user.image_count_craft1 || 0),
      craft2Images: summary.craft2Images + Number(user.image_count_craft2 || 0),
      imageTokens: summary.imageTokens + Number(user.total_image_tokens || 0),
      latestActiveAt:
        !summary.latestActiveAt || new Date(user.last_active_at).getTime() > new Date(summary.latestActiveAt).getTime()
          ? user.last_active_at
          : summary.latestActiveAt,
    }),
    {
      userContacts: 0,
      textTokensThisMonth: 0,
      textTokensYtd: 0,
      craft1Images: 0,
      craft2Images: 0,
      imageTokens: 0,
      latestActiveAt: '',
    }
  );

  const expiringRefills = refills.filter(refill => {
    const daysUntilExpiry = Math.ceil(
      (new Date(refill.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0 && refill.consumed < refill.amount;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa]">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin" style={{ color: Brand.teal }} />
          <p className="text-lg" style={{ color: Brand.navy }}>Loading token usage data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa]">
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
    <>
      <style>{`
        @media screen {
          .token-usage-print-report {
            display: none;
          }
        }

        @media print {
          @page {
            margin: 14mm;
          }

          body {
            background: #ffffff !important;
          }

          .token-usage-screen {
            display: none !important;
          }

          .token-usage-print-report {
            display: block !important;
            color: ${Brand.navy};
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }

          .token-usage-print-report h1,
          .token-usage-print-report h2,
          .token-usage-print-report h3,
          .token-usage-print-report p {
            margin: 0;
          }

          .token-report-header {
            border-bottom: 2px solid ${Brand.navy};
            padding-bottom: 14px;
            margin-bottom: 18px;
          }

          .token-report-kicker {
            color: #64748b;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          .token-report-title {
            font-size: 28px;
            font-weight: 800;
            margin-top: 4px;
          }

          .token-report-meta {
            color: #64748b;
            font-size: 12px;
            margin-top: 6px;
          }

          .token-report-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 18px;
          }

          .token-report-card {
            border: 1px solid ${Brand.line};
            border-radius: 8px;
            padding: 10px;
            break-inside: avoid;
          }

          .token-report-card-label {
            color: #64748b;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .token-report-card-value {
            color: ${Brand.navy};
            font-size: 18px;
            font-weight: 800;
            margin-top: 4px;
          }

          .token-report-card-note {
            color: #64748b;
            font-size: 10px;
            margin-top: 3px;
          }

          .token-report-section {
            margin-top: 18px;
            break-inside: avoid;
          }

          .token-report-section h2 {
            font-size: 16px;
            font-weight: 800;
            margin-bottom: 8px;
          }

          .token-report-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }

          .token-report-table th {
            background: #f8fafc;
            color: ${Brand.navy};
            font-weight: 800;
            text-align: left;
          }

          .token-report-table th,
          .token-report-table td {
            border: 1px solid ${Brand.line};
            padding: 7px 8px;
            vertical-align: top;
          }

          .token-report-empty {
            border: 1px dashed ${Brand.line};
            border-radius: 8px;
            color: #64748b;
            font-size: 11px;
            padding: 12px;
          }
        }
      `}</style>

      <div className="token-usage-screen flex h-screen overflow-hidden bg-[#f5f7fa]">
      {!isSupaAdminView && <AdminSidebar />}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <div className="flex items-center gap-3">
              <Link
                to={isSupaAdminView ? '/supa-admin' : '/admin'}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                title={`Back to ${isSupaAdminView ? 'Super Admin' : 'Admin'} Dashboard`}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Link>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-950">
                  Token usage
                </div>
                <div className="text-xs text-slate-500">
                  {metrics?.organization_name || organizationName || 'Organization'} · Allocation control
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrintReport}
                disabled={!metrics}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                title="Print usage report"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print report</span>
              </button>
              <button
                onClick={fetchAllData}
                disabled={isRefreshing}
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <label className="hidden items-center gap-2 text-xs text-slate-600 sm:flex">
                <span>Live refresh</span>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded accent-cyan-700"
                />
              </label>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
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
            <div className="mb-6 inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {[
                { key: 'overview', label: 'Organization Overview', icon: Activity },
                { key: 'users', label: 'Individual Users', icon: Users },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    activeTab === key
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
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
                {/* Quota hierarchy: contract, month, and day are intentionally separate scopes. */}
                <section aria-labelledby="quota-hierarchy-heading">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Allocation control
                      </p>
                      <h2 id="quota-hierarchy-heading" className="mt-1 text-xl font-semibold text-slate-950">
                        Token balance and limits
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        The usable balance is the platform's current token pool. Monthly and daily limits are separate caps.
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      Displayed in {unit}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Refill-centric balance: the pool is the refills still in positive
                        (overage beyond the plan cap nets against them, oldest first),
                        NOT the contract cap. All three figures come from the RPC — no
                        client-side subtraction, that is how "-5,163,590" shipped twice. */}
                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">Current usable tokens</h3>
                          <p className="mt-0.5 text-xs text-slate-500">What the platform can still spend right now</p>
                        </div>
                        <span className="rounded-xl p-2.5 bg-violet-50 text-violet-700">
                          <Layers3 className="h-5 w-5" aria-hidden="true" />
                        </span>
                      </div>

                      <div className="mt-6">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tokens remaining</p>
                        <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                          {tokenPercentLeft.toFixed(1)}%
                        </p>
                        <p className="mt-1 text-xs text-slate-500">of the starting plus purchased token pool is still available</p>
                      </div>

                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            tokenPercentLeft <= 10 ? 'bg-rose-500' : tokenPercentLeft <= 25 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${tokenPercentLeft}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        This is the overall balance, not the monthly or daily limit.
                      </p>

                      <div className="mt-3 flex items-start justify-between gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Started with</p>
                          <p className="mt-0.5 font-semibold text-slate-900">{fmtU(startingTokenPool)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-500">Usable now</p>
                          <p className="mt-0.5 font-semibold text-emerald-700">{fmtU(metrics.tokens_remaining)}</p>
                        </div>
                      </div>
                    </article>

                    {[
                      {
                        title: 'Monthly limit',
                        scope: 'Maximum allowed this month',
                        usedLabel: 'Used this month',
                        remainingLabel: 'Limit left this month',
                        limit: metrics.monthly_cap,
                        used: metrics.used_text_this_month,
                        icon: CalendarDays,
                        tone: 'bg-cyan-50 text-cyan-700',
                      },
                      {
                        title: 'Daily limit',
                        scope: 'Maximum allowed today',
                        usedLabel: 'Used today',
                        remainingLabel: 'Limit left today',
                        limit: DAILY_LIMIT,
                        used: metrics.used_text_today,
                        icon: Gauge,
                        tone: 'bg-emerald-50 text-emerald-700',
                      },
                    ].map(({ title, scope, usedLabel, remainingLabel, limit, used, icon: Icon, tone }) => {
                      const percent = limit > 0 ? (used / limit) * 100 : 0;
                      const overage = Math.max(0, used - limit);
                      const remaining = Math.max(0, limit - used);
                      const isOver = overage > 0;

                      return (
                        <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                              <p className="mt-0.5 text-xs text-slate-500">{scope}</p>
                            </div>
                            <span className={`rounded-xl p-2.5 ${tone}`}>
                              <Icon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          </div>

                          <div className="mt-6">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Limit</p>
                            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                              {fmtU(limit)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">{unit}</p>
                          </div>

                          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOver ? 'bg-rose-500' : percent >= 80 ? 'bg-amber-500' : 'bg-cyan-600'
                              }`}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>

                          <div className="mt-3 flex items-start justify-between gap-4 text-sm">
                            <div>
                              <p className="text-slate-500">{usedLabel}</p>
                              <p className="mt-0.5 font-semibold text-slate-900">{fmtU(used)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-500">{isOver ? 'Over limit by' : remainingLabel}</p>
                              <p className={`mt-0.5 font-semibold ${isOver ? 'text-rose-700' : 'text-emerald-700'}`}>
                                {fmtU(isOver ? overage : remaining)}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Last month's unused tokens: <strong className="text-slate-900">{fmtU(metrics.rollover_tokens)} {unit}</strong>
                    </span>
                    <span>
                      Purchased refill pool: <strong className="text-slate-900">{fmtU(metrics.refill_balance)} {unit}</strong>
                    </span>
                    <span>
                      Default AI model: <strong className="text-slate-900">{defaultModelName}</strong>
                    </span>
                  </div>
                </section>

                {/* Per-model + cache analytics: internal supa-admin view only (org/Ed-Token view keeps a clean meter). */}
                {isSupaAdminView && (<>
                <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold" style={{ color: Brand.navy }}>
                      Per-Model Usage <span className="text-sm font-normal" style={{ opacity: 0.6 }}>(last 30 days)</span>
                    </h3>
                    <span className="text-xs" style={{ color: Brand.navy, opacity: 0.5 }}>credits = raw × weight</span>
                  </div>
                  {modelBreakdown.length === 0 ? (
                    <p className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>No usage recorded in this window.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left" style={{ color: Brand.navy, opacity: 0.6 }}>
                            <th className="py-2 pr-4 font-medium">Model</th>
                            <th className="py-2 pr-4 font-medium text-right">Requests</th>
                            <th className="py-2 pr-4 font-medium text-right">Raw tokens</th>
                            <th className="py-2 pr-4 font-medium text-right">Credits</th>
                            <th className="py-2 pr-4 font-medium text-right">Weight</th>
                            <th className="py-2 font-medium text-right">Users</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modelBreakdown.map((m) => (
                            <tr key={m.model_key} className="border-t" style={{ borderColor: Brand.line }}>
                              <td className="py-2 pr-4 font-semibold" style={{ color: Brand.navy }}>
                                {m.display_name}
                                {m.category === 'legacy' && (
                                  <span className="ml-2 text-xs font-normal" style={{ color: Brand.orange }}>pre-metering</span>
                                )}
                              </td>
                              <td className="py-2 pr-4 text-right" style={{ color: Brand.navy }}>{Number(m.request_count).toLocaleString()}</td>
                              <td className="py-2 pr-4 text-right" style={{ color: Brand.navy }}>{Number(m.raw_tokens).toLocaleString()}</td>
                              <td className="py-2 pr-4 text-right font-semibold" style={{ color: Brand.navy }}>{Number(m.credits_charged).toLocaleString()}</td>
                              <td className="py-2 pr-4 text-right" style={{ color: Brand.navy, opacity: 0.7 }}>{Number(m.credit_weight).toFixed(2)}×</td>
                              <td className="py-2 text-right" style={{ color: Brand.navy }}>{Number(m.unique_users).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-xs mt-3" style={{ color: Brand.navy, opacity: 0.5 }}>
                        Only U4 requests carry a model tag; earlier rows are grouped as "Legacy (pre-metering)".
                      </p>
                    </div>
                  )}
                </div>

                {/* Cache effectiveness (last 7 days) */}
                <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: Brand.navy }}>
                    Cache Effectiveness <span className="text-sm font-normal" style={{ opacity: 0.6 }}>(last 7 days)</span>
                  </h3>
                  {(() => {
                    const totReq = cacheStats.reduce((s, c) => s + Number(c.request_count), 0);
                    const totCached = cacheStats.reduce((s, c) => s + Number(c.cached_tokens), 0);
                    const totRaw = cacheStats.reduce((s, c) => s + Number(c.raw_tokens), 0);
                    const totSaved = cacheStats.reduce((s, c) => s + Number(c.credits_saved), 0);
                    const hitRate = totRaw > 0 ? (totCached / totRaw) * 100 : 0;
                    if (totReq === 0) {
                      return <p className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>No cache data yet — this populates as U4 traffic grows.</p>;
                    }
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <div className="text-sm mb-1" style={{ color: Brand.navy, opacity: 0.6 }}>Cache hit rate</div>
                          <div className="text-3xl font-bold" style={{ color: Brand.teal }}>{hitRate.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-sm mb-1" style={{ color: Brand.navy, opacity: 0.6 }}>Cached tokens</div>
                          <div className="text-3xl font-bold" style={{ color: Brand.navy }}>{totCached.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-sm mb-1" style={{ color: Brand.navy, opacity: 0.6 }}>Credits saved</div>
                          <div className="text-3xl font-bold" style={{ color: Brand.navy }}>{totSaved.toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                </>)}

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
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowAddRefillModal(true)}
                          className="px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
                          style={{ background: Brand.teal, color: 'white' }}
                        >
                          <Plus className="w-4 h-4" />
                          Add Tokens
                        </button>
                        <button
                          onClick={() => setShowAddPurchaseModal(true)}
                          className="px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 border"
                          style={{ borderColor: Brand.line, color: Brand.navy, background: 'white' }}
                        >
                          <Plus className="w-4 h-4" />
                          Add Purchase
                        </button>
                      </div>
                    )}
                  </div>

                  {metrics.refill_balance > 0 && (
                    <div className="mb-4 p-4 rounded-lg" style={{ background: `${Brand.teal}15` }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: Brand.navy }}>
                          Total Refill Balance
                        </span>
                        <span className="text-2xl font-bold" style={{ color: Brand.teal }}>
                          {fmtU(metrics.refill_balance)} {unit}
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
                                  {fmtU(refill.amount)}
                                </td>
                                <td className="px-4 py-3 text-sm" style={{ color: Brand.orange }}>
                                  {fmtU(refill.consumed)}
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold" style={{ color: Brand.teal }}>
                                  {fmtU(refill.amount - refill.consumed)}
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

                {/* This safeguard is deliberately separate from the three allocation periods above. */}
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Per-chat safeguard</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      A conversation-level safety ceiling, separate from total, monthly, and daily allocation limits.
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    {fmtU(7_500)} {unit} per chat
                  </span>
                </div>

                {/* Purchase History */}
                <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold" style={{ color: Brand.navy }}>
                      Purchase History
                    </h3>
                    <span className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
                      {canEdit ? 'Supa Admin can add purchases' : 'Read-only'}
                    </span>
                  </div>

                  {purchaseHistory.length === 0 ? (
                    <div className="text-center py-8" style={{ color: Brand.navy, opacity: 0.6 }}>
                      <Package className="w-12 h-12 mx-auto mb-3" style={{ opacity: 0.3 }} />
                      <p className="text-sm">No purchase history yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead style={{ background: 'rgba(25,50,74,0.03)' }}>
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: Brand.navy }}>
                              Date
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: Brand.navy }}>
                              Tokens Purchased
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: Brand.navy }}>
                              Amount Paid
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: Brand.navy }}>
                              Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: Brand.line }}>
                          {purchaseHistory.map((purchase) => (
                            <tr key={purchase.id}>
                              <td className="px-4 py-3 text-sm" style={{ color: Brand.navy }}>
                                {new Date(purchase.purchase_date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold" style={{ color: Brand.teal }}>
                                {fmtU(purchase.tokens_purchased)}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold" style={{ color: Brand.navy }}>
                                {purchase.currency} {purchase.amount_paid.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm" style={{ color: Brand.navy, opacity: 0.7 }}>
                                {purchase.notes || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
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
                    placeholder="Search by email or phone..."
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
                            User Contact
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
                                {fmtU(user.used_text_this_month)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: Brand.orange }}>
                                {fmtU(user.used_text_total_ytd)}
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

            {canEdit && showAddRefillModal && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-xl p-6 border shadow-xl" style={{ borderColor: Brand.line }}>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: Brand.navy }}>
                    Add Tokens to Available Balance
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm mb-1" style={{ color: Brand.navy, opacity: 0.8 }}>
                        Token Amount
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={refillForm.amount}
                        onChange={(e) => setRefillForm((prev) => ({ ...prev, amount: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{ borderColor: Brand.line }}
                        placeholder="e.g. 500000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1" style={{ color: Brand.navy, opacity: 0.8 }}>
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={refillForm.expiresAt}
                        onChange={(e) => setRefillForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{ borderColor: Brand.line }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1" style={{ color: Brand.navy, opacity: 0.8 }}>
                        Notes (optional)
                      </label>
                      <textarea
                        value={refillForm.notes}
                        onChange={(e) => setRefillForm((prev) => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{ borderColor: Brand.line }}
                        rows={3}
                        placeholder="Purchase reference or context"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddRefillModal(false)}
                      className="px-4 py-2 rounded-lg border"
                      style={{ borderColor: Brand.line, color: Brand.navy }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddTokens}
                      disabled={isSubmittingRefill}
                      className="px-4 py-2 rounded-lg text-white disabled:opacity-60"
                      style={{ background: Brand.teal }}
                    >
                      {isSubmittingRefill ? 'Adding...' : 'Add Tokens'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {canEdit && showAddPurchaseModal && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-white rounded-xl p-6 border shadow-xl" style={{ borderColor: Brand.line }}>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: Brand.navy }}>
                    Add Purchase History
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-1" style={{ color: Brand.navy, opacity: 0.8 }}>
                        Purchase Date
                      </label>
                      <input
                        type="date"
                        value={purchaseForm.purchaseDate}
                        onChange={(e) => setPurchaseForm((prev) => ({ ...prev, purchaseDate: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{ borderColor: Brand.line }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1" style={{ color: Brand.navy, opacity: 0.8 }}>
                        Tokens Purchased
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={purchaseForm.tokensPurchased}
                        onChange={(e) => setPurchaseForm((prev) => ({ ...prev, tokensPurchased: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{ borderColor: Brand.line }}
                        placeholder="e.g. 1000000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1" style={{ color: Brand.navy, opacity: 0.8 }}>
                        Amount Paid
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={purchaseForm.amountPaid}
                        onChange={(e) => setPurchaseForm((prev) => ({ ...prev, amountPaid: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{ borderColor: Brand.line }}
                        placeholder="e.g. 2500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1" style={{ color: Brand.navy, opacity: 0.8 }}>
                        Currency
                      </label>
                      <select
                        value={purchaseForm.currency}
                        onChange={(e) => setPurchaseForm((prev) => ({ ...prev, currency: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{ borderColor: Brand.line }}
                      >
                        <option value="USD">USD</option>
                        <option value="BWP">BWP</option>
                        <option value="ZAR">ZAR</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm mb-1" style={{ color: Brand.navy, opacity: 0.8 }}>
                        Notes (optional)
                      </label>
                      <textarea
                        value={purchaseForm.notes}
                        onChange={(e) => setPurchaseForm((prev) => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{ borderColor: Brand.line }}
                        rows={3}
                        placeholder="Invoice number, vendor, etc."
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddPurchaseModal(false)}
                      className="px-4 py-2 rounded-lg border"
                      style={{ borderColor: Brand.line, color: Brand.navy }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddPurchaseHistory}
                      disabled={isSubmittingPurchase}
                      className="px-4 py-2 rounded-lg text-white disabled:opacity-60"
                      style={{ background: Brand.teal }}
                    >
                      {isSubmittingPurchase ? 'Saving...' : 'Save Purchase'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {metrics && (
        <div className="token-usage-print-report">
          <header className="token-report-header">
            <p className="token-report-kicker">Pencils of Promise</p>
            <h1 className="token-report-title">Token Usage Report</h1>
            <p className="token-report-meta">
              {metrics.organization_name || organizationName} · Generated {reportGeneratedAt} · Displayed in {unit}
            </p>
          </header>

          <section className="token-report-grid" aria-label="Token usage summary">
            <div className="token-report-card">
              <p className="token-report-card-label">Current usable tokens</p>
              <p className="token-report-card-value">{fmtU(metrics.tokens_remaining)}</p>
              <p className="token-report-card-note">{tokenPercentLeft.toFixed(1)}% of started plus purchased pool left</p>
            </div>
            <div className="token-report-card">
              <p className="token-report-card-label">Started with</p>
              <p className="token-report-card-value">{fmtU(startingTokenPool)}</p>
              <p className="token-report-card-note">Starting allocation plus purchased tokens</p>
            </div>
            <div className="token-report-card">
              <p className="token-report-card-label">Monthly limit left</p>
              <p className="token-report-card-value">{fmtU(Math.max(0, metrics.monthly_cap - metrics.used_text_this_month))}</p>
              <p className="token-report-card-note">{fmtU(metrics.used_text_this_month)} used of {fmtU(metrics.monthly_cap)}</p>
            </div>
            <div className="token-report-card">
              <p className="token-report-card-label">Daily limit left</p>
              <p className="token-report-card-value">{fmtU(Math.max(0, DAILY_LIMIT - metrics.used_text_today))}</p>
              <p className="token-report-card-note">{fmtU(metrics.used_text_today)} used of {fmtU(DAILY_LIMIT)}</p>
            </div>
          </section>

          <section className="token-report-grid" aria-label="Additional token summary">
            <div className="token-report-card">
              <p className="token-report-card-label">Purchased refill pool</p>
              <p className="token-report-card-value">{fmtU(metrics.refill_balance)}</p>
              <p className="token-report-card-note">Purchased tokens available separately from period limits</p>
            </div>
            <div className="token-report-card">
              <p className="token-report-card-label">Last month's unused tokens</p>
              <p className="token-report-card-value">{fmtU(metrics.rollover_tokens)}</p>
              <p className="token-report-card-note">Unused monthly allocation carried forward</p>
            </div>
            <div className="token-report-card">
              <p className="token-report-card-label">Image tokens left</p>
              <p className="token-report-card-value">{fmtU(metrics.image_tokens_remaining)}</p>
              <p className="token-report-card-note">{fmtU(metrics.image_tokens_used)} used of {fmtU(metrics.image_token_cap)}</p>
            </div>
            <div className="token-report-card">
              <p className="token-report-card-label">Images generated</p>
              <p className="token-report-card-value">
                {fmtU(metrics.image_low_count + metrics.image_med_count + metrics.image_high_count)}
              </p>
              <p className="token-report-card-note">Craft-1: {fmtU(metrics.image_low_count)} · Craft-2: {fmtU(metrics.image_med_count)}</p>
            </div>
          </section>

          <section className="token-report-section">
            <h2>Individual User Usage Summary</h2>
            {userUsage.length === 0 ? (
              <p className="token-report-empty">No individual user usage data is available.</p>
            ) : (
              <div className="token-report-grid">
                <div className="token-report-card">
                  <p className="token-report-card-label">User contacts included</p>
                  <p className="token-report-card-value">{fmtU(userUsageSummary.userContacts)}</p>
                  <p className="token-report-card-note">Total users represented in this report</p>
                </div>
                <div className="token-report-card">
                  <p className="token-report-card-label">Text tokens this month</p>
                  <p className="token-report-card-value">{fmtU(userUsageSummary.textTokensThisMonth)}</p>
                  <p className="token-report-card-note">Combined monthly text usage</p>
                </div>
                <div className="token-report-card">
                  <p className="token-report-card-label">Text tokens YTD</p>
                  <p className="token-report-card-value">{fmtU(userUsageSummary.textTokensYtd)}</p>
                  <p className="token-report-card-note">Combined year-to-date text usage</p>
                </div>
                <div className="token-report-card">
                  <p className="token-report-card-label">Craft-1 images</p>
                  <p className="token-report-card-value">{fmtU(userUsageSummary.craft1Images)}</p>
                  <p className="token-report-card-note">Combined Craft-1 image count</p>
                </div>
                <div className="token-report-card">
                  <p className="token-report-card-label">Craft-2 images</p>
                  <p className="token-report-card-value">{fmtU(userUsageSummary.craft2Images)}</p>
                  <p className="token-report-card-note">Combined Craft-2 image count</p>
                </div>
                <div className="token-report-card">
                  <p className="token-report-card-label">Image tokens used</p>
                  <p className="token-report-card-value">{fmtU(userUsageSummary.imageTokens)}</p>
                  <p className="token-report-card-note">Combined image token usage</p>
                </div>
                <div className="token-report-card">
                  <p className="token-report-card-label">Last active</p>
                  <p className="token-report-card-value">
                    {userUsageSummary.latestActiveAt
                      ? new Date(userUsageSummary.latestActiveAt).toLocaleDateString()
                      : 'No activity'}
                  </p>
                  <p className="token-report-card-note">Most recent user activity date</p>
                </div>
              </div>
            )}
          </section>

          <section className="token-report-section">
            <h2>Active Refills</h2>
            {refills.length === 0 ? (
              <p className="token-report-empty">No refill records are available.</p>
            ) : (
              <table className="token-report-table">
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Consumed</th>
                    <th>Remaining</th>
                    <th>Purchase Date</th>
                    <th>Expiry Date</th>
                    <th>Added By</th>
                  </tr>
                </thead>
                <tbody>
                  {refills.map((refill) => (
                    <tr key={refill.id}>
                      <td>{fmtU(refill.amount)}</td>
                      <td>{fmtU(refill.consumed)}</td>
                      <td>{fmtU(Math.max(0, refill.amount - refill.consumed))}</td>
                      <td>{new Date(refill.purchased_at).toLocaleDateString()}</td>
                      <td>{new Date(refill.expires_at).toLocaleDateString()}</td>
                      <td>{refill.added_by_email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="token-report-section">
            <h2>Purchase History</h2>
            {purchaseHistory.length === 0 ? (
              <p className="token-report-empty">No purchase history is available.</p>
            ) : (
              <table className="token-report-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Tokens Purchased</th>
                    <th>Amount Paid</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseHistory.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>{new Date(purchase.purchase_date).toLocaleDateString()}</td>
                      <td>{fmtU(purchase.tokens_purchased)}</td>
                      <td>{purchase.currency} {purchase.amount_paid.toLocaleString()}</td>
                      <td>{purchase.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </>
  );
};

export default TokenUsage;
