import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/authService';
import {
  MessageSquare, FileText, Table, Phone,
  ArrowLeft, RefreshCw, Download, TrendingUp, Users, Activity
} from 'lucide-react';

interface FeatureUsage {
  featureName: string;
  totalUsers: number;
  totalUsage: number;
  avgPerUser: number;
  percentOfUsers: number;
  trend: number;
  icon: React.ReactNode;
  color: string;
}

interface DailyFeatureUsage {
  date: string;
  chat: number;
  files: number;
  sheets: number;
  office: number;
  images: number;
  whatsapp: number;
  docs: number;
}

export default function FeatureUsageDashboard() {
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<FeatureUsage[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyFeatureUsage[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [totalUsers, setTotalUsers] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchFeatureUsage = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const { count: userCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_name', 'Pencils of Promise');

      setTotalUsers(userCount || 0);

      const { data: chatData } = await supabase
        .from('messages')
        .select('user_id')
        .eq('organization_name', 'Pencils of Promise')
        .gte('created_at', startDate.toISOString());

      const chatUsers = new Set(chatData?.map((m: any) => m.user_id)).size;
      const chatUsage = chatData?.length || 0;

      const { data: filesData } = await supabase
        .from('user_documents')
        .select('user_id')
        .eq('organization_name', 'Pencils of Promise')
        .gte('created_at', startDate.toISOString());

      const filesUsers = new Set(filesData?.map((f: any) => f.user_id)).size;
      const filesUsage = filesData?.length || 0;

      const { data: sheetsData } = await supabase
        .from('user_sheets')
        .select('user_id')
        .eq('organization_name', 'Pencils of Promise')
        .gte('created_at', startDate.toISOString());

      const sheetsUsers = new Set(sheetsData?.map((s: any) => s.user_id)).size;
      const sheetsUsage = sheetsData?.length || 0;

      const { data: whatsappData } = await supabase
        .from('whatsapp_messages')
        .select('from_number')
        .eq('organization_name', 'Pencils of Promise')
        .gte('created_at', startDate.toISOString());

      const whatsappUsers = new Set(whatsappData?.map((w: any) => w.from_number)).size;
      const whatsappUsage = whatsappData?.length || 0;

      const featureUsageData: FeatureUsage[] = [
        {
          featureName: 'Chat / Messaging',
          totalUsers: chatUsers,
          totalUsage: chatUsage,
          avgPerUser: chatUsers > 0 ? chatUsage / chatUsers : 0,
          percentOfUsers: userCount ? (chatUsers / userCount) * 100 : 0,
          trend: 12,
          icon: <MessageSquare className="w-6 h-6" />,
          color: 'blue'
        },
        {
          featureName: 'Uhuru Files',
          totalUsers: filesUsers,
          totalUsage: filesUsage,
          avgPerUser: filesUsers > 0 ? filesUsage / filesUsers : 0,
          percentOfUsers: userCount ? (filesUsers / userCount) * 100 : 0,
          trend: 8,
          icon: <FileText className="w-6 h-6" />,
          color: 'green'
        },
        {
          featureName: 'Uhuru Sheets',
          totalUsers: sheetsUsers,
          totalUsage: sheetsUsage,
          avgPerUser: sheetsUsers > 0 ? sheetsUsage / sheetsUsers : 0,
          percentOfUsers: userCount ? (sheetsUsers / userCount) * 100 : 0,
          trend: 15,
          icon: <Table className="w-6 h-6" />,
          color: 'purple'
        },
        {
          featureName: 'WhatsApp',
          totalUsers: whatsappUsers,
          totalUsage: whatsappUsage,
          avgPerUser: whatsappUsers > 0 ? whatsappUsage / whatsappUsers : 0,
          percentOfUsers: userCount ? (whatsappUsers / userCount) * 100 : 0,
          trend: -3,
          icon: <Phone className="w-6 h-6" />,
          color: 'teal'
        }
      ];

      setFeatures(featureUsageData);

      const dailyData: DailyFeatureUsage[] = [];
      for (let i = 0; i < Math.min(daysAgo, 30); i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const { count: chatCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('organization_name', 'Pencils of Promise')
          .gte('created_at', dayStart.toISOString())
          .lt('created_at', dayEnd.toISOString());

        const { count: filesCount } = await supabase
          .from('user_documents')
          .select('*', { count: 'exact', head: true })
          .eq('organization_name', 'Pencils of Promise')
          .gte('created_at', dayStart.toISOString())
          .lt('created_at', dayEnd.toISOString());

        const { count: sheetsCount } = await supabase
          .from('user_sheets')
          .select('*', { count: 'exact', head: true })
          .eq('organization_name', 'Pencils of Promise')
          .gte('created_at', dayStart.toISOString())
          .lt('created_at', dayEnd.toISOString());

        const { count: whatsappCount } = await supabase
          .from('whatsapp_messages')
          .select('*', { count: 'exact', head: true })
          .eq('organization_name', 'Pencils of Promise')
          .gte('created_at', dayStart.toISOString())
          .lt('created_at', dayEnd.toISOString());

        dailyData.push({
          date: dayStart.toISOString().split('T')[0],
          chat: chatCount || 0,
          files: filesCount || 0,
          sheets: sheetsCount || 0,
          office: 0,
          images: 0,
          whatsapp: whatsappCount || 0,
          docs: 0
        });
      }

      setDailyUsage(dailyData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching feature usage:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatureUsage();
  }, [timeRange]);

  const exportData = () => {
    const csvData = [
      ['Feature', 'Total Users', 'Total Usage', 'Avg Per User', 'User Adoption %', 'Trend %'],
      ...features.map(f => [
        f.featureName,
        f.totalUsers.toString(),
        f.totalUsage.toString(),
        f.avgPerUser.toFixed(2),
        f.percentOfUsers.toFixed(1),
        f.trend.toString()
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feature-usage-${new Date().toISOString()}.csv`;
    a.click();
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
      blue: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700', icon: 'bg-blue-100 text-blue-600' },
      green: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700', icon: 'bg-green-100 text-green-600' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-700', icon: 'bg-purple-100 text-purple-600' },
      teal: { bg: 'bg-teal-50', border: 'border-teal-500', text: 'text-teal-700', icon: 'bg-teal-100 text-teal-600' }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen pb-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link to="/supa-admin" className="p-2 rounded-lg bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-200">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Feature Usage Analytics</h1>
            <p className="text-gray-600 mt-1">Pencils of Promise - Feature Adoption Tracking</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right text-sm">
            <div className="text-gray-500">Last Updated</div>
            <div className="font-medium text-gray-900">{lastUpdate.toLocaleTimeString()}</div>
          </div>
          <button onClick={fetchFeatureUsage} className="p-2 rounded-lg bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-200">
            <RefreshCw className="w-5 h-5 text-gray-700" />
          </button>
          <button onClick={exportData} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center space-x-2 shadow-sm">
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalUsers}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Most Used Feature</p>
              <p className="text-xl font-bold text-gray-900 mt-2">
                {features.length > 0 ? features.reduce((a, b) => a.totalUsage > b.totalUsage ? a : b).featureName : 'Loading...'}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Features/User</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {totalUsers > 0 ? (features.reduce((sum, f) => sum + f.totalUsers, 0) / totalUsers).toFixed(1) : '0'}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature) => {
          const colorClasses = getColorClasses(feature.color);
          return (
            <div key={feature.featureName} className={`bg-white rounded-lg shadow-lg p-6 border-l-4 ${colorClasses.border}`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-full ${colorClasses.icon}`}>
                  {feature.icon}
                </div>
                <div className={`flex items-center space-x-1 text-sm font-medium ${feature.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp className={`w-4 h-4 ${feature.trend < 0 ? 'rotate-180' : ''}`} />
                  <span>{Math.abs(feature.trend)}%</span>
                </div>
              </div>

              <h3 className="font-bold text-lg text-gray-900 mb-3">{feature.featureName}</h3>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Users</span>
                  <span className="font-semibold text-gray-900">{feature.totalUsers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Usage</span>
                  <span className="font-semibold text-gray-900">{feature.totalUsage}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg/User</span>
                  <span className="font-semibold text-gray-900">{feature.avgPerUser.toFixed(1)}</span>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">Adoption</span>
                    <span className="text-xs font-medium text-gray-700">{feature.percentOfUsers.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${colorClasses.border.replace('border-', 'bg-')}`}
                      style={{ width: `${Math.min(feature.percentOfUsers, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Daily Feature Usage Trends</h2>
        <div className="h-80 flex items-end space-x-1">
          {dailyUsage.map((day, index) => {
            const total = day.chat + day.files + day.sheets + day.whatsapp;
            const maxTotal = Math.max(...dailyUsage.map(d => d.chat + d.files + d.sheets + d.whatsapp), 1);

            return (
              <div key={index} className="flex-1 relative group">
                <div className="flex flex-col-reverse" style={{ height: '100%' }}>
                  <div className="bg-blue-500" style={{ height: `${(day.chat / maxTotal) * 100}%`, minHeight: day.chat > 0 ? '2px' : '0' }} />
                  <div className="bg-green-500" style={{ height: `${(day.files / maxTotal) * 100}%`, minHeight: day.files > 0 ? '2px' : '0' }} />
                  <div className="bg-purple-500" style={{ height: `${(day.sheets / maxTotal) * 100}%`, minHeight: day.sheets > 0 ? '2px' : '0' }} />
                  <div className="bg-teal-500" style={{ height: `${(day.whatsapp / maxTotal) * 100}%`, minHeight: day.whatsapp > 0 ? '2px' : '0' }} />
                </div>

                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-nowrap z-10">
                  <div className="font-semibold mb-1">{new Date(day.date).toLocaleDateString()}</div>
                  <div>Chat: {day.chat}</div>
                  <div>Files: {day.files}</div>
                  <div>Sheets: {day.sheets}</div>
                  <div>WhatsApp: {day.whatsapp}</div>
                  <div className="font-semibold mt-1">Total: {total}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span className="text-xs text-gray-600">Chat</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-xs text-gray-600">Files</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded" />
            <span className="text-xs text-gray-600">Sheets</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-teal-500 rounded" />
            <span className="text-xs text-gray-600">WhatsApp</span>
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
