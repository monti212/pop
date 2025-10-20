import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Download, CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/authService';
import SecurityMonitoring from './SecurityMonitoring';
import ModelUsage from './ModelUsage';
import ModelCost from './ModelCost';

// OrionX / Uhuru brand tokens
const Brand = {
  sand: '#F7F5F2',
  navy: '#19324A',
  teal: '#0096B3',
  sky: '#7DF9FF',
  orange: '#FF6A00',
  line: '#EAE7E3',
};

const pages = [
  'Dashboard',
  'Cohorts & Users',
  'Security Monitoring',
  'Model Usage',
  'Model Cost',
  'Feedback & Triage',
  'Chat Analytics',
  'Docs Analytics',
  'Sheets Analytics',
  'Files Analytics',
  'Performance & Reliability',
  'Experiments & Flags',
  'Exports',
  'Admin Settings',
];

interface DashboardData {
  activeUsersNow: number;
  newFeedback1h: number;
  totalUsers: number;
  totalMessages: number;
  totalConversations: number;
}

const ComprehensiveAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [active, setActive] = useState('Dashboard');
  const [live, setLive] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Fetch real-time dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get real-time metrics with timeout
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Fetch all counts in parallel with timeout protection
      const timeout = (ms: number) => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), ms)
      );

      const fetchWithTimeout = async <T,>(promise: Promise<T>, ms = 10000): Promise<T> => {
        return Promise.race([promise, timeout(ms)]) as Promise<T>;
      };

      const [
        { count: totalUsers },
        { count: activeUsersNow },
        { count: newFeedback1h },
        { count: totalMessages },
        { count: totalConversations }
      ] = await Promise.all([
        fetchWithTimeout(supabase.from('user_profiles').select('*', { count: 'exact', head: true })),
        fetchWithTimeout(supabase.from('user_profiles').select('*', { count: 'exact', head: true }).gte('last_active_at', thirtyMinutesAgo)),
        fetchWithTimeout(supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', oneHourAgo)),
        fetchWithTimeout(supabase.from('messages').select('*', { count: 'exact', head: true })),
        fetchWithTimeout(supabase.from('conversations').select('*', { count: 'exact', head: true }))
      ]);

      const data: DashboardData = {
        activeUsersNow: activeUsersNow || 0,
        newFeedback1h: newFeedback1h || 0,
        totalUsers: totalUsers || 0,
        totalMessages: totalMessages || 0,
        totalConversations: totalConversations || 0,
      };

      setDashboardData(data);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
      // Set default data even on error so the page still renders
      setDashboardData({
        activeUsersNow: 0,
        newFeedback1h: 0,
        totalUsers: 0,
        totalMessages: 0,
        totalConversations: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();

    // Set up auto-refresh if live mode is enabled
    let interval: NodeJS.Timeout | null = null;
    if (live) {
      interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchDashboardData, live]);

  return (
    <div className="min-h-screen w-full" style={{ background: Brand.sand }}>
      <Header live={live} setLive={setLive} onRefresh={fetchDashboardData} />
      <div className="flex">
        <Sidebar
          active={active}
          setActive={setActive}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
        <main className="flex-1 p-6 md:p-8">
          <FiltersBar />
          <div className="mt-6">
            {isLoading ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin" style={{ color: Brand.teal }} />
                  <p className="text-lg" style={{ color: Brand.navy }}>Loading dashboard data...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-100 rounded-lg p-6 max-w-2xl mx-auto">
                <div className="flex items-start">
                  <AlertTriangle className="w-6 h-6 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-red-800 font-medium text-lg">Dashboard Loading Error</h3>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                    <button
                      onClick={fetchDashboardData}
                      className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm hover:bg-red-200 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {active === 'Dashboard' && <Dashboard data={dashboardData} />}
                {active === 'Cohorts & Users' && <Cohorts data={dashboardData} />}
                {active === 'Security Monitoring' && <SecurityMonitoring />}
                {active === 'Model Usage' && <ModelUsage />}
                {active === 'Model Cost' && <ModelCost />}
                {active === 'Feedback & Triage' && <Triage />}
                {active === 'Chat Analytics' && <Surface name="Chat" data={dashboardData} />}
                {active === 'Docs Analytics' && <Surface name="Docs" data={dashboardData} />}
                {active === 'Sheets Analytics' && <Surface name="Sheets" data={dashboardData} />}
                {active === 'Files Analytics' && <Surface name="Files" data={dashboardData} />}
                {active === 'Performance & Reliability' && <Performance />}
                {active === 'Experiments & Flags' && <Flags />}
                {active === 'Exports' && <Exports />}
                {active === 'Admin Settings' && <Settings />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

function Header({ live, setLive, onRefresh }: { live: boolean; setLive: (b: boolean) => void; onRefresh: () => void }) {
  const tealStyle: any = { ['--teal']: Brand.teal };

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{ borderColor: Brand.line, background: 'rgba(247,245,242,0.8)', backdropFilter: 'saturate(120%) blur(8px)' }}
    >
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link 
            to="/"
            className="p-2 rounded-lg hover:bg-white/80 transition-colors"
            style={{ color: Brand.navy }}
            title="Back to Chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="h-8 w-8 rounded-full" style={{ background: Brand.teal }} />
          <div className="font-semibold" style={{ color: Brand.navy }}>Uhuru Admin</div>
          <div className="hidden md:flex items-center gap-2 ml-4 text-xs">
            <span className="opacity-70" style={{ color: Brand.navy }}>Build</span>
            <Badge>v1.0.0</Badge>
            <span className="opacity-70" style={{ color: Brand.navy }}>Env</span>
            <Badge tone="navy">Production</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg hover:bg-white/80 transition-colors"
            style={{ color: Brand.navy }}
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <label className="flex items-center gap-2 text-xs" style={{ color: Brand.navy }}>
            <span className="inline-flex items-center gap-1"><Dot live={live} /> Live</span>
            <input
              type="checkbox"
              checked={live}
              onChange={(e) => setLive(e.target.checked)}
              className="accent-[var(--teal)]"
              style={tealStyle}
            />
          </label>
          <button className="rounded-xl px-3 py-1.5 text-xs font-medium" style={{ color: Brand.navy, background: '#fff', border: `1px solid ${Brand.line}` }}>
            Save view
          </button>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ active, setActive, collapsed, setCollapsed }: {
  active: string;
  setActive: (s: string) => void;
  collapsed: boolean;
  setCollapsed: (b: boolean) => void;
}) {
  return (
    <aside
      className={`hidden md:block border-r min-h-[calc(100vh-56px)] transition-all duration-300 relative`}
      style={{
        borderColor: Brand.line,
        background: '#fff',
        width: collapsed ? '60px' : '260px'
      }}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-4 z-10 p-1.5 rounded-full border shadow-sm hover:shadow-md transition-all"
        style={{
          background: '#fff',
          borderColor: Brand.line,
          color: Brand.navy
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
      <nav className="py-4">
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => setActive(p)}
            className={`w-full text-left px-5 py-2.5 text-sm transition rounded-r-2xl ${active === p ? 'font-semibold' : ''} ${collapsed ? 'flex items-center justify-center' : ''}`}
            style={{
              color: Brand.navy,
              background: active === p ? 'linear-gradient(90deg, rgba(0,150,179,0.08), rgba(0,150,179,0.0))' : 'transparent',
              borderLeft: active === p ? `3px solid ${Brand.teal}` : '3px solid transparent',
            }}
            title={collapsed ? p : ''}
          >
            {collapsed ? p.split(' ').map(word => word[0]).join('').substring(0, 2) : p}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function FiltersBar() {
  return (
    <section className="rounded-2xl border p-3 md:p-4 grid grid-cols-2 md:grid-cols-6 gap-2" style={{ borderColor: Brand.line, background: '#fff' }}>
      {['Last 24h','Country','Device','Network','Cohort','Build'].map((l,i)=> (
        <div key={i} className="flex flex-col">
          <label className="text-[11px] uppercase tracking-wide" style={{ color: Brand.navy, opacity: 0.6 }}>{l}</label>
          <div className="mt-1 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: Brand.line, color: Brand.navy }}>Select</div>
        </div>
      ))}
    </section>
  );
}

function Dashboard({ data }: { data: DashboardData | null }) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      <CardGrid>
        <KPI title="Active users (now)" value={data.activeUsersNow.toString()} delta="▲12%" />
        <KPI title="New feedback (1h)" value={data.newFeedback1h.toString()} delta="+6" tone="teal" />
        <KPI title="Total Users" value={data.totalUsers.toString()} />
        <KPI title="Total Messages" value={data.totalMessages.toString()} />
        <KPI title="Total Conversations" value={data.totalConversations.toString()} />
      </CardGrid>

      <Card title="Platform Overview">
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: Brand.navy }}>
            Real-time platform metrics are displayed above. Additional analytics and detailed breakdowns 
            are available in the specialized pages using the sidebar navigation.
          </p>
        </div>
      </Card>
    </div>
  );
}

function Cohorts({ data }: { data: DashboardData | null }) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      <Card title="User Analytics">
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: Brand.navy }}>
            Detailed user cohort analysis and segmentation tools are being developed. 
            Basic user metrics are available in the main Dashboard.
          </p>
        </div>
      </Card>
    </div>
  );
}

function Triage() {
  return (
    <div className="space-y-6">
      <Card title="Feedback & Triage">
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: Brand.navy }}>
            User feedback collection and triage system is being developed. 
            Current feedback can be viewed through support channels.
          </p>
        </div>
      </Card>
    </div>
  );
}

function Surface({ name, data }: { name: string; data: DashboardData | null }) {
  if (!data) return null;


  return (
    <div className="space-y-6">
      <Card title={`${name} Analytics`}>
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: Brand.navy }}>
            {name} analytics and detailed metrics are being developed. 
            Basic usage data is available in the main Dashboard.
          </p>
        </div>
      </Card>
    </div>
  );
}


function Performance() {
  return (
    <div className="space-y-6">
      <Card title="Performance & Reliability">
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: Brand.navy }}>
            Performance monitoring and reliability metrics are being developed.
          </p>
        </div>
      </Card>
    </div>
  );
}

function Flags() {
  return (
    <Card title="Feature Flags & Experiments">
      <div className="text-center py-8">
        <p className="text-sm" style={{ color: Brand.navy }}>
          Feature flag management and A/B testing framework are being developed.
        </p>
      </div>
    </Card>
  );
}

function Exports() {
  return (
    <Card title="Data Exports">
      <div className="text-center py-8">
        <p className="text-sm" style={{ color: Brand.navy }}>
          Data export functionality is being developed. Contact support for custom data exports.
        </p>
      </div>
    </Card>
  );
}

function Settings() {
  return (
    <Card title="Admin Settings">
      <div className="text-center py-8">
        <p className="text-sm" style={{ color: Brand.navy }}>
          Administrative settings and user management tools are being developed.
        </p>
      </div>
    </Card>
  );
}

/* ——— UI bits ——— */
function KPI({ title, value, delta, tone = 'teal' }: { title: string; value: string; delta?: string; tone?: 'teal'|'navy'|'orange' }) {
  const toneMap = { teal: Brand.teal, navy: Brand.navy, orange: Brand.orange };
  return (
    <div className="rounded-2xl p-4 border" style={{ borderColor: Brand.line, background: '#fff' }}>
      <div className="text-xs uppercase tracking-wide" style={{ color: Brand.navy, opacity: 0.6 }}>{title}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-2xl font-semibold" style={{ color: Brand.navy }}>{value}</div>
        {delta && <span className="text-xs" style={{ color: toneMap[tone] }}>{delta}</span>}
      </div>
    </div>
  );
}

function CardGrid({ children }: { children: any }) {
  return <div className="grid md:grid-cols-3 gap-4">{children}</div>;
}

function CardRow({ children }: { children: any }) {
  return <div className="grid md:grid-cols-3 gap-4">{children}</div>;
}

function Card({ title, children, subtitle }: { title: string; children: any; subtitle?: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: Brand.line, background: '#fff' }}>
      <div className="mb-3">
        <div className="text-sm font-semibold" style={{ color: Brand.navy }}>{title}</div>
        {subtitle && <div className="text-xs opacity-60" style={{ color: Brand.navy }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function ChartCard({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Card title={title} subtitle={subtitle}>
      <div className="h-40 w-full rounded-xl" style={{ background: `linear-gradient(180deg, rgba(0,150,179,0.12), rgba(0,150,179,0.04))` }} />
    </Card>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string[])[] }) {
  return (
    <div className="overflow-auto rounded-xl border" style={{ borderColor: Brand.line }}>
      <table className="min-w-full text-sm" style={{ color: Brand.navy }}>
        <thead className="text-left" style={{ background: 'rgba(25,50,74,0.04)' }}>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 font-medium whitespace-nowrap border-r last:border-r-0" style={{ borderColor: Brand.line }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-t" style={{ borderColor: Brand.line }}>
              {r.map((c, ci) => (
                <td key={ci} className="px-3 py-2 whitespace-nowrap border-r last:border-r-0" style={{ borderColor: Brand.line }}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Badge({ children, tone = 'teal' }: { children: any; tone?: 'teal'|'navy'|'orange' }) {
  const bg = tone === 'teal' ? 'rgba(0,150,179,0.12)' : tone === 'orange' ? 'rgba(255,106,0,0.12)' : 'rgba(25,50,74,0.10)';
  const color = tone === 'teal' ? Brand.teal : tone === 'orange' ? Brand.orange : Brand.navy;
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium" style={{ background: bg, color }}>{children}</span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b last:border-b-0 py-2" style={{ borderColor: Brand.line }}>
      <div className="opacity-70" style={{ color: Brand.navy }}>{label}</div>
      <div className="font-medium" style={{ color: Brand.navy }}>{value}</div>
    </div>
  );
}


function Dot({ live }: { live: boolean }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${live ? '' : 'opacity-40'}`} style={{ background: Brand.orange }} />;
}

export default ComprehensiveAdminDashboard;