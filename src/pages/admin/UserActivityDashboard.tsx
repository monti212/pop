import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/authService';
import {
  Users, TrendingUp, Calendar,
  ArrowLeft, RefreshCw, Download, UserCheck
} from 'lucide-react';

interface UserActivityMetrics {
  totalUsers: number;
  activeToday: number;
  activeThisWeek: number;
  activeThisMonth: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  avgSessionDuration: number;
  avgMessagesPerUser: number;
  dailyActiveRate: number;
  weeklyActiveRate: number;
  monthlyActiveRate: number;
}

interface UserEngagementData {
  userId: string;
  userEmail: string;
  lastActive: string;
  totalMessages: number;
  tokensUsed: number;
  sessionsCount: number;
  avgSessionMinutes: number;
  daysActive: number;
  engagementScore: number;
}

interface DailyActiveUsers {
  date: string;
  activeUsers: number;
  newUsers: number;
}

export default function UserActivityDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<UserActivityMetrics>({
    totalUsers: 0,
    activeToday: 0,
    activeThisWeek: 0,
    activeThisMonth: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    avgSessionDuration: 0,
    avgMessagesPerUser: 0,
    dailyActiveRate: 0,
    weeklyActiveRate: 0,
    monthlyActiveRate: 0
  });
  const [userEngagement, setUserEngagement] = useState<UserEngagementData[]>([]);
  const [dailyActive, setDailyActive] = useState<DailyActiveUsers[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [sortBy, setSortBy] = useState<'engagement' | 'messages' | 'tokens' | 'lastActive'>('engagement');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get total users count
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_name', 'Pencils of Promise');

      // Get active users (users with activity in last 15 minutes)
      const { count: activeToday } = await supabase
        .from('active_sessions_log')
        .select('user_id', { count: 'exact', head: true })
        .gte('last_activity', todayStart.toISOString())
        .is('session_end', null);

      // Get weekly active users
      const { data: weeklyActiveData } = await supabase
        .from('messages')
        .select('user_id')
        .gte('created_at', weekStart.toISOString())
        .eq('organization_name', 'Pencils of Promise');

      const activeThisWeek = new Set(weeklyActiveData?.map((m: any) => m.user_id)).size;

      // Get monthly active users
      const { data: monthlyActiveData } = await supabase
        .from('messages')
        .select('user_id')
        .gte('created_at', monthStart.toISOString())
        .eq('organization_name', 'Pencils of Promise');

      const activeThisMonth = new Set(monthlyActiveData?.map((m: any) => m.user_id)).size;

      // Get new users
      const { count: newUsersToday } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_name', 'Pencils of Promise')
        .gte('created_at', todayStart.toISOString());

      const { count: newUsersThisWeek } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_name', 'Pencils of Promise')
        .gte('created_at', weekStart.toISOString());

      const { count: newUsersThisMonth } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_name', 'Pencils of Promise')
        .gte('created_at', monthStart.toISOString());

      // Get message count
      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('organization_name', 'Pencils of Promise');

      const avgMessagesPerUser = totalUsers ? (totalMessages || 0) / totalUsers : 0;

      const calculatedMetrics: UserActivityMetrics = {
        totalUsers: totalUsers || 0,
        activeToday: activeToday || 0,
        activeThisWeek,
        activeThisMonth,
        newUsersToday: newUsersToday || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
        avgSessionDuration: 8,
        avgMessagesPerUser,
        dailyActiveRate: totalUsers ? (activeToday || 0) / totalUsers * 100 : 0,
        weeklyActiveRate: totalUsers ? activeThisWeek / totalUsers * 100 : 0,
        monthlyActiveRate: totalUsers ? activeThisMonth / totalUsers * 100 : 0
      };

      setMetrics(calculatedMetrics);

      // Fetch user engagement data
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('id, email, created_at, last_active_at')
        .eq('organization_name', 'Pencils of Promise')
        .order('last_active_at', { ascending: false })
        .limit(100);

      if (userData) {
        const engagementData: UserEngagementData[] = await Promise.all(
          userData.map(async (user: any) => {
            const { count: messageCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id);

            const { data: tokenData } = await supabase
              .from('user_token_usage')
              .select('tokens_total_ytd')
              .eq('user_id', user.id)
              .maybeSingle();

            const daysActive = user.last_active_at
              ? Math.ceil((new Date().getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
              : 0;

            const engagementScore = ((messageCount || 0) * 2) + ((tokenData?.tokens_total_ytd || 0) / 1000);

            return {
              userId: user.id,
              userEmail: user.email || 'Unknown',
              lastActive: user.last_active_at || user.created_at,
              totalMessages: messageCount || 0,
              tokensUsed: tokenData?.tokens_total_ytd || 0,
              sessionsCount: 0,
              avgSessionMinutes: 0,
              daysActive,
              engagementScore
            };
          })
        );

        setUserEngagement(engagementData);
      }

      // Fetch daily active users chart data
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const dailyData: DailyActiveUsers[] = [];
      for (let i = 0; i < daysAgo; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const { data: dayMessages } = await supabase
          .from('messages')
          .select('user_id')
          .gte('created_at', dayStart.toISOString())
          .lt('created_at', dayEnd.toISOString())
          .eq('organization_name', 'Pencils of Promise');

        const activeUsers = new Set(dayMessages?.map((m: any) => m.user_id)).size;

        const { count: newUsers } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('organization_name', 'Pencils of Promise')
          .gte('created_at', dayStart.toISOString())
          .lt('created_at', dayEnd.toISOString());

        dailyData.push({
          date: dayStart.toISOString().split('T')[0],
          activeUsers,
          newUsers: newUsers || 0
        });
      }

      setDailyActive(dailyData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching user activity metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  const sortedUsers = [...userEngagement].sort((a, b) => {
    switch (sortBy) {
      case 'engagement':
        return b.engagementScore - a.engagementScore;
      case 'messages':
        return b.totalMessages - a.totalMessages;
      case 'tokens':
        return b.tokensUsed - a.tokensUsed;
      case 'lastActive':
        return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
      default:
        return 0;
    }
  });

  const exportData = () => {
    const csvData = [
      ['User Email', 'Total Messages', 'Tokens Used', 'Days Active', 'Last Active', 'Engagement Score'],
      ...sortedUsers.map(user => [
        user.userEmail,
        user.totalMessages.toString(),
        user.tokensUsed.toString(),
        user.daysActive.toString(),
        new Date(user.lastActive).toLocaleDateString(),
        user.engagementScore.toFixed(2)
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-activity-${new Date().toISOString()}.csv`;
    a.click();
  };

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
            <h1 className="text-3xl font-bold text-gray-900">User Activity & Engagement</h1>
            <p className="text-gray-600 mt-1">Pencils of Promise - 500 Teachers Monitoring</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right text-sm">
            <div className="text-gray-500">Last Updated</div>
            <div className="font-medium text-gray-900">{lastUpdate.toLocaleTimeString()}</div>
          </div>
          <button
            onClick={fetchMetrics}
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

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.totalUsers}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="text-xs text-gray-600">
            <div>New today: {metrics.newUsersToday}</div>
            <div>New this week: {metrics.newUsersThisWeek}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Today</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.activeToday}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="text-xs text-gray-600">
            {metrics.dailyActiveRate.toFixed(1)}% of total users
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Weekly Active</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.activeThisWeek}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="text-xs text-gray-600">
            {metrics.weeklyActiveRate.toFixed(1)}% engagement rate
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Active</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.activeThisMonth}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <div className="text-xs text-gray-600">
            {metrics.monthlyActiveRate.toFixed(1)}% monthly retention
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

      {/* Daily Active Users Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Daily Active Users</h2>
        <div className="h-64 flex items-end space-x-1">
          {dailyActive.map((day, index) => {
            const maxUsers = Math.max(...dailyActive.map(d => d.activeUsers), 1);
            const height = (day.activeUsers / maxUsers) * 100;
            return (
              <div key={index} className="flex-1 relative group">
                <div
                  className="bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                  style={{ height: `${height}%`, minHeight: '2px' }}
                />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  <div>{new Date(day.date).toLocaleDateString()}</div>
                  <div>{day.activeUsers} active users</div>
                  <div>{day.newUsers} new users</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{dailyActive[0] ? new Date(dailyActive[0].date).toLocaleDateString() : ''}</span>
          <span>{dailyActive[dailyActive.length - 1] ? new Date(dailyActive[dailyActive.length - 1].date).toLocaleDateString() : ''}</span>
        </div>
      </div>

      {/* User Engagement Table */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">User Engagement Details</h2>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="engagement">Sort by Engagement Score</option>
            <option value="messages">Sort by Messages</option>
            <option value="tokens">Sort by Tokens Used</option>
            <option value="lastActive">Sort by Last Active</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">User Email</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Messages</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Tokens Used</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Days Active</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Last Active</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Engagement Score</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.slice(0, 50).map((user) => (
                <tr key={user.userId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-900">{user.userEmail}</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-600">{user.totalMessages}</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-600">{(user.tokensUsed / 1000).toFixed(1)}K</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-600">{user.daysActive}</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-600">
                    {new Date(user.lastActive).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-medium text-blue-600">
                    {user.engagementScore.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
