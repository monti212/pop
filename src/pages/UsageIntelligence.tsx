import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, ShieldAlert, Trophy, AlertTriangle, Flame,
  Gauge, Users, Medal, Sliders, Eye, EyeOff,
} from 'lucide-react';
import { supabase } from '../services/authService';

// ---- RPC row shapes. PostgREST returns numeric/bigint as strings, so coerce at read. ----
interface AbuseRow {
  user_id: string;
  user_email: string;
  total_credits: number | string;
  requests: number | string;
  active_days: number | string;
  max_daily_credits: number | string;
  max_hourly_requests: number | string;
  p95_daily_credits: number | string;
  flags: string[];
  severity: 'high' | 'medium' | 'low' | 'none';
}

interface LeaderboardRow {
  rank_no: number | string;
  user_id: string;
  user_email: string;
  active_days: number | string;
  requests: number | string;
  total_credits: number | string;
  consistency_pct: number | string;
  score: number | string;
  tier: 'Gold' | 'Silver' | 'Bronze' | null;
}

const ORG = 'Pencils of Promise';

// Silk "board of notes" palette — mirrors FinancialCommandCenter for visual consistency.
const B = {
  silk: '#F1ECE2', silk2: '#E7E0D2', paper: '#FFFDF8',
  ink: '#1B2A3A', inkSoft: 'rgba(27,42,58,0.62)',
  teal: '#0E8C86', orange: '#E4572E', gold: '#C08A2D',
  green: '#157A50', red: '#B23A2E', amber: '#B8860B', slate: '#5B6B7A',
  line: '#E3DCCF',
};

const num = (x: number | string | null | undefined) => (x == null ? 0 : Number(x));
const compact = (x: number | string | null | undefined) => {
  const v = num(x);
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString();
};
const pct = (x: number | string | null | undefined, dp = 1) => `${num(x).toFixed(dp)}%`;

const WINDOWS = [7, 30, 90];

const SEVERITY_STYLE: Record<AbuseRow['severity'], { bg: string; color: string; label: string }> = {
  high: { bg: 'rgba(178,58,46,0.14)', color: B.red, label: 'High' },
  medium: { bg: 'rgba(184,134,11,0.14)', color: B.amber, label: 'Medium' },
  low: { bg: 'rgba(91,107,122,0.14)', color: B.slate, label: 'Low' },
  none: { bg: 'rgba(91,107,122,0.08)', color: B.slate, label: 'None' },
};

const TIER_STYLE: Record<string, { bg: string; color: string }> = {
  Gold: { bg: 'rgba(192,138,45,0.18)', color: B.gold },
  Silver: { bg: 'rgba(91,107,122,0.18)', color: B.slate },
  Bronze: { bg: 'rgba(228,87,46,0.16)', color: B.orange },
};

const FLAG_LABEL: Record<string, string> = {
  outlier_volume: 'Outlier volume',
  burst: 'Burst',
};

export default function UsageIntelligence() {
  const [abuse, setAbuse] = useState<AbuseRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [days, setDays] = useState(30);
  const [outlierMultiplier, setOutlierMultiplier] = useState(3.0);
  const [burstPerHour, setBurstPerHour] = useState(60);
  const [showAllAbuse, setShowAllAbuse] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abuseError, setAbuseError] = useState<string | null>(null);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    setAbuseError(null);
    setLeaderboardError(null);
    try {
      const [abuseRes, leaderRes] = await Promise.all([
        supabase.rpc('get_abuse_radar', {
          p_organization_name: ORG,
          p_days: days,
          p_outlier_multiplier: outlierMultiplier,
          p_burst_per_hour: burstPerHour,
        }),
        supabase.rpc('get_teacher_leaderboard', {
          p_organization_name: ORG,
          p_days: days,
          p_limit: 20,
        }),
      ]);

      // "not authorized" on either RPC means the whole page is restricted — surface the friendly panel.
      const notAuthorized = (e: any) => e?.message === 'not authorized';
      if (abuseRes.error && notAuthorized(abuseRes.error)) {
        setError('This dashboard is restricted to super-admin accounts.');
        setLoading(false);
        return;
      }
      if (leaderRes.error && notAuthorized(leaderRes.error)) {
        setError('This dashboard is restricted to super-admin accounts.');
        setLoading(false);
        return;
      }

      if (abuseRes.error) {
        setAbuseError(abuseRes.error.message || 'Failed to load abuse radar');
        setAbuse([]);
      } else {
        setAbuse((abuseRes.data as AbuseRow[]) || []);
      }

      if (leaderRes.error) {
        setLeaderboardError(leaderRes.error.message || 'Failed to load teacher leaderboard');
        setLeaderboard([]);
      } else {
        setLeaderboard((leaderRes.data as LeaderboardRow[]) || []);
      }

      setLastUpdate(new Date());
    } catch (e: any) {
      setError(e?.message === 'not authorized' ? 'This dashboard is restricted to super-admin accounts.' : (e?.message || 'Failed to load usage intelligence'));
    } finally {
      setLoading(false);
    }
  }, [days, outlierMultiplier, burstPerHour]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: B.silk }}>
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: B.teal }} />
          <p style={{ color: B.ink }}>Loading usage intelligence…</p>
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
              <h3 className="font-bold" style={{ color: B.ink }}>Can't show usage intelligence</h3>
              <p className="text-sm mt-1" style={{ color: B.inkSoft }}>{error}</p>
              <Link to="/supa-admin" className="text-sm font-medium mt-3 inline-block" style={{ color: B.teal }}>← Back to super admin</Link>
            </div>
          </div>
        </Note>
      </div>
    );
  }

  const flaggedAbuse = abuse.filter(r => r.severity !== 'none');
  const visibleAbuse = showAllAbuse ? abuse : flaggedAbuse;
  const p95Benchmark = abuse.length > 0 ? Math.max(...abuse.map(r => num(r.p95_daily_credits))) : 0;

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
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: B.ink }}>Usage Intelligence</h1>
              <p className="text-xs" style={{ color: B.inkSoft }}>
                {ORG} · abuse radar & teacher leaderboard
                {lastUpdate && <> · updated {lastUpdate.toLocaleTimeString()}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: B.line }}>
              {WINDOWS.map(w => (
                <button key={w} onClick={() => setDays(w)}
                  className="px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{ background: days === w ? B.ink : B.paper, color: days === w ? 'white' : B.ink }}>
                  {w}d
                </button>
              ))}
            </div>
            <button onClick={fetchAll} className="p-2 rounded-lg hover:bg-white/60" style={{ color: B.ink }}>
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-6 py-8 space-y-8">
        {/* Controls */}
        <Note rotate={0.3}>
          <SectionTitle icon={Sliders}>Controls</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: B.inkSoft }}>
                Window
              </label>
              <div className="flex gap-1">
                {WINDOWS.map(w => (
                  <button key={w} onClick={() => setDays(w)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium"
                    style={{ background: days === w ? B.ink : 'rgba(255,255,255,0.6)', color: days === w ? 'white' : B.ink, border: `1px solid ${B.line}` }}>
                    {w} days
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: B.inkSoft }}>
                Outlier multiplier (× p95 daily credits)
              </label>
              <input
                type="number" min={1} step={0.5} value={outlierMultiplier}
                onChange={(e) => setOutlierMultiplier(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-3 py-1.5 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${B.line}`, color: B.ink }}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: B.inkSoft }}>
                Burst threshold (requests / hour)
              </label>
              <input
                type="number" min={1} step={1} value={burstPerHour}
                onChange={(e) => setBurstPerHour(Math.max(1, Math.round(Number(e.target.value) || 1)))}
                className="w-full px-3 py-1.5 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${B.line}`, color: B.ink }}
              />
            </div>
          </div>
          <p className="text-[11px] mt-3" style={{ color: B.inkSoft }}>
            Both sections use the {days}-day window. Thresholds re-query the abuse radar automatically.
          </p>
        </Note>

        {/* Abuse radar */}
        <Note rotate={-0.4}>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
            <SectionTitle icon={ShieldAlert}>Abuse radar</SectionTitle>
            <button
              onClick={() => setShowAllAbuse(s => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.6)', border: `1px solid ${B.line}`, color: B.ink }}
            >
              {showAllAbuse ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showAllAbuse ? 'Show flagged only' : `Show all users (${abuse.length})`}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-4 text-[11px]" style={{ color: B.inkSoft }}>
            <span>
              Org-wide <strong style={{ color: B.ink }}>p95 daily credits</strong>: {compact(p95Benchmark)}
            </span>
            <span>
              Outlier flag: peak day &gt; <strong style={{ color: B.ink }}>{outlierMultiplier}×</strong> p95
            </span>
            <span>
              Burst flag: &ge; <strong style={{ color: B.ink }}>{burstPerHour}</strong> requests in a single hour
            </span>
          </div>

          {abuseError && (
            <div className="mb-4 px-3 py-2 rounded-lg text-sm flex items-center gap-2" style={{ background: 'rgba(178,58,46,0.1)', color: B.red }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {abuseError}
            </div>
          )}

          {!abuseError && visibleAbuse.length === 0 ? (
            <div className="py-10 text-center">
              <ShieldAlert className="w-8 h-8 mx-auto mb-2" style={{ color: B.green }} />
              <p className="text-sm font-medium" style={{ color: B.ink }}>
                {showAllAbuse ? 'No usage data in this window.' : 'No users flagged in this window.'}
              </p>
              {!showAllAbuse && abuse.length > 0 && (
                <p className="text-xs mt-1" style={{ color: B.inkSoft }}>
                  {abuse.length} users checked, all clear.
                </p>
              )}
            </div>
          ) : !abuseError && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 920 }}>
                <thead>
                  <tr style={{ color: B.inkSoft }}>
                    {['Email', 'Severity', 'Flags', 'Max daily credits', 'Max hourly reqs', 'Total credits', 'Requests', 'Active days'].map((h, i) => (
                      <th key={h} className={`py-2 ${i === 0 ? 'text-left pr-4' : 'text-right px-3'} font-medium`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleAbuse.map(r => {
                    const sev = SEVERITY_STYLE[r.severity] || SEVERITY_STYLE.none;
                    const overP95 = num(r.max_daily_credits) > p95Benchmark && p95Benchmark > 0;
                    return (
                      <tr key={r.user_id} className="border-t" style={{ borderColor: B.line }}>
                        <td className="py-2 pr-4 font-semibold" style={{ color: B.ink }}>{r.user_email}</td>
                        <td className="py-2 px-3 text-right">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: sev.bg, color: sev.color }}>
                            {sev.label}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            {(r.flags || []).length === 0 && <span style={{ color: B.inkSoft }}>—</span>}
                            {(r.flags || []).map(f => (
                              <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                                style={{ background: 'rgba(228,87,46,0.12)', color: B.orange }}>
                                {f === 'burst' && <Flame className="w-3 h-3" />}
                                {FLAG_LABEL[f] || f}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right" style={{ color: overP95 ? B.red : B.ink, fontWeight: overP95 ? 600 : 400 }}>
                          {compact(r.max_daily_credits)}
                        </td>
                        <td className="py-2 px-3 text-right">{compact(r.max_hourly_requests)}</td>
                        <td className="py-2 px-3 text-right">{compact(r.total_credits)}</td>
                        <td className="py-2 px-3 text-right">{compact(r.requests)}</td>
                        <td className="py-2 px-3 text-right">{compact(r.active_days)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Note>

        {/* Teacher leaderboard */}
        <Note rotate={0.4}>
          <SectionTitle icon={Trophy}>Teacher leaderboard</SectionTitle>
          <p className="text-[11px] mb-4" style={{ color: B.inkSoft }}>
            Score is consistency-weighted, not raw usage: <strong style={{ color: B.ink }}>60% active-day consistency + 40% normalised request volume</strong>.
            A teacher who shows up steadily every day outranks someone who burns a huge pile of credits in one sitting — that's the line between a champion and an abuser.
          </p>

          {leaderboardError && (
            <div className="mb-4 px-3 py-2 rounded-lg text-sm flex items-center gap-2" style={{ background: 'rgba(178,58,46,0.1)', color: B.red }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {leaderboardError}
            </div>
          )}

          {!leaderboardError && leaderboard.length === 0 ? (
            <div className="py-10 text-center">
              <Users className="w-8 h-8 mx-auto mb-2" style={{ color: B.inkSoft }} />
              <p className="text-sm" style={{ color: B.inkSoft }}>No leaderboard data in this window.</p>
            </div>
          ) : !leaderboardError && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 860 }}>
                <thead>
                  <tr style={{ color: B.inkSoft }}>
                    {['#', 'Email', 'Tier', 'Score', 'Consistency', 'Active days', 'Requests', 'Credits'].map((h, i) => (
                      <th key={h} className={`py-2 ${i === 0 || i === 1 ? 'text-left pr-4' : 'text-right px-3'} font-medium`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map(r => {
                    const tierStyle = r.tier ? TIER_STYLE[r.tier] : null;
                    return (
                      <tr key={r.user_id} className="border-t" style={{ borderColor: B.line }}>
                        <td className="py-2 pr-4 font-semibold" style={{ color: B.ink }}>{num(r.rank_no)}</td>
                        <td className="py-2 pr-4 font-semibold" style={{ color: B.ink }}>{r.user_email}</td>
                        <td className="py-2 px-3 text-right">
                          {tierStyle ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: tierStyle.bg, color: tierStyle.color }}>
                              <Medal className="w-3 h-3" /> {r.tier}
                            </span>
                          ) : (
                            <span className="text-[11px]" style={{ color: B.inkSoft }}>—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold" style={{ color: B.teal }}>{num(r.score).toFixed(1)}</td>
                        <td className="py-2 px-3 text-right">{pct(r.consistency_pct)}</td>
                        <td className="py-2 px-3 text-right">{compact(r.active_days)}</td>
                        <td className="py-2 px-3 text-right">{compact(r.requests)}</td>
                        <td className="py-2 px-3 text-right">{compact(r.total_credits)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Note>

        <p className="text-center text-[11px] pb-4 flex items-center justify-center gap-1.5" style={{ color: B.inkSoft }}>
          <Gauge className="w-3.5 h-3.5" /> Super-admin only · abuse radar and teacher leaderboard.
        </p>
      </main>
    </div>
  );
}

// ---------- Presentational pieces (silk note-card system, matches FinancialCommandCenter) ----------
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

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon: any }) {
  return (
    <h3 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: B.ink }}>
      <Icon className="w-4 h-4" style={{ color: B.teal }} /> {children}
    </h3>
  );
}
