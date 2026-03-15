import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/authService';
import {
  DollarSign, Zap, TrendingUp, Image as ImageIcon,
  ArrowLeft, RefreshCw, Download, AlertTriangle, CheckCircle, Clock
} from 'lucide-react';

interface UsageData {
  tokens_used_today: number;
  tokens_used_month: number;
  tokens_used_ytd: number;
  monthly_base: number;
  monthly_cap: number;
  monthly_balance: number;
  rollover_in: number;
  refill_balance: number;
  plan_balance_total: number;
  image_tokens_used: number;
  image_tokens_remaining: number;
  low_count: number;
  med_count: number;
  high_count: number;
  images_overage_usd: number;
  refills: Refill[];
}

interface Refill {
  id: string;
  amount: number;
  consumed: number;
  expires_at: string;
  price_per_1k: number;
  sku: string;
}

interface CostBreakdown {
  cost_usd_today: number;
  cost_usd_month: number;
  cost_usd_ytd: number;
  price_usd_from_plan: number;
  price_usd_from_rollover: number;
  price_usd_from_refills: number;
  price_usd_total: number;
}

interface DailyUsage {
  date: string;
  tokens_used: number;
  cost_usd: number;
  price_usd: number;
}

export default function TokenCostBreakdown() {
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<UsageData>({
    tokens_used_today: 0,
    tokens_used_month: 0,
    tokens_used_ytd: 0,
    monthly_base: 833333,
    monthly_cap: 833333,
    monthly_balance: 833333,
    rollover_in: 0,
    refill_balance: 0,
    plan_balance_total: 10000000,
    image_tokens_used: 0,
    image_tokens_remaining: 250000,
    low_count: 0,
    med_count: 0,
    high_count: 0,
    images_overage_usd: 0,
    refills: []
  });
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown>({
    cost_usd_today: 0,
    cost_usd_month: 0,
    cost_usd_ytd: 0,
    price_usd_from_plan: 0,
    price_usd_from_rollover: 0,
    price_usd_from_refills: 0,
    price_usd_total: 0
  });
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // PoP Constants
  const COGS_PER_1M = 0.295;

  const PLAN_PRICE_PER_1K = 0.25;

  const DAILY_HARD_CAP = 30000;
  const MONTHLY_BASE = 833333;
  const PLAN_TOTAL = 10250000;
  const IMAGE_CREDITS = 250000;

  const IMAGE_TOKEN_COSTS = {
    low: 50,
    medium: 125,
    high: 500
  };

  const IMAGE_OVERAGE_PRICES = {
    low: 0.05,
    medium: 0.25,
    high: 0.85
  };

  const calculateCosts = (data: UsageData): CostBreakdown => {
    const cost_usd_today = (data.tokens_used_today / 1000000) * COGS_PER_1M;
    const cost_usd_month = (data.tokens_used_month / 1000000) * COGS_PER_1M;
    const cost_usd_ytd = (data.tokens_used_ytd / 1000000) * COGS_PER_1M;

    const tokens_from_plan = Math.min(data.tokens_used_month - data.rollover_in, data.monthly_base);
    const tokens_from_rollover = Math.min(data.rollover_in, data.tokens_used_month);

    const price_usd_from_plan = (Math.max(0, tokens_from_plan) / 1000) * PLAN_PRICE_PER_1K;
    const price_usd_from_rollover = (Math.max(0, tokens_from_rollover) / 1000) * PLAN_PRICE_PER_1K;

    let price_usd_from_refills = 0;
    data.refills.forEach(refill => {
      price_usd_from_refills += (refill.consumed / 1000) * refill.price_per_1k;
    });

    const price_usd_total = price_usd_from_plan + price_usd_from_rollover + price_usd_from_refills;

    return {
      cost_usd_today,
      cost_usd_month,
      cost_usd_ytd,
      price_usd_from_plan,
      price_usd_from_rollover,
      price_usd_from_refills,
      price_usd_total
    };
  };

  const fetchUsageData = async () => {
    try {
      setLoading(true);

      const { data: balanceData, error: balanceError } = await supabase
        .from('organization_token_balances')
        .select('*')
        .eq('organization_name', 'Pencils of Promise')
        .maybeSingle();

      if (balanceError) throw balanceError;

      if (balanceData) {
        const now = new Date();

        const { data: todayLogs } = await supabase
          .from('user_token_usage')
          .select('tokens_today')
          .eq('organization_name', 'Pencils of Promise');

        const tokens_used_today = todayLogs?.reduce((sum: any, u: any) => sum + (u.tokens_today || 0), 0) || 0;

        const { data: monthLogs } = await supabase
          .from('user_token_usage')
          .select('tokens_this_month')
          .eq('organization_name', 'Pencils of Promise');

        const tokens_used_month = monthLogs?.reduce((sum: any, u: any) => sum + (u.tokens_this_month || 0), 0) || 0;

        const { data: refillsData } = await supabase
          .from('token_refills')
          .select('*')
          .eq('organization_name', 'Pencils of Promise')
          .gt('expires_at', now.toISOString())
          .order('expires_at', { ascending: true });

        const refills: Refill[] = (refillsData || []).map((r: any) => ({
          id: r.id,
          amount: r.amount,
          consumed: r.consumed || 0,
          expires_at: r.expires_at,
          price_per_1k: r.price_per_1k || 0.30,
          sku: r.sku || '1M'
        }));

        const refill_balance = refills.reduce((sum: any, r: any) => sum + (r.amount - r.consumed), 0);

        const prev_month_unused = balanceData.prev_month_unused || 0;
        const rollover_in = Math.min(prev_month_unused, MONTHLY_BASE);
        const monthly_cap = MONTHLY_BASE + rollover_in;
        const monthly_balance = Math.max(0, monthly_cap - tokens_used_month);
        const plan_balance_total = Math.max(0, PLAN_TOTAL - (balanceData.used_text_total_ytd || 0)) + refill_balance;

        const usage: UsageData = {
          tokens_used_today,
          tokens_used_month,
          tokens_used_ytd: balanceData.used_text_total_ytd || 0,
          monthly_base: MONTHLY_BASE,
          monthly_cap,
          monthly_balance,
          rollover_in,
          refill_balance,
          plan_balance_total,
          image_tokens_used: 0,
          image_tokens_remaining: IMAGE_CREDITS,
          low_count: 0,
          med_count: 0,
          high_count: 0,
          images_overage_usd: 0,
          refills
        };

        setUsageData(usage);
        setCostBreakdown(calculateCosts(usage));

        const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);

        const { data: dailyData } = await supabase
          .from('organization_token_usage')
          .select('*')
          .eq('organization_name', 'Pencils of Promise')
          .gte('usage_date', startDate.toISOString().split('T')[0])
          .order('usage_date', { ascending: true });

        const formattedDaily: DailyUsage[] = (dailyData || []).map((day: any) => ({
          date: day.usage_date,
          tokens_used: day.tokens_used,
          cost_usd: (day.tokens_used / 1000000) * COGS_PER_1M,
          price_usd: (day.tokens_used / 1000) * PLAN_PRICE_PER_1K
        }));

        setDailyUsage(formattedDaily);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, [timeRange]);

  const exportData = () => {
    const csvData = [
      ['Metric', 'Value'],
      ['Tokens Used Today', usageData.tokens_used_today.toLocaleString()],
      ['Tokens Used This Month', usageData.tokens_used_month.toLocaleString()],
      ['Tokens Used YTD', usageData.tokens_used_ytd.toLocaleString()],
      ['Monthly Cap', usageData.monthly_cap.toLocaleString()],
      ['Monthly Balance', usageData.monthly_balance.toLocaleString()],
      ['Refill Balance', usageData.refill_balance.toLocaleString()],
      ['Plan Balance Total', usageData.plan_balance_total.toLocaleString()],
      [''],
      ['Internal Cost (COGS)'],
      ['Cost Today', `$${costBreakdown.cost_usd_today.toFixed(4)}`],
      ['Cost This Month', `$${costBreakdown.cost_usd_month.toFixed(4)}`],
      ['Cost YTD', `$${costBreakdown.cost_usd_ytd.toFixed(2)}`],
      [''],
      ['Imputed Value (Price)'],
      ['Value from Plan', `$${costBreakdown.price_usd_from_plan.toFixed(2)}`],
      ['Value from Rollover', `$${costBreakdown.price_usd_from_rollover.toFixed(2)}`],
      ['Value from Refills', `$${costBreakdown.price_usd_from_refills.toFixed(2)}`],
      ['Total Value', `$${costBreakdown.price_usd_total.toFixed(2)}`]
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pop-token-usage-${new Date().toISOString()}.csv`;
    a.click();
  };

  const dailyUsagePercentage = (usageData.tokens_used_today / DAILY_HARD_CAP) * 100;
  const monthlyUsagePercentage = (usageData.tokens_used_month / usageData.monthly_cap) * 100;
  const imageUsagePercentage = (usageData.image_tokens_used / IMAGE_CREDITS) * 100;

  const showMonthlyWarning80 = monthlyUsagePercentage >= 80;
  const showMonthlyWarning95 = monthlyUsagePercentage >= 95;
  const showDailyCap = dailyUsagePercentage >= 100;

  const expiringRefills = usageData.refills.filter(r => {
    const daysUntilExpiry = Math.ceil((new Date(r.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  });

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen pb-20">
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
            <h1 className="text-3xl font-bold text-gray-900">PoP Token Usage & Cost Tracking</h1>
            <p className="text-gray-600 mt-1">Uhuru LLM U1.5 - Pencils of Promise Dashboard</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right text-sm">
            <div className="text-gray-500">Last Updated</div>
            <div className="font-medium text-gray-900">{lastUpdate.toLocaleTimeString()}</div>
          </div>
          <button
            onClick={fetchUsageData}
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

      {/* Alerts */}
      {(showMonthlyWarning80 || showDailyCap || expiringRefills.length > 0) && (
        <div className="space-y-3">
          {showDailyCap && (
            <div className="rounded-lg p-4 bg-red-50 border-l-4 border-red-500">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
                <div>
                  <h3 className="font-bold text-red-900">Daily Cap Reached</h3>
                  <p className="text-sm text-red-700">
                    Daily token limit of {DAILY_HARD_CAP.toLocaleString()} tokens has been reached.
                  </p>
                </div>
              </div>
            </div>
          )}

          {showMonthlyWarning95 && (
            <div className="rounded-lg p-4 bg-red-50 border-l-4 border-red-500">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
                <div>
                  <h3 className="font-bold text-red-900">Critical: 95% Monthly Cap</h3>
                  <p className="text-sm text-red-700">
                    You have used {monthlyUsagePercentage.toFixed(1)}% of your monthly allocation.
                    {usageData.refill_balance > 0 && ' Refill balance will be used for continued service.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {showMonthlyWarning80 && !showMonthlyWarning95 && (
            <div className="rounded-lg p-4 bg-yellow-50 border-l-4 border-yellow-500">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
                <div>
                  <h3 className="font-bold text-yellow-900">Warning: 80% Monthly Cap</h3>
                  <p className="text-sm text-yellow-700">
                    You have used {monthlyUsagePercentage.toFixed(1)}% of your monthly allocation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {expiringRefills.length > 0 && (
            <div className="rounded-lg p-4 bg-orange-50 border-l-4 border-orange-500">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-orange-600 mr-3" />
                <div>
                  <h3 className="font-bold text-orange-900">Refills Expiring Soon</h3>
                  <p className="text-sm text-orange-700">
                    {expiringRefills.length} refill{expiringRefills.length > 1 ? 's' : ''} expiring within 30 days.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Usage */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Usage</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {(usageData.tokens_used_today / 1000).toFixed(1)}K
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Zap className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>{dailyUsagePercentage.toFixed(1)}% of daily cap</span>
              <span>{DAILY_HARD_CAP.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  dailyUsagePercentage >= 100 ? 'bg-red-500' :
                  dailyUsagePercentage >= 80 ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}
                style={{ width: `${Math.min(dailyUsagePercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Monthly Usage */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Usage</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {(usageData.tokens_used_month / 1000).toFixed(1)}K
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>{monthlyUsagePercentage.toFixed(1)}%</span>
              <span>{(usageData.monthly_cap / 1000).toFixed(0)}K cap</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 relative">
              <div
                className={`h-2 rounded-full ${
                  monthlyUsagePercentage >= 95 ? 'bg-red-500' :
                  monthlyUsagePercentage >= 80 ? 'bg-yellow-500' :
                  'bg-purple-500'
                }`}
                style={{ width: `${Math.min(monthlyUsagePercentage, 100)}%` }}
              />
              <div className="absolute top-0 left-[80%] w-0.5 h-2 bg-yellow-600" />
              <div className="absolute top-0 left-[95%] w-0.5 h-2 bg-red-600" />
            </div>
          </div>
        </div>

        {/* Plan Balance */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Plan Balance</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {(usageData.plan_balance_total / 1000000).toFixed(2)}M
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>YTD Used: {(usageData.tokens_used_ytd / 1000000).toFixed(2)}M / 10.25M</div>
            <div>Refill Balance: {(usageData.refill_balance / 1000).toFixed(0)}K tokens</div>
          </div>
        </div>

        {/* Monthly Balance */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Balance</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {(usageData.monthly_balance / 1000).toFixed(1)}K
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Base: {(usageData.monthly_base / 1000).toFixed(0)}K</div>
            <div>Rollover: {(usageData.rollover_in / 1000).toFixed(0)}K</div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Internal Cost (COGS) */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-red-600" />
            Internal Cost (Uhuru LLM U1.5 COGS)
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-600">Today</div>
                <div className="text-xs text-gray-500 mt-1">{usageData.tokens_used_today.toLocaleString()} tokens</div>
              </div>
              <div className="text-2xl font-bold text-red-700">
                ${costBreakdown.cost_usd_today.toFixed(4)}
              </div>
            </div>
            <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-600">Month-to-Date</div>
                <div className="text-xs text-gray-500 mt-1">{usageData.tokens_used_month.toLocaleString()} tokens</div>
              </div>
              <div className="text-2xl font-bold text-red-700">
                ${costBreakdown.cost_usd_month.toFixed(4)}
              </div>
            </div>
            <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-600">Year-to-Date</div>
                <div className="text-xs text-gray-500 mt-1">{usageData.tokens_used_ytd.toLocaleString()} tokens</div>
              </div>
              <div className="text-2xl font-bold text-red-700">
                ${costBreakdown.cost_usd_ytd.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
            COGS: $0.000295 per 1K tokens ($0.295 per 1M)
          </div>
        </div>

        {/* Imputed Value (Price) */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-green-600" />
            Imputed Value (Customer Price)
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <div className="text-sm font-medium text-gray-600">From Plan (Prepaid)</div>
              <div className="text-xl font-bold text-green-700">
                ${costBreakdown.price_usd_from_plan.toFixed(2)}
              </div>
            </div>
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-gray-600">From Rollover</div>
              <div className="text-xl font-bold text-blue-700">
                ${costBreakdown.price_usd_from_rollover.toFixed(2)}
              </div>
            </div>
            <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
              <div className="text-sm font-medium text-gray-600">From Refills</div>
              <div className="text-xl font-bold text-purple-700">
                ${costBreakdown.price_usd_from_refills.toFixed(2)}
              </div>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-900 text-white rounded-lg">
              <div className="text-sm font-semibold">Total Value</div>
              <div className="text-2xl font-bold">
                ${costBreakdown.price_usd_total.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
            Plan: $0.25/1K | Refills: $0.26-$0.30/1K
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex space-x-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '7d' && 'Last 7 Days'}
              {range === '30d' && 'Last 30 Days'}
              {range === '90d' && 'Last 90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Daily Usage Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Daily Token Usage</h2>
        <div className="h-64 flex items-end space-x-1">
          {dailyUsage.map((day, index) => {
            const maxTokens = Math.max(...dailyUsage.map(d => d.tokens_used), 1);
            const height = (day.tokens_used / maxTokens) * 100;
            return (
              <div key={index} className="flex-1 relative group">
                <div
                  className="bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                  style={{ height: `${height}%`, minHeight: '2px' }}
                />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  <div>{new Date(day.date).toLocaleDateString()}</div>
                  <div>{(day.tokens_used / 1000).toFixed(1)}K tokens</div>
                  <div>COGS: ${day.cost_usd.toFixed(4)}</div>
                  <div>Value: ${day.price_usd.toFixed(2)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{dailyUsage[0] ? new Date(dailyUsage[0].date).toLocaleDateString() : ''}</span>
          <span>{dailyUsage[dailyUsage.length - 1] ? new Date(dailyUsage[dailyUsage.length - 1].date).toLocaleDateString() : ''}</span>
        </div>
      </div>

      {/* Image Credits */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <ImageIcon className="w-5 h-5 mr-2 text-indigo-600" />
          Image Generation Credits
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Credits Used</span>
                <span>{usageData.image_tokens_used.toLocaleString()} / {IMAGE_CREDITS.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    imageUsagePercentage >= 90 ? 'bg-red-500' :
                    imageUsagePercentage >= 75 ? 'bg-yellow-500' :
                    'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(imageUsagePercentage, 100)}%` }}
                />
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Low Quality ({IMAGE_TOKEN_COSTS.low} tokens)</span>
                <span className="font-medium">{usageData.low_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Medium Quality ({IMAGE_TOKEN_COSTS.medium} tokens)</span>
                <span className="font-medium">{usageData.med_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">High Quality ({IMAGE_TOKEN_COSTS.high} tokens)</span>
                <span className="font-medium">{usageData.high_count}</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Overage Pricing</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Low Quality</span>
                <span className="font-medium">${IMAGE_OVERAGE_PRICES.low} / image</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Medium Quality</span>
                <span className="font-medium">${IMAGE_OVERAGE_PRICES.medium} / image</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">High Quality</span>
                <span className="font-medium">${IMAGE_OVERAGE_PRICES.high} / image</span>
              </div>
              {usageData.images_overage_usd > 0 && (
                <div className="pt-3 mt-3 border-t border-gray-300">
                  <div className="flex justify-between font-bold">
                    <span className="text-red-700">Overage Charges</span>
                    <span className="text-red-700">${usageData.images_overage_usd.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Refills */}
      {usageData.refills.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Active Refills</h2>
          <div className="space-y-3">
            {usageData.refills.map((refill, index) => {
              const remaining = refill.amount - refill.consumed;
              const usagePercent = (refill.consumed / refill.amount) * 100;
              const daysUntilExpiry = Math.ceil((new Date(refill.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

              return (
                <div key={refill.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">Refill #{index + 1} ({refill.sku})</div>
                      <div className="text-xs text-gray-600">
                        Expires: {new Date(refill.expires_at).toLocaleDateString()} ({daysUntilExpiry} days)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{(remaining / 1000).toFixed(0)}K</div>
                      <div className="text-xs text-gray-600">remaining</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    ${refill.price_per_1k.toFixed(2)} per 1K tokens
                  </div>
                </div>
              );
            })}
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
