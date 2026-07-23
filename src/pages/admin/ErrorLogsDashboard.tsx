import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Filter,
  Inbox,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserCheck,
  UserMinus,
  X,
  Zap,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import {
  errorLogService,
  type IssueFilters,
  type IssueStatus,
  type ObservabilityIssue,
} from '../../services/errorLogService';

const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
const statusOrder: Record<IssueStatus, number> = {
  regressed: 5,
  open: 4,
  investigating: 3,
  resolved: 2,
  observed: 1,
  ignored: 1,
};

const severityStyles = {
  critical: 'border-rose-200 bg-rose-50 text-rose-700',
  high: 'border-orange-200 bg-orange-50 text-orange-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-sky-200 bg-sky-50 text-sky-700',
};

const statusStyles: Record<IssueStatus, string> = {
  open: 'bg-slate-100 text-slate-700',
  investigating: 'bg-violet-100 text-violet-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  observed: 'bg-sky-100 text-sky-700',
  ignored: 'bg-slate-100 text-slate-500',
  regressed: 'bg-rose-100 text-rose-700',
};

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isActive(status: IssueStatus) {
  return status === 'open' || status === 'investigating' || status === 'regressed';
}

function MetricCard({
  label,
  value,
  supporting,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  supporting: string;
  icon: typeof Activity;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{supporting}</p>
        </div>
        <span className={`rounded-xl p-2.5 ${tone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
      <span className="rounded-2xl bg-emerald-50 p-4 text-emerald-600">
        {filtered ? <Search className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        {filtered ? 'No issues match these filters' : 'Operations are clear'}
      </h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {filtered
          ? 'Try widening the status, severity, category, or ownership filters.'
          : 'New application failures and operational warnings will appear here automatically.'}
      </p>
    </div>
  );
}

export default function ErrorLogsDashboard() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<ObservabilityIssue[]>([]);
  const [selected, setSelected] = useState<ObservabilityIssue | null>(null);
  const [filters, setFilters] = useState<IssueFilters>({ status: 'active', owner: 'all' });
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const loadIssues = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    const result = await errorLogService.getIssues();
    setIssues(result.issues);
    setLoadError(result.error || '');
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadIssues();
    const interval = window.setInterval(() => void loadIssues(true), 30_000);
    return () => window.clearInterval(interval);
  }, [loadIssues]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const stats = useMemo(() => {
    const active = issues.filter((issue) => isActive(issue.status));
    return {
      active: active.length,
      critical: active.filter((issue) => issue.severity === 'critical').length,
      regressed: active.filter((issue) => issue.status === 'regressed').length,
      unassigned: active.filter((issue) => !issue.assigned_to).length,
    };
  }, [issues]);

  const filteredIssues = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return issues
      .filter((issue) => {
        if (filters.status === 'active' && !isActive(issue.status)) return false;
        if (filters.status && filters.status !== 'active' && issue.status !== filters.status) return false;
        if (filters.severity && issue.severity !== filters.severity) return false;
        if (filters.category && issue.category !== filters.category) return false;
        if (filters.owner === 'mine' && issue.assigned_to !== user?.id) return false;
        if (filters.owner === 'unassigned' && issue.assigned_to) return false;
        if (!needle) return true;
        return [
          issue.title,
          issue.summary,
          issue.category,
          issue.source,
          issue.latest_route,
          issue.fingerprint,
        ].some((value) => value?.toLowerCase().includes(needle));
      })
      .sort((a, b) => {
        const priority =
          statusOrder[b.status] - statusOrder[a.status]
          || severityOrder[b.severity] - severityOrder[a.severity]
          || b.occurrence_count - a.occurrence_count;
        return priority || Date.parse(b.last_seen_at) - Date.parse(a.last_seen_at);
      });
  }, [deferredSearch, filters, issues, user?.id]);

  const updateIssue = async (
    status: IssueStatus,
    assignment: 'keep' | 'claim' | 'unassign' = 'keep',
  ) => {
    if (!selected) return;
    if (status === 'resolved' && notes.trim().length < 3) {
      setNotice('Add a short resolution note before resolving this issue.');
      return;
    }
    setSaving(true);
    const result = await errorLogService.manageIssue(
      selected.id,
      status,
      notes.trim() || selected.resolution_notes,
      assignment,
    );
    if (!result.success) {
      setNotice(result.error || 'The issue could not be updated.');
      setSaving(false);
      return;
    }
    await loadIssues(true);
    setSelected((current) => current ? {
      ...current,
      status,
      assigned_to:
        assignment === 'claim' ? user?.id || current.assigned_to
          : assignment === 'unassign' ? null
            : current.assigned_to,
      resolution_notes: notes.trim() || current.resolution_notes,
    } : null);
    setNotice(status === 'resolved' ? 'Issue resolved.' : 'Issue updated.');
    setSaving(false);
  };

  const hasFilters = Boolean(
    search || filters.severity || filters.category || filters.status !== 'active' || filters.owner !== 'all',
  );

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <Link
            to="/supa-admin"
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Super Admin
          </Link>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-slate-950 p-2.5 text-white">
                  <Activity className="h-6 w-6" />
                </span>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Operations Inbox</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Prioritized application health, recurrence, ownership, and resolution.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 sm:flex">
                <LockKeyhole className="h-4 w-4" />
                Sensitive values are redacted
              </div>
              <button
                type="button"
                onClick={() => void loadIssues(true)}
                disabled={refreshing}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Issue summary">
          <MetricCard label="Active issues" value={stats.active} supporting="Needs review or action" icon={Inbox} tone="bg-slate-100 text-slate-700" />
          <MetricCard label="Critical" value={stats.critical} supporting="Highest operational priority" icon={Zap} tone="bg-rose-100 text-rose-700" />
          <MetricCard label="Regressions" value={stats.regressed} supporting="Returned after resolution" icon={RotateCcw} tone="bg-violet-100 text-violet-700" />
          <MetricCard label="Unassigned" value={stats.unassigned} supporting="Waiting for an owner" icon={UserMinus} tone="bg-amber-100 text-amber-700" />
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search issues, routes, fingerprints…"
                aria-label="Search operational issues"
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                aria-label="Filter by status"
                value={filters.status || ''}
                onChange={(event) => setFilters((current) => ({
                  ...current,
                  status: (event.target.value || undefined) as IssueFilters['status'],
                }))}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="regressed">Regressed</option>
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="observed">Informational</option>
                <option value="ignored">Ignored</option>
              </select>
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${
                  filtersOpen || filters.severity || filters.category || filters.owner !== 'all'
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                More filters
              </button>
            </div>
          </div>

          {filtersOpen && (
            <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Severity
                <select
                  value={filters.severity || ''}
                  onChange={(event) => setFilters((current) => ({
                    ...current,
                    severity: (event.target.value || undefined) as IssueFilters['severity'],
                  }))}
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-700"
                >
                  <option value="">All severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Category
                <select
                  value={filters.category || ''}
                  onChange={(event) => setFilters((current) => ({
                    ...current,
                    category: (event.target.value || undefined) as IssueFilters['category'],
                  }))}
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-700"
                >
                  <option value="">All categories</option>
                  {['runtime', 'network', 'database', 'authentication', 'validation', 'performance', 'system', 'unknown'].map((category) => (
                    <option key={category} value={category}>{titleCase(category)}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ownership
                <select
                  value={filters.owner || 'all'}
                  onChange={(event) => setFilters((current) => ({
                    ...current,
                    owner: event.target.value as IssueFilters['owner'],
                  }))}
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-700"
                >
                  <option value="all">Everyone</option>
                  <option value="mine">Assigned to me</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </label>
            </div>
          )}

          {loadError && (
            <div className="m-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Operations data could not be loaded</p>
                <p className="mt-0.5 text-rose-600">{loadError}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-80 items-center justify-center">
              <RefreshCw className="h-7 w-7 animate-spin text-slate-400" aria-label="Loading issues" />
            </div>
          ) : filteredIssues.length === 0 ? (
            <EmptyState filtered={hasFilters} />
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredIssues.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => {
                    setSelected(issue);
                    setNotes(issue.resolution_notes || '');
                  }}
                  className="group grid w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
                >
                  <div className="flex min-w-0 gap-3">
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${severityStyles[issue.severity]}`}>
                      {issue.status === 'regressed'
                        ? <RotateCcw className="h-4 w-4" />
                        : issue.severity === 'critical' || issue.severity === 'high'
                          ? <AlertTriangle className="h-4 w-4" />
                          : <CircleDot className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-slate-900">{issue.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${statusStyles[issue.status]}`}>
                          {issue.status}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>{titleCase(issue.category)}</span>
                        <span className="inline-flex items-center gap-1">
                          <Activity className="h-3.5 w-3.5" />
                          {issue.occurrence_count.toLocaleString()} {issue.occurrence_count === 1 ? 'occurrence' : 'occurrences'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDistanceToNow(new Date(issue.last_seen_at), { addSuffix: true })}
                        </span>
                        <span>{issue.assigned_to ? (issue.assigned_to === user?.id ? 'Owned by you' : 'Assigned') : 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 pl-12 sm:justify-end sm:pl-0">
                    <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${severityStyles[issue.severity]}`}>
                      {issue.severity}
                    </span>
                    <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="issue-title">
          <button className="absolute inset-0 cursor-default" onClick={() => setSelected(null)} aria-label="Close issue details" />
          <aside className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-lg border px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${severityStyles[selected.severity]}`}>
                    {selected.severity}
                  </span>
                  <span className={`rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${statusStyles[selected.status]}`}>
                    {selected.status}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                    {titleCase(selected.category)}
                  </span>
                </div>
                <h2 id="issue-title" className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                  {selected.title}
                </h2>
                <p className="mt-1 font-mono text-xs text-slate-400">{selected.fingerprint}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Occurrences', selected.occurrence_count.toLocaleString()],
                  ['First seen', format(new Date(selected.first_seen_at), 'dd MMM, HH:mm')],
                  ['Last seen', formatDistanceToNow(new Date(selected.last_seen_at), { addSuffix: true })],
                  ['Owner', selected.assigned_to === user?.id ? 'You' : selected.assigned_to ? 'Assigned' : 'None'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>

              {selected.summary && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Safe summary</h3>
                  <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {selected.summary}
                  </p>
                </section>
              )}

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Operational context</h3>
                <dl className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {[
                    ['Route', selected.latest_route || 'Not available'],
                    ['Source', titleCase(selected.source)],
                    ...Object.entries(selected.latest_context || {}).map(([key, value]) => [titleCase(key), String(value)]),
                  ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 px-4 py-3 text-sm">
                      <dt className="font-medium text-slate-500">{label}</dt>
                      <dd className="break-words font-mono text-xs text-slate-700">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {selected.sample_stack && (
                <details className="rounded-xl border border-slate-200">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
                    Sanitized technical trace
                  </summary>
                  <pre className="max-h-64 overflow-auto border-t border-slate-200 bg-slate-950 p-4 text-xs leading-5 text-slate-300">
                    {selected.sample_stack}
                  </pre>
                </details>
              )}

              <section>
                <label htmlFor="resolution-notes" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Triage and resolution notes
                </label>
                <textarea
                  id="resolution-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  maxLength={1200}
                  placeholder="Record the cause, decision, fix, or reason for ignoring…"
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
                <p className="mt-1 text-right text-xs text-slate-400">{notes.length}/1200</p>
              </section>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                  {selected.assigned_to === user?.id ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void updateIssue(selected.status, 'unassign')}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <UserMinus className="h-4 w-4" /> Unassign
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void updateIssue('investigating', 'claim')}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <UserCheck className="h-4 w-4" /> Assign to me
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void updateIssue('ignored')}
                    className="min-h-10 rounded-xl px-3 text-sm font-semibold text-slate-500 hover:bg-slate-200"
                  >
                    Ignore
                  </button>
                </div>
                {selected.status === 'resolved' ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void updateIssue('open')}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    <RotateCcw className="h-4 w-4" /> Reopen
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void updateIssue('resolved')}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Mark resolved
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {notice && (
        <div className="fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-xl" role="status">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {notice}
        </div>
      )}
    </div>
  );
}
