import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, DollarSign, TrendingUp, Gauge, Sliders,
  Download, Gift, Wallet, Percent, Users, Clock, AlertTriangle
} from 'lucide-react';
import { supabase } from '../services/authService';

// ---- RPC row shapes. PostgREST returns numeric/bigint as strings, so coerce at read. ----
interface OverviewRow {
  model_key: string; display_name: string;
  requests: number | string; raw_tokens: number | string; credits: number | string;
  blended_cogs_per_1m: number | string; cogs_usd: number | string;
  consumption_value_usd: number | string; gross_margin_usd: number | string; margin_pct: number | string;
}
interface Projection {
  window_days: number; credits_per_day: number | string; requests_per_day: number | string;
  active_users_window: number | string; proj_monthly_credits: number | string;
  proj_monthly_value_usd: number | string; proj_monthly_cogs_usd: number | string; proj_monthly_margin_usd: number | string;
  credits_remaining: number | string; days_to_exhaustion: number | string | null; usd_to_reup: number | string;
}
interface CashRow {
  purchase_date: string; tokens_purchased: number | string; amount_paid: number | string;
  currency: string; notes: string | null; is_complimentary: boolean;
}
interface TrendRow {
  period: string; credits: number | string; raw_tokens: number | string;
  value_usd: number | string; cogs_usd: number | string; margin_usd: number | string;
}

const ORG = 'Pencils of Promise';

// Silk "board of notes" palette.
const B = {
  silk: '#F1ECE2', silk2: '#E7E0D2', paper: '#FFFDF8',
  ink: '#1B2A3A', inkSoft: 'rgba(27,42,58,0.62)',
  teal: '#0E8C86', orange: '#E4572E', gold: '#C08A2D',
  green: '#157A50', red: '#B23A2E', line: '#E3DCCF',
};

const num = (x: number | string | null | undefined) => (x == null ? 0 : Number(x));
const usd = (x: number | string | null | undefined, dp = 2) =>
  `$${num(x).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
const compact = (x: number | string | null | undefined) => {
  const v = num(x);
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString();
};
// Date-only strings ('YYYY-MM-DD') parse as UTC midnight and shift a day in behind-UTC zones;
// anchor to local noon so the displayed date matches the stored date.
const fmtDate = (s: string) => {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00`) : new Date(s);
  return d.toLocaleDateString();
};
// Quote CSV cells so commas/quotes/newlines don't shift columns; guard against formula injection.
const csvCell = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const PERIODS = [
  { key: 'all', label: 'All time', days: 3650 },
  { key: '90', label: '90 days', days: 90 },
  { key: '30', label: '30 days', days: 30 },
];

export default function FinancialCommandCenter() {
  const [overview, setOverview] = useState<OverviewRow[]>([]);
  const [projection, setProjection] = useState<Projection | null>(null);
  const [cash, setCash] = useState<CashRow[]>([]);
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [inputShare, setInputShare] = useState(0.30);
  const [periodDays, setPeriodDays] = useState(3650);
  const [windowDays, setWindowDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const since = new Date(Date.now() - periodDays * 86400000).toISOString();
      const [ov, pr, ca, tr, cfg] = await Promise.all([
        supabase.rpc('get_financial_overview', { p_organization_name: ORG, p_since: since }),
        supabase.rpc('get_financial_projection', { p_organization_name: ORG, p_window_days: windowDays }),
        supabase.rpc('get_cash_summary', { p_organization_name: ORG }),
        supabase.rpc('get_financial_trend', { p_organization_name: ORG, p_days: Math.min(periodDays, 365), p_bucket: 'week' }),
        supabase.from('financial_config').select('input_token_share').maybeSingle(),
      ]);
      if (ov.error) throw ov.error;
      setOverview((ov.data as OverviewRow[]) || []);
      setProjection((pr.data as Projection[])?.[0] || null);
      setCash((ca.data as CashRow[]) || []);
      setTrend((tr.data as TrendRow[]) || []);
      if (cfg.data?.input_token_share != null) setInputShare(Number(cfg.data.input_token_share));
      setLastUpdate(new Date());
    } catch (e: any) {
      setError(e?.message === 'not authorized' ? 'This dashboard is restricted to super-admin accounts.' : (e?.message || 'Failed to load financials'));
    } finally {
      setLoading(false);
    }
  }, [periodDays, windowDays]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveBlend = async (share: number) => {
    setInputShare(share);
    try {
      await supabase.rpc('set_financial_blend', { p_input_share: share });
      fetchAll();
    } catch { /* keep local value; refetch will reconcile */ }
  };

  // ---- Derived totals ----
  const totalValue = overview.reduce((s, r) => s + num(r.consumption_value_usd), 0);
  const totalCogs = overview.reduce((s, r) => s + num(r.cogs_usd), 0);
  const totalMargin = totalValue - totalCogs;
  const marginPct = totalValue > 0 ? (totalMargin / totalValue) * 100 : 0;
  const cashCollected = cash.reduce((s, r) => s + num(r.amount_paid), 0);
  const valueGivenAway = Math.max(0, totalValue - cashCollected);

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ['Financial Command Center', new Date().toISOString()],
      [],
      ['Model', 'Requests', 'Raw tokens', 'Credits', 'COGS/1M', 'COGS $', 'Value $', 'Margin $', 'Margin %'],
      ...overview.map(r => [r.display_name, num(r.requests), num(r.raw_tokens), num(r.credits),
        num(r.blended_cogs_per_1m).toFixed(2), num(r.cogs_usd).toFixed(2), num(r.consumption_value_usd).toFixed(2),
        num(r.gross_margin_usd).toFixed(2), num(r.margin_pct).toFixed(1)]),
      [],
      ['Consumption value', totalValue.toFixed(2)],
      ['COGS', totalCogs.toFixed(2)],
      ['Gross margin', totalMargin.toFixed(2)],
      ['Cash collected', cashCollected.toFixed(2)],
      ['Value given away', valueGivenAway.toFixed(2)],
    ];
    const csv = rows.map(r => r.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `pop-financials-${new Date().toISOString()}.csv`; a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: B.silk }}>
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: B.teal }} />
          <p style={{ color: B.ink }}>Loading the board…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: B.silk }}>
        <Note rotate={-1} className="max-w-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" style={{ color: B.orange }} />
            <div>
              <h3 className="font-bold" style={{ color: B.ink }}>Can't show financials</h3>
              <p className="text-sm mt-1" style={{ color: B.inkSoft }}>{error}</p>
              <Link to="/supa-admin" className="text-sm font-medium mt-3 inline-block" style={{ color: B.teal }}>← Back to super admin</Link>
            </div>
          </div>
        </Note>
      </div>
    );
  }

  const trendMax = Math.max(1, ...trend.map(t => Math.max(num(t.value_usd), num(t.cogs_usd))));
  const daysLeft = projection?.days_to_exhaustion == null ? null : num(projection.days_to_exhaustion);

  return (
    <div
      className="min-h-screen"
      style={{
        color: B.ink,
        background: `radial-gradient(120% 80% at 15% 0%, rgba(255,255,255,0.65), rgba(255,255,255,0) 55%),
                     radial-gradient(120% 90% at 100% 100%, rgba(14,140,134,0.10), rgba(14,140,134,0) 55%),
                     repeating-linear-gradient(135deg, rgba(0,0,0,0.012) 0 2px, rgba(255,255,255,0) 2px 6px),
                     linear-gradient(135deg, ${B.silk}, ${B.silk2})`,
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 border-b backdrop-blur"
        style={{ background: 'rgba(241,236,226,0.86)', borderColor: B.line }}>
        <div className="max-w-[1500px] mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/supa-admin" className="p-2 rounded-lg hover:bg-white/60 transition-colors" style={{ color: B.ink }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: B.ink }}>Financial Command Center</h1>
              <p className="text-xs" style={{ color: B.inkSoft }}>
                {ORG} · revenue $100 / 1M credits · COGS blended {Math.round(inputShare * 100)}/{Math.round((1 - inputShare) * 100)}
                {lastUpdate && <> · updated {lastUpdate.toLocaleTimeString()}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: B.line }}>
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriodDays(p.days)}
                  className="px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{ background: periodDays === p.days ? B.ink : B.paper, color: periodDays === p.days ? 'white' : B.ink }}>
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={fetchAll} className="p-2 rounded-lg hover:bg-white/60" style={{ color: B.ink }}><RefreshCw className="w-5 h-5" /></button>
            <button onClick={exportCsv} className="px-3 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2" style={{ background: B.teal }}>
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-6 py-8 space-y-8">
        {/* A. Hero note cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <HeroNote rotate={-1.5} accent={B.green} icon={Percent} label="Gross margin"
            value={`${marginPct.toFixed(1)}%`} sub="value − COGS" big />
          <HeroNote rotate={1} accent={B.teal} icon={TrendingUp} label="Consumption value"
            value={usd(totalValue)} sub="usage × $100/1M (imputed)" />
          <HeroNote rotate={-0.5} accent={B.gold} icon={Wallet} label="Cash collected"
            value={usd(cashCollected)} sub="actual purchases" />
          <HeroNote rotate={1.5} accent={B.orange} icon={DollarSign} label="Real COGS"
            value={usd(totalCogs)} sub="raw tokens × blended cost" />
          <HeroNote rotate={-1} accent={B.ink} icon={Gauge} label="Net margin"
            value={usd(totalMargin)} sub="gross profit" />
        </div>

        {/* B. Per-model cost tracker */}
        <Note rotate={-0.4}>
          <SectionTitle icon={DollarSign}>Per-model cost tracker</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 720 }}>
              <thead>
                <tr style={{ color: B.inkSoft }}>
                  {['Model', 'Requests', 'Raw tokens', 'Credits', 'COGS/1M', 'COGS $', 'Value $', 'Margin $', 'Margin %'].map((h, i) => (
                    <th key={h} className={`py-2 ${i === 0 ? 'text-left pr-4' : 'text-right px-3'} font-medium`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overview.map(r => (
                  <tr key={r.model_key} className="border-t" style={{ borderColor: B.line }}>
                    <td className="py-2 pr-4 font-semibold" style={{ color: B.ink }}>
                      {r.display_name}
                      {r.model_key === 'legacy' && <span className="ml-2 text-[11px] font-normal" style={{ color: B.orange }}>pre-metering</span>}
                    </td>
                    <td className="py-2 px-3 text-right">{compact(r.requests)}</td>
                    <td className="py-2 px-3 text-right">{compact(r.raw_tokens)}</td>
                    <td className="py-2 px-3 text-right">{compact(r.credits)}</td>
                    <td className="py-2 px-3 text-right">{usd(r.blended_cogs_per_1m)}</td>
                    <td className="py-2 px-3 text-right">{usd(r.cogs_usd)}</td>
                    <td className="py-2 px-3 text-right font-semibold">{usd(r.consumption_value_usd)}</td>
                    <td className="py-2 px-3 text-right" style={{ color: num(r.gross_margin_usd) >= 0 ? B.green : B.red }}>{usd(r.gross_margin_usd)}</td>
                    <td className="py-2 px-3 text-right font-semibold" style={{ color: num(r.margin_pct) >= 0 ? B.green : B.red }}>{num(r.margin_pct).toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="border-t-2" style={{ borderColor: B.ink }}>
                  <td className="py-2 pr-4 font-bold">Total</td>
                  <td colSpan={4}></td>
                  <td className="py-2 px-3 text-right font-bold">{usd(totalCogs)}</td>
                  <td className="py-2 px-3 text-right font-bold">{usd(totalValue)}</td>
                  <td className="py-2 px-3 text-right font-bold" style={{ color: B.green }}>{usd(totalMargin)}</td>
                  <td className="py-2 px-3 text-right font-bold" style={{ color: B.green }}>{marginPct.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] mt-3" style={{ color: B.inkSoft }}>
            Credits reconstruct real consumption (legacy rows priced at weight 1.0). U4.3 charges 2.5× credits at lower cost — its margin runs highest.
          </p>
        </Note>

        {/* C. Cash vs Imputed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Note rotate={0.6} className="lg:col-span-2">
            <SectionTitle icon={Wallet}>Cash vs. imputed value</SectionTitle>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <MiniStat label="Cash collected" value={usd(cashCollected)} color={B.gold} />
              <MiniStat label="Consumption value" value={usd(totalValue)} color={B.teal} />
              <MiniStat label="Value given away" value={usd(valueGivenAway)} color={B.orange} icon={Gift} />
            </div>
            <div className="space-y-2">
              {cash.length === 0 && <p className="text-sm" style={{ color: B.inkSoft }}>No purchases recorded.</p>}
              {cash.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.6)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: c.is_complimentary ? 'rgba(192,138,45,0.15)' : 'rgba(14,140,134,0.15)', color: c.is_complimentary ? B.gold : B.teal }}>
                      {c.is_complimentary ? 'Complimentary' : 'Paid'}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{fmtDate(c.purchase_date)}</div>
                      <div className="text-[11px]" style={{ color: B.inkSoft }}>{compact(c.tokens_purchased)} credits{c.notes ? ` · ${c.notes}` : ''}</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold">{usd(c.amount_paid)}</div>
                </div>
              ))}
            </div>
          </Note>

          {/* D. Projections & runway */}
          <Note rotate={-0.8}>
            <SectionTitle icon={Clock}>Projections & runway</SectionTitle>
            <div className="flex gap-1 mb-4">
              {[7, 30, 90].map(w => (
                <button key={w} onClick={() => setWindowDays(w)}
                  className="px-2.5 py-1 rounded text-xs font-medium"
                  style={{ background: windowDays === w ? B.ink : 'rgba(255,255,255,0.6)', color: windowDays === w ? 'white' : B.ink }}>
                  {w}d
                </button>
              ))}
            </div>
            <div className="space-y-3 text-sm">
              <Row label="Burn rate" value={`${compact(projection?.credits_per_day)} cr/day`} />
              <Row label="Requests" value={`${compact(projection?.requests_per_day)}/day`} />
              <Row label={<span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Active users ({windowDays}d)</span>} value={compact(projection?.active_users_window)} />
              <div className="border-t my-2" style={{ borderColor: B.line }} />
              <Row label="Run-rate value / mo" value={usd(projection?.proj_monthly_value_usd)} strong />
              <Row label="Run-rate COGS / mo" value={usd(projection?.proj_monthly_cogs_usd)} />
              <Row label="Run-rate margin / mo" value={usd(projection?.proj_monthly_margin_usd)} strong color={B.green} />
              <div className="border-t my-2" style={{ borderColor: B.line }} />
              <Row label="Credits remaining" value={compact(projection?.credits_remaining)} />
              <Row label="Runway"
                value={num(projection?.credits_remaining) <= 0 ? 'Exhausted' : daysLeft == null ? '—' : `${Math.round(daysLeft)} days`}
                color={num(projection?.credits_remaining) <= 0 ? B.red : B.ink} strong />
              <Row label="To re-up (1 mo)" value={usd(projection?.usd_to_reup)} />
            </div>
          </Note>
        </div>

        {/* E. Trend */}
        <Note rotate={0.4}>
          <SectionTitle icon={TrendingUp}>Value vs. COGS over time (weekly)</SectionTitle>
          {trend.length === 0 ? (
            <p className="text-sm" style={{ color: B.inkSoft }}>No usage in this window.</p>
          ) : (
            <>
              <div className="flex items-end gap-2 h-48">
                {trend.map((t, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative" style={{ minWidth: 8 }}>
                    <div className="w-full flex items-end justify-center gap-0.5 h-full">
                      <div className="rounded-t" style={{ width: '46%', height: `${(num(t.value_usd) / trendMax) * 100}%`, minHeight: 2, background: B.teal }} />
                      <div className="rounded-t" style={{ width: '46%', height: `${(num(t.cogs_usd) / trendMax) * 100}%`, minHeight: 2, background: B.orange }} />
                    </div>
                    <div className="absolute bottom-full mb-2 hidden group-hover:block text-white text-[11px] rounded px-2 py-1 whitespace-nowrap z-10" style={{ background: B.ink }}>
                      <div>{fmtDate(t.period)}</div>
                      <div>Value {usd(t.value_usd)}</div>
                      <div>COGS {usd(t.cogs_usd)}</div>
                      <div>Margin {usd(t.margin_usd)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-[11px]" style={{ color: B.inkSoft }}>
                <span className="flex items-center gap-1"><i className="inline-block w-3 h-3 rounded-sm" style={{ background: B.teal }} /> Consumption value</span>
                <span className="flex items-center gap-1"><i className="inline-block w-3 h-3 rounded-sm" style={{ background: B.orange }} /> COGS</span>
              </div>
            </>
          )}
        </Note>

        {/* F. Blend editor */}
        <Note rotate={-0.5}>
          <SectionTitle icon={Sliders}>Cost assumption — input / output blend</SectionTitle>
          <p className="text-sm mb-3" style={{ color: B.inkSoft }}>
            The ledger stores only total tokens, so COGS assumes a split. U4.0 $2 in / $8 out; U4.3 $2.10 in / $6.60 out.
            Currently <strong style={{ color: B.ink }}>{Math.round(inputShare * 100)}% input / {Math.round((1 - inputShare) * 100)}% output</strong>.
          </p>
          <div className="flex items-center gap-4 max-w-md">
            <span className="text-xs" style={{ color: B.inkSoft }}>0% in</span>
            <input type="range" min={0} max={100} value={Math.round(inputShare * 100)}
              onChange={(e) => setInputShare(Number(e.target.value) / 100)}
              onMouseUp={(e) => saveBlend(Number((e.target as HTMLInputElement).value) / 100)}
              onTouchEnd={(e) => saveBlend(Number((e.target as HTMLInputElement).value) / 100)}
              className="flex-1" style={{ accentColor: B.teal }} />
            <span className="text-xs" style={{ color: B.inkSoft }}>100% in</span>
          </div>
        </Note>

        <p className="text-center text-[11px] pb-4" style={{ color: B.inkSoft }}>
          Super-admin only · abuse radar and teacher leaderboard live in a separate build.
        </p>
      </main>
    </div>
  );
}

// ---------- Presentational pieces (silk note-card system) ----------
function Note({ children, rotate = 0, className = '' }: { children: React.ReactNode; rotate?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className={`rounded-2xl p-6 ${className}`}
      style={{
        background: B.paper, transform: `rotate(${rotate}deg)`,
        boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 10px 30px -12px rgba(27,42,58,0.35), 0 2px 6px rgba(27,42,58,0.08)',
        border: `1px solid ${B.line}`,
      }}>
      {children}
    </motion.div>
  );
}

function HeroNote({ label, value, sub, icon: Icon, accent, rotate = 0, big = false }:
  { label: string; value: string; sub: string; icon: any; accent: string; rotate?: number; big?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: B.paper, transform: `rotate(${rotate}deg)`,
        boxShadow: '0 10px 26px -12px rgba(27,42,58,0.4), 0 2px 6px rgba(27,42,58,0.08)',
        borderTop: `3px solid ${accent}`, border: `1px solid ${B.line}`,
      }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: B.inkSoft }}>{label}</span>
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      <div className={`font-bold tracking-tight ${big ? 'text-4xl' : 'text-3xl'}`} style={{ color: B.ink }}>{value}</div>
      <div className="text-[11px] mt-1" style={{ color: B.inkSoft }}>{sub}</div>
    </motion.div>
  );
}

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon: any }) {
  return (
    <h3 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: B.ink }}>
      <Icon className="w-4 h-4" style={{ color: B.teal }} /> {children}
    </h3>
  );
}

function MiniStat({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon?: any }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.6)', border: `1px solid ${B.line}` }}>
      <div className="text-[11px] flex items-center gap-1" style={{ color: B.inkSoft }}>{Icon && <Icon className="w-3 h-3" />}{label}</div>
      <div className="text-xl font-bold mt-1" style={{ color }}>{value}</div>
    </div>
  );
}

function Row({ label, value, strong = false, color }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: B.inkSoft }}>{label}</span>
      <span className={strong ? 'font-bold' : 'font-medium'} style={{ color: color || B.ink }}>{value}</span>
    </div>
  );
}
