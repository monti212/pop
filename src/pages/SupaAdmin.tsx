import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/authService';
import { Users, Activity, Zap, TrendingUp, Clock, MessageSquare, FileText, BarChart3 } from 'lucide-react';

interface UserMetric {
  user_email: string;
  total_sessions: number;
  total_duration_seconds: number;
  total_touchpoints: number;
  last_active: string;
}

interface TokenMetric {
  user_email: string;
  total_tokens: number;
  model_breakdown: Record<string, number>;
}

interface OrgMetrics {
  organization_name: string;
  total_users: number;
  active_users_today: number;
  active_users_week: number;
  active_users_month: number;
  total_tokens_used: number;
  total_conversations: number;
  total_files_processed: number;
  updated_at: string;
}

export default function SupaAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userMetrics, setUserMetrics] = useState<UserMetric[]>([]);
  const [tokenMetrics, setTokenMetrics] = useState<TokenMetric[]>([]);
  const [orgMetrics, setOrgMetrics] = useState<OrgMetrics | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'users' | 'tokens'>('overview');

  useEffect(() => {
    checkAccess();
    fetchMetrics();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== 'monti@orionx.xyz') {
      navigate('/');
      return;
    }
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      const [orgData, usersData, tokensData] = await Promise.all([
        supabase
          .from('organization_metrics')
          .select('*')
          .eq('organization_name', 'Pencils of Promise')
          .single(),

        supabase.rpc('get_user_activity_summary'),

        supabase.rpc('get_token_usage_summary')
      ]);

      if (orgData.data) setOrgMetrics(orgData.data);
      if (usersData.data) setUserMetrics(usersData.data);
      if (tokensData.data) setTokenMetrics(tokensData.data);

    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Supa Admin Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Supa Admin Dashboard</h1>
          <p className="text-slate-400">Optimus Prime - Complete System Metrics</p>
        </div>

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setSelectedView('overview')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              selectedView === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <BarChart3 className="inline-block w-5 h-5 mr-2" />
            Overview
          </button>
          <button
            onClick={() => setSelectedView('users')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              selectedView === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Users className="inline-block w-5 h-5 mr-2" />
            User Metrics
          </button>
          <button
            onClick={() => setSelectedView('tokens')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              selectedView === 'tokens'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Zap className="inline-block w-5 h-5 mr-2" />
            Token Usage
          </button>
        </div>

        {selectedView === 'overview' && orgMetrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 text-blue-400" />
                  <span className="text-xs text-slate-400">Total Users</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {formatNumber(orgMetrics.total_users)}
                </div>
              </div>

              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <Activity className="w-8 h-8 text-green-400" />
                  <span className="text-xs text-slate-400">Active Today</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {formatNumber(orgMetrics.active_users_today)}
                </div>
                <div className="text-xs text-slate-400">
                  Week: {orgMetrics.active_users_week} | Month: {orgMetrics.active_users_month}
                </div>
              </div>

              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <Zap className="w-8 h-8 text-yellow-400" />
                  <span className="text-xs text-slate-400">Total Tokens</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {formatNumber(orgMetrics.total_tokens_used)}
                </div>
              </div>

              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <MessageSquare className="w-8 h-8 text-purple-400" />
                  <span className="text-xs text-slate-400">Conversations</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {formatNumber(orgMetrics.total_conversations)}
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">Organization Overview</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-slate-400 mb-1">Organization</div>
                  <div className="text-lg font-semibold text-white">{orgMetrics.organization_name}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Files Processed</div>
                  <div className="text-lg font-semibold text-white flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-400" />
                    {formatNumber(orgMetrics.total_files_processed)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Last Updated</div>
                  <div className="text-lg font-semibold text-white">
                    {new Date(orgMetrics.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'users' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">User Activity Metrics</h2>
              <p className="text-sm text-slate-400 mt-1">Individual user engagement and activity data</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">User Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Sessions</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Total Time</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Touchpoints</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {userMetrics.length > 0 ? (
                    userMetrics.map((metric, index) => (
                      <tr key={index} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-white">{metric.user_email}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">{metric.total_sessions}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          <Clock className="inline-block w-4 h-4 mr-1 text-blue-400" />
                          {formatDuration(metric.total_duration_seconds)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          <TrendingUp className="inline-block w-4 h-4 mr-1 text-green-400" />
                          {formatNumber(metric.total_touchpoints)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {new Date(metric.last_active).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        No user activity data available yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedView === 'tokens' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Token Usage Metrics</h2>
              <p className="text-sm text-slate-400 mt-1">Per-user token consumption and model usage</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">User Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Total Tokens</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Model Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {tokenMetrics.length > 0 ? (
                    tokenMetrics.map((metric, index) => (
                      <tr key={index} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-white">{metric.user_email}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          <Zap className="inline-block w-4 h-4 mr-1 text-yellow-400" />
                          {formatNumber(metric.total_tokens)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(metric.model_breakdown).map(([model, tokens]) => (
                              <span
                                key={model}
                                className="px-2 py-1 bg-slate-700 rounded text-xs"
                              >
                                {model}: {formatNumber(tokens as number)}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-400">
                        No token usage data available yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          onClick={fetchMetrics}
          className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Refresh Metrics
        </button>
      </div>
    </div>
  );
}
