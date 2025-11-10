import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/authService';
import {
  DollarSign, Users, Zap, TrendingUp, TrendingDown,
  ArrowLeft, RefreshCw, Download, AlertTriangle
} from 'lucide-react';

interface TokenBalance {
  organization_name: string;
  total_tokens_allocated: number;
  total_tokens_used: number;
  total_tokens_remaining: number;
  refill_balance: number;
  last_refill_date: string;
  last_refill_amount: number;
}

interface UserTokenUsage {
  user_id: string;
  user_email: string;
  total_tokens_used: number;
  tokens_today: number;
  tokens_this_week: number;
  tokens_this_month: number;
  last_active_at: string;
}

interface DailyUsage {
  date: string;
  tokens_used: number;
  cost: number;
}

interface ModelBreakdown {
  model: string;
  tokens: number;
  cost: number;
  percentage: number;
}

export default function TokenCostBreakdown() {
  const [loading, setLoading] = useState(true);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [topUsers, setTopUsers] = useState<UserTokenUsage[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [modelBreakdown, setModelBreakdown] = useState<ModelBreakdown[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Token cost mapping (cost per 1K tokens)
  const TOKEN_COSTS = {
    'u-1.5': 0.0002,
    'u-2.0': 0.0006,
    'u-2.1': 0.015,
  };

  const calculateCost = (tokens: number, model: string): number => {
    const costPer1k = TOKEN_COSTS[model as keyof typeof TOKEN_COSTS] || 0.001;
    return (tokens / 1000) * costPer1k;
  };

  const fetchTokenData = async () => {
    try {
      setLoading(true);

      // Fetch organization token balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('organization_token_balances')
        .select('*')
        .eq('organization_name', 'Pencils of Promise')
        .maybeSingle();

      if (balanceError) throw balanceError;
      setTokenBalance(balanceData);

      // Fetch top users by token usage
      const { data: usersData, error: usersError } = await supabase
        .from('user_token_usage')
        .select(`
          user_id,
          total_tokens_used,
          tokens_today,
          tokens_this_week,
          tokens_this_month,
          last_active_at
        `)
        .eq('organization_name', 'Pencils of Promise')
        .order('total_tokens_used', { ascending: false })
        .limit(10);

      if (usersError) throw usersError;

      // Get user emails separately
      if (usersData && usersData.length > 0) {
        const userIds = usersData.map(u => u.user_id);
        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('id, email')
          .in('id', userIds);

        const emailMap = new Map(profilesData?.map(p => [p.id, p.email]) || []);

        const formattedUsers: UserTokenUsage[] = usersData.map(user => ({
          user_id: user.user_id,
          user_email: emailMap.get(user.user_id) || 'Unknown',
          total_tokens_used: user.total_tokens_used,
          tokens_today: user.tokens_today,
          tokens_this_week: user.tokens_this_week,
          tokens_this_month: user.tokens_this_month,
          last_active_at: user.last_active_at
        }));

        setTopUsers(formattedUsers);
      }

      // Fetch daily usage for the selected time range
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data: dailyData, error: dailyError } = await supabase
        .from('organization_token_usage')
        .select('*')
        .eq('organization_name', 'Pencils of Promise')
        .gte('usage_date', startDate.toISOString().split('T')[0])
        .order('usage_date', { ascending: true });

      if (dailyError) throw dailyError;

      const formattedDaily: DailyUsage[] = (dailyData || []).map(day => ({
        date: day.usage_date,
        tokens_used: day.tokens_used,
        cost: calculateCost(day.tokens_used, 'u-2.0')
      }));

      setDailyUsage(formattedDaily);

      // Calculate model breakdown
      const totalTokens = balanceData?.total_tokens_used || 0;
      const mockBreakdown: ModelBreakdown[] = [
        {
          model: 'U 2.1 (Advanced)',
          tokens: Math.floor(totalTokens * 0.15),
          cost: 0,
          percentage: 15
        },
        {
          model: 'U 2.0 (Standard)',
          tokens: Math.floor(totalTokens * 0.70),
          cost: 0,
          percentage: 70
        },
        {
          model: 'U 1.5 (Fast)',
          tokens: Math.floor(totalTokens * 0.15),
          cost: 0,
          percentage: 15
        },
      ];

      mockBreakdown.forEach(item => {
        item.cost = calculateCost(item.tokens, item.model.split(' ')[1].toLowerCase());
      });

      setModelBreakdown(mockBreakdown);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching token data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenData();
  }, [timeRange]);

  const exportData = () => {
    const csvData = [
      ['Date', 'Tokens Used', 'Estimated Cost ($)'],
      ...dailyUsage.map(day => [
        day.date,
        day.tokens_used.toString(),
        day.cost.toFixed(4)
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `token-usage-${new Date().toISOString()}.csv`;
    a.click();
  };

  const usagePercentage = tokenBalance
    ? (tokenBalance.total_tokens_used / tokenBalance.total_tokens_allocated) * 100
    : 0;

  const totalCost = dailyUsage.reduce((sum, day) => sum + day.cost, 0);
  const avgDailyCost = dailyUsage.length > 0 ? totalCost / dailyUsage.length : 0;
  const projectedMonthlyCost = avgDailyCost * 30;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
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
            <h1 className="text-3xl font-bold text-gray-900">Token Usage & Cost Tracking</h1>
            <p className="text-gray-600 mt-1">Monitor token consumption and optimize costs</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right text-sm">
            <div className="text-gray-500">Last Updated</div>
            <div className="font-medium text-gray-900">{lastUpdate.toLocaleTimeString()}</div>
          </div>
          <button
            onClick={fetchTokenData}
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

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Tokens Used */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tokens Used</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {((tokenBalance?.total_tokens_used || 0) / 1000000).toFixed(2)}M
              </p>
              <p className="text-sm text-gray-500 mt-1">
                of {((tokenBalance?.total_tokens_allocated || 0) / 1000000).toFixed(2)}M allocated
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Zap className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{usagePercentage.toFixed(1)}% used</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  usagePercentage >= 90 ? 'bg-red-500' :
                  usagePercentage >= 75 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Refill Balance */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Refill Balance</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ${(tokenBalance?.refill_balance || 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Available for purchase</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
          {tokenBalance?.last_refill_date && (
            <div className="mt-3 text-xs text-gray-600">
              Last refill: {new Date(tokenBalance.last_refill_date).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Estimated Monthly Cost */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Projected Monthly</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ${projectedMonthlyCost.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Based on current usage</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {topUsers.length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Consuming tokens</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Users className="w-8 h-8 text-orange-600" />
            </div>
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
        <h2 className="text-xl font-bold text-gray-900 mb-4">Daily Token Usage & Cost</h2>
        <div className="h-64 flex items-end space-x-1">
          {dailyUsage.map((day, index) => {
            const maxTokens = Math.max(...dailyUsage.map(d => d.tokens_used), 1);
            const height = (day.tokens_used / maxTokens) * 100;
            return (
              <div
                key={index}
                className="flex-1 relative group"
              >
                <div
                  className="bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                  style={{ height: `${height}%`, minHeight: '2px' }}
                />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  <div>{new Date(day.date).toLocaleDateString()}</div>
                  <div>{(day.tokens_used / 1000).toFixed(1)}K tokens</div>
                  <div>${day.cost.toFixed(4)}</div>
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

      {/* Model Breakdown & Top Users Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Breakdown */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Usage by Model</h2>
          <div className="space-y-4">
            {modelBreakdown.map((model, index) => (
              <div key={index}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{model.model}</span>
                  <span className="text-sm text-gray-600">
                    {(model.tokens / 1000).toFixed(1)}K tokens (${model.cost.toFixed(4)})
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      index === 0 ? 'bg-purple-500' :
                      index === 1 ? 'bg-blue-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${model.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">Total Estimated Cost</div>
            <div className="text-2xl font-bold text-gray-900">
              ${modelBreakdown.reduce((sum, m) => sum + m.cost, 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Top Users */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Token Consumers</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {topUsers.length > 0 ? (
              topUsers.map((user, index) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user.user_email}</div>
                      <div className="text-xs text-gray-500">
                        Today: {(user.tokens_today / 1000).toFixed(1)}K |
                        Week: {(user.tokens_this_week / 1000).toFixed(1)}K
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">
                      {(user.total_tokens_used / 1000).toFixed(1)}K
                    </div>
                    <div className="text-xs text-gray-500">total</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No user token data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {usagePercentage >= 75 && (
        <div className={`rounded-lg p-4 ${
          usagePercentage >= 90 ? 'bg-red-50 border-l-4 border-red-500' : 'bg-yellow-50 border-l-4 border-yellow-500'
        }`}>
          <div className="flex items-center">
            <AlertTriangle className={`w-5 h-5 ${usagePercentage >= 90 ? 'text-red-600' : 'text-yellow-600'} mr-3`} />
            <div>
              <h3 className={`font-bold ${usagePercentage >= 90 ? 'text-red-900' : 'text-yellow-900'}`}>
                {usagePercentage >= 90 ? 'Critical: Token Limit Approaching' : 'Warning: High Token Usage'}
              </h3>
              <p className={`text-sm ${usagePercentage >= 90 ? 'text-red-700' : 'text-yellow-700'}`}>
                You have used {usagePercentage.toFixed(1)}% of your allocated tokens.
                {usagePercentage >= 90
                  ? ' Please purchase additional tokens immediately to avoid service interruption.'
                  : ' Consider purchasing additional tokens soon.'}
              </p>
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
