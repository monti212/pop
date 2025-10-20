import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingDown, TrendingUp, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
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
  u_2_0_cost: number;
  u_2_0_extended_cost: number;
  craft_1_cost: number;
  craft_0_cost: number;
  total_cost: number;
}

interface ModelCostStats {
  name: string;
  cost: number;
  percentage: number;
  color: string;
  apiModel: string;
}

const ModelCost: React.FC = () => {
  const [dailyData, setDailyData] = useState<DailySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [totalStats, setTotalStats] = useState({
    totalCost: 0,
    avgDailyCost: 0,
    projectedMonthlyCost: 0,
    costTrend: 0,
  });

  const fetchCostData = async () => {
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
        const totalCost = data.reduce((sum, day) => sum + (day.total_cost || 0), 0);
        const avgDailyCost = totalCost / data.length;
        const projectedMonthlyCost = avgDailyCost * 30;

        const recentDays = data.slice(-7);
        const olderDays = data.slice(-14, -7);
        const recentAvg = recentDays.reduce((sum, d) => sum + (d.total_cost || 0), 0) / recentDays.length;
        const olderAvg = olderDays.reduce((sum, d) => sum + (d.total_cost || 0), 0) / (olderDays.length || 1);
        const costTrend = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

        setTotalStats({
          totalCost,
          avgDailyCost,
          projectedMonthlyCost,
          costTrend,
        });
      }
    } catch (error) {
      console.error('Error fetching cost data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCostData();
  }, [dateRange]);

  const chartData = dailyData.map(day => ({
    date: new Date(day.usage_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    'U 2.0': parseFloat((day.u_2_0_cost || 0).toFixed(2)),
    'U 2.0 Extended': parseFloat((day.u_2_0_extended_cost || 0).toFixed(2)),
    'Craft-1': parseFloat((day.craft_1_cost || 0).toFixed(2)),
    'Craft-0': parseFloat((day.craft_0_cost || 0).toFixed(2)),
    total: parseFloat((day.total_cost || 0).toFixed(2)),
  }));

  const cumulativeData = chartData.map((item, index) => {
    const cumulative = chartData.slice(0, index + 1).reduce((sum, d) => sum + d.total, 0);
    return {
      ...item,
      cumulative: parseFloat(cumulative.toFixed(2)),
    };
  });

  const totalCostByModel = {
    u20: dailyData.reduce((sum, d) => sum + (d.u_2_0_cost || 0), 0),
    u20Extended: dailyData.reduce((sum, d) => sum + (d.u_2_0_extended_cost || 0), 0),
    craft1: dailyData.reduce((sum, d) => sum + (d.craft_1_cost || 0), 0),
    craft0: dailyData.reduce((sum, d) => sum + (d.craft_0_cost || 0), 0),
  };

  const totalAllModels = Object.values(totalCostByModel).reduce((sum, cost) => sum + cost, 0);

  const modelCostStats: ModelCostStats[] = [
    {
      name: 'U 2.0',
      cost: totalCostByModel.u20,
      percentage: totalAllModels > 0 ? (totalCostByModel.u20 / totalAllModels) * 100 : 0,
      color: COLORS[0],
      apiModel: 'gpt-5-mini',
    },
    {
      name: 'U 2.0 Extended',
      cost: totalCostByModel.u20Extended,
      percentage: totalAllModels > 0 ? (totalCostByModel.u20Extended / totalAllModels) * 100 : 0,
      color: COLORS[1],
      apiModel: 'gpt-5',
    },
    {
      name: 'Craft-1',
      cost: totalCostByModel.craft1,
      percentage: totalAllModels > 0 ? (totalCostByModel.craft1 / totalAllModels) * 100 : 0,
      color: COLORS[2],
      apiModel: 'dall-e-3',
    },
    {
      name: 'Craft-0',
      cost: totalCostByModel.craft0,
      percentage: totalAllModels > 0 ? (totalCostByModel.craft0 / totalAllModels) * 100 : 0,
      color: COLORS[3],
      apiModel: 'gpt-image-1',
    },
  ];

  const pieData = modelCostStats
    .map(stat => ({
      name: stat.name,
      value: parseFloat(stat.cost.toFixed(2)),
      color: stat.color,
    }))
    .filter(d => d.value > 0);

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
          <h2 className="text-2xl font-bold" style={{ color: Brand.navy }}>Model Cost Analytics</h2>
          <p className="text-sm mt-1" style={{ color: Brand.navy, opacity: 0.7 }}>
            Track costs across all Uhuru AI models (OpenAI pricing)
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
            onClick={fetchCostData}
            className="p-2 rounded-lg hover:bg-white/80 transition-colors"
            style={{ color: Brand.navy, border: `1px solid ${Brand.line}` }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          title="Total Cost"
          value={`$${totalStats.totalCost.toFixed(2)}`}
          subtitle={`${dateRange === '7d' ? 'Last 7 days' : dateRange === '30d' ? 'Last 30 days' : 'Last 90 days'}`}
          color={Brand.teal}
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          title="Daily Average"
          value={`$${totalStats.avgDailyCost.toFixed(2)}`}
          subtitle="Per day cost"
          color={Brand.orange}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          title="Monthly Projection"
          value={`$${totalStats.projectedMonthlyCost.toFixed(2)}`}
          subtitle="Based on average"
          color={Brand.navy}
        />
        <StatCard
          icon={totalStats.costTrend >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          title="Cost Trend"
          value={`${totalStats.costTrend >= 0 ? '+' : ''}${totalStats.costTrend.toFixed(1)}%`}
          subtitle="7-day comparison"
          color={totalStats.costTrend >= 0 ? Brand.orange : Brand.teal}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Cost Distribution" subtitle="Breakdown by model">
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
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                No cost data available for this period
              </p>
            )}
          </div>
        </Card>

        <Card title="Model Cost Details" subtitle="OpenAI equivalent pricing">
          <div className="space-y-4">
            {modelCostStats.map((stat, index) => (
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
                      Equivalent: {stat.apiModel}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold" style={{ color: Brand.navy }}>
                    ${stat.cost.toFixed(2)}
                  </p>
                  <p className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
                    {stat.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Daily Cost Breakdown" subtitle="Cost per model over time">
        <div className="h-[350px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={Brand.line} />
                <XAxis dataKey="date" stroke={Brand.navy} style={{ fontSize: '12px' }} />
                <YAxis stroke={Brand.navy} style={{ fontSize: '12px' }} />
                <Tooltip
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  contentStyle={{
                    background: '#fff',
                    border: `1px solid ${Brand.line}`,
                    borderRadius: '8px',
                    color: Brand.navy,
                  }}
                />
                <Legend />
                <Bar dataKey="U 2.0" stackId="a" fill={COLORS[0]} radius={[0, 0, 0, 0]} />
                <Bar dataKey="U 2.0 Extended" stackId="a" fill={COLORS[1]} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Craft-1" stackId="a" fill={COLORS[2]} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Craft-0" stackId="a" fill={COLORS[3]} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                No cost data available for this period
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card title="Cumulative Cost Over Time" subtitle="Total spending accumulation">
        <div className="h-[300px]">
          {cumulativeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={Brand.teal} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={Brand.teal} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={Brand.line} />
                <XAxis dataKey="date" stroke={Brand.navy} style={{ fontSize: '12px' }} />
                <YAxis stroke={Brand.navy} style={{ fontSize: '12px' }} />
                <Tooltip
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  contentStyle={{
                    background: '#fff',
                    border: `1px solid ${Brand.line}`,
                    borderRadius: '8px',
                    color: Brand.navy,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke={Brand.teal}
                  strokeWidth={2}
                  fill="url(#costGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                No cost data available for this period
              </p>
            </div>
          )}
        </div>
      </Card>

      <div
        className="rounded-2xl p-4 border flex items-start gap-3"
        style={{ borderColor: Brand.line, background: 'rgba(0,150,179,0.05)' }}
      >
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: Brand.teal }} />
        <div>
          <p className="text-sm font-medium" style={{ color: Brand.navy }}>
            Pricing Information
          </p>
          <p className="text-xs mt-1" style={{ color: Brand.navy, opacity: 0.7 }}>
            All costs shown are based on OpenAI's pricing for equivalent models. U 2.0 uses gpt-5-mini pricing,
            U 2.0 Extended uses gpt-5 pricing, Craft-1 uses dall-e-3 pricing, and Craft-0 uses gpt-image-1 pricing.
          </p>
        </div>
      </div>
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

export default ModelCost;
