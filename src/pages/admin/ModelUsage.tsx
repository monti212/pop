import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Zap, Image as ImageIcon, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import { supabase } from '../../services/authService';

const Brand = {
  sand: '#F7F5F2',
  navy: '#19324A',
  teal: '#0096B3',
  sky: '#7DF9FF',
  orange: '#FF6A00',
  line: '#EAE7E3',
};

const COLORS = [Brand.teal, Brand.orange, Brand.navy, Brand.sky];

interface DailySummary {
  usage_date: string;
  u_2_0_tokens: number;
  u_2_0_extended_tokens: number;
  craft_1_images: number;
  craft_0_images: number;
  total_cost: number;
}

interface ModelStats {
  name: string;
  type: 'text' | 'image';
  usage: number;
  unit: string;
  color: string;
}

const ModelUsage: React.FC = () => {
  const [dailyData, setDailyData] = useState<DailySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [totalStats, setTotalStats] = useState({
    totalTokens: 0,
    totalImages: 0,
    avgDailyTokens: 0,
    avgDailyImages: 0,
  });

  const fetchUsageData = async () => {
    setIsLoading(true);
    try {
      const daysBack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data, error } = await supabase
        .from('model_usage_daily_summary')
        .select('*')
        .gte('usage_date', startDate.toISOString().split('T')[0])
        .order('usage_date', { ascending: true });

      if (error) throw error;

      setDailyData(data || []);

      if (data && data.length > 0) {
        const totalTokens = data.reduce((sum, day) =>
          sum + (day.u_2_0_tokens || 0) + (day.u_2_0_extended_tokens || 0), 0
        );
        const totalImages = data.reduce((sum, day) =>
          sum + (day.craft_1_images || 0) + (day.craft_0_images || 0), 0
        );

        setTotalStats({
          totalTokens,
          totalImages,
          avgDailyTokens: Math.round(totalTokens / data.length),
          avgDailyImages: Math.round(totalImages / data.length),
        });
      }
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, [dateRange]);

  const chartData = dailyData.map(day => ({
    date: new Date(day.usage_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    'U 2.0': Math.round((day.u_2_0_tokens || 0) / 1000),
    'U 2.0 Extended': Math.round((day.u_2_0_extended_tokens || 0) / 1000),
    'Craft-1': day.craft_1_images || 0,
    'Craft-0': day.craft_0_images || 0,
  }));

  const currentPeriodStats: ModelStats[] = [
    {
      name: 'U 2.0',
      type: 'text',
      usage: dailyData.reduce((sum, d) => sum + (d.u_2_0_tokens || 0), 0),
      unit: 'tokens',
      color: COLORS[0],
    },
    {
      name: 'U 2.0 Extended',
      type: 'text',
      usage: dailyData.reduce((sum, d) => sum + (d.u_2_0_extended_tokens || 0), 0),
      unit: 'tokens',
      color: COLORS[1],
    },
    {
      name: 'Craft-1',
      type: 'image',
      usage: dailyData.reduce((sum, d) => sum + (d.craft_1_images || 0), 0),
      unit: 'images',
      color: COLORS[2],
    },
    {
      name: 'Craft-0',
      type: 'image',
      usage: dailyData.reduce((sum, d) => sum + (d.craft_0_images || 0), 0),
      unit: 'images',
      color: COLORS[3],
    },
  ];

  const pieData = currentPeriodStats.map(stat => ({
    name: stat.name,
    value: stat.usage,
    color: stat.color,
  })).filter(d => d.value > 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: Brand.teal }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: Brand.navy }}>Model Usage Analytics</h2>
          <p className="text-sm mt-1" style={{ color: Brand.navy, opacity: 0.7 }}>
            Track usage across all Uhuru AI models
          </p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === range ? 'shadow-sm' : ''
              }`}
              style={{
                background: dateRange === range ? Brand.teal : '#fff',
                color: dateRange === range ? '#fff' : Brand.navy,
                border: `1px solid ${dateRange === range ? Brand.teal : Brand.line}`,
              }}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
          <button
            onClick={fetchUsageData}
            className="p-2 rounded-lg hover:bg-white/80 transition-colors"
            style={{ color: Brand.navy, border: `1px solid ${Brand.line}` }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          title="Total Tokens"
          value={totalStats.totalTokens.toLocaleString()}
          subtitle={`${totalStats.avgDailyTokens.toLocaleString()} avg/day`}
          color={Brand.teal}
        />
        <StatCard
          icon={<ImageIcon className="w-5 h-5" />}
          title="Total Images"
          value={totalStats.totalImages.toLocaleString()}
          subtitle={`${totalStats.avgDailyImages.toLocaleString()} avg/day`}
          color={Brand.orange}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          title="Active Models"
          value="4"
          subtitle="All models operational"
          color={Brand.navy}
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          title="Period"
          value={dateRange === '7d' ? '7 Days' : dateRange === '30d' ? '30 Days' : '90 Days'}
          subtitle={`${dailyData.length} days of data`}
          color={Brand.sky}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Model Usage Distribution" subtitle="Current period breakdown">
          <div className="h-[300px] flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                No usage data available for this period
              </p>
            )}
          </div>
        </Card>

        <Card title="Model Statistics" subtitle="Detailed usage metrics">
          <div className="space-y-4">
            {currentPeriodStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: stat.color }}
                  />
                  <div>
                    <p className="text-sm font-medium" style={{ color: Brand.navy }}>
                      {stat.name}
                    </p>
                    <p className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
                      {stat.type === 'text' ? 'Text Generation' : 'Image Generation'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold" style={{ color: Brand.navy }}>
                    {stat.usage.toLocaleString()}
                  </p>
                  <p className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
                    {stat.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Text Model Usage Over Time" subtitle="Token consumption (in thousands)">
        <div className="h-[300px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={Brand.line} />
                <XAxis dataKey="date" stroke={Brand.navy} style={{ fontSize: '12px' }} />
                <YAxis stroke={Brand.navy} style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: `1px solid ${Brand.line}`,
                    borderRadius: '8px',
                    color: Brand.navy,
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="U 2.0"
                  stroke={COLORS[0]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[0] }}
                />
                <Line
                  type="monotone"
                  dataKey="U 2.0 Extended"
                  stroke={COLORS[1]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[1] }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                No usage data available for this period
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card title="Image Model Usage Over Time" subtitle="Images generated">
        <div className="h-[300px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={Brand.line} />
                <XAxis dataKey="date" stroke={Brand.navy} style={{ fontSize: '12px' }} />
                <YAxis stroke={Brand.navy} style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: `1px solid ${Brand.line}`,
                    borderRadius: '8px',
                    color: Brand.navy,
                  }}
                />
                <Legend />
                <Bar dataKey="Craft-1" fill={COLORS[2]} radius={[8, 8, 0, 0]} />
                <Bar dataKey="Craft-0" fill={COLORS[3]} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                No usage data available for this period
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

function StatCard({
  icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl p-4 border" style={{ borderColor: Brand.line, background: '#fff' }}>
      <div className="flex items-center gap-2 mb-3" style={{ color }}>
        {icon}
        <span className="text-xs uppercase tracking-wide opacity-80">{title}</span>
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: Brand.navy }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
        {subtitle}
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: Brand.line, background: '#fff' }}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold" style={{ color: Brand.navy }}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm mt-1" style={{ color: Brand.navy, opacity: 0.6 }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

export default ModelUsage;
