import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  Coins,
  DollarSign,
  Inbox,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';

const priorityTools = [
  {
    to: '/supa-admin/error-logs',
    title: 'Operations Inbox',
    description: 'Triage application issues, assign owners, and track resolutions.',
    icon: Inbox,
    tone: 'bg-rose-50 text-rose-700',
  },
  {
    to: '/supa-admin/token-usage',
    title: 'Token Usage',
    description: 'Review total, monthly, and daily allocation health.',
    icon: Coins,
    tone: 'bg-cyan-50 text-cyan-700',
  },
  {
    to: '/supa-admin/usage-intelligence',
    title: 'Usage Intelligence',
    description: 'Detect unusual activity and understand adoption patterns.',
    icon: ShieldAlert,
    tone: 'bg-amber-50 text-amber-700',
  },
  {
    to: '/supa-admin/finance',
    title: 'Financial Command Center',
    description: 'Monitor revenue, operating cost, margin, and runway.',
    icon: TrendingUp,
    tone: 'bg-emerald-50 text-emerald-700',
  },
];

const systemTools = [
  {
    to: '/supa-admin/monitor',
    title: 'Live System Monitor',
    description: 'Health and availability',
    icon: Activity,
  },
  {
    to: '/supa-admin/performance',
    title: 'Performance Analytics',
    description: 'Latency and throughput',
    icon: BarChart3,
  },
  {
    to: '/supa-admin/token-cost',
    title: 'Token Cost Tracking',
    description: 'Cost and consumption',
    icon: DollarSign,
  },
  {
    to: '/supa-admin/live',
    title: 'Live Command Center',
    description: 'Real-time controls',
    icon: Zap,
  },
  {
    to: '/supa-admin/daily-log',
    title: 'Daily Work Logger',
    description: 'Private operations notes',
    icon: ClipboardList,
  },
];

export default function SupaAdmin() {
  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="rounded-2xl bg-slate-950 p-3 text-white shadow-sm">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Uhuru AI operations
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                Super Admin
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                One place to operate, monitor, and govern the learning platform.
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to main chat
            <MessageSquare className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
        <section aria-labelledby="priority-tools-heading">
          <div className="mb-4">
            <h2 id="priority-tools-heading" className="text-lg font-semibold text-slate-900">
              Priority operations
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              The tools used most often to keep the platform healthy and accountable.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {priorityTools.map(({ to, title, description, icon: Icon, tone }) => (
              <Link
                key={to}
                to={to}
                className="group flex min-h-56 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className={`rounded-xl p-2.5 ${tone}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <ArrowUpRight
                    className="h-5 w-5 text-slate-300 transition group-hover:text-slate-600"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-auto pt-8">
                  <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="system-tools-heading">
          <div className="mb-4">
            <h2 id="system-tools-heading" className="text-lg font-semibold text-slate-900">
              System tools
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Specialist diagnostics, controls, and internal records.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              {systemTools.map(({ to, title, description, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                >
                  <span className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">{title}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">{description}</span>
                  </span>
                  <ArrowUpRight
                    className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-600"
                    aria-hidden="true"
                  />
                </Link>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}
