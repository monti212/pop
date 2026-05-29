import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, ClipboardList, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '../../services/authService';

interface DailyLogRow {
  id: string;
  log_date: string;
  title: string;
  summary: string | null;
  details: string | null;
  source_doc_path: string | null;
  created_at: string;
}

const Brand = {
  sand: '#F7F5F2',
  navy: '#19324A',
  teal: '#0096B3',
  line: '#EAE7E3'
};

export default function SupaAdminDailyLogger() {
  const [logs, setLogs] = useState<DailyLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    logDate: new Date().toISOString().slice(0, 10),
    title: '',
    summary: '',
    details: '',
    sourceDocPath: ''
  });

  const fetchLogs = useCallback(async () => {
    setError(null);
    try {
      const { data, error } = await supabase
        .from('supa_admin_daily_logs')
        .select('id, log_date, title, summary, details, source_doc_path, created_at')
        .order('log_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load daily logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const groupedLogs = useMemo(() => {
    return logs.reduce<Record<string, DailyLogRow[]>>((acc, row) => {
      if (!acc[row.log_date]) acc[row.log_date] = [];
      acc[row.log_date].push(row);
      return acc;
    }, {});
  }, [logs]);

  const saveLog = async () => {
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('supa_admin_daily_logs')
        .insert({
          log_date: form.logDate,
          title: form.title.trim(),
          summary: form.summary.trim() || null,
          details: form.details.trim() || null,
          source_doc_path: form.sourceDocPath.trim() || null
        });

      if (error) throw error;

      setForm((prev) => ({
        ...prev,
        title: '',
        summary: '',
        details: '',
        sourceDocPath: ''
      }));

      await fetchLogs();
    } catch (err: any) {
      setError(err?.message || 'Failed to save daily log');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: Brand.sand }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/supa-admin"
              className="p-2 rounded-lg border hover:bg-white/80 transition-colors"
              style={{ borderColor: Brand.line, color: Brand.navy }}
              title="Back to Supa Admin"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold" style={{ color: Brand.navy }}>Supa Admin Daily Logger</h1>
              <p className="text-sm" style={{ color: Brand.navy, opacity: 0.7 }}>
                Private daily work log (visible only to you)
              </p>
            </div>
          </div>

          <button
            onClick={fetchLogs}
            className="px-3 py-2 rounded-lg border flex items-center gap-2"
            style={{ borderColor: Brand.line, color: Brand.navy, background: 'white' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg border bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
          <div className="flex items-center gap-2 mb-4" style={{ color: Brand.navy }}>
            <Plus className="w-4 h-4" />
            <h2 className="font-semibold">Add Daily Work Entry</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: Brand.navy, opacity: 0.8 }}>Date</label>
              <input
                type="date"
                value={form.logDate}
                onChange={(e) => setForm((prev) => ({ ...prev, logDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border"
                style={{ borderColor: Brand.line }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: Brand.navy, opacity: 0.8 }}>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="What was done?"
                className="w-full px-3 py-2 rounded-lg border"
                style={{ borderColor: Brand.line }}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1" style={{ color: Brand.navy, opacity: 0.8 }}>Summary</label>
              <textarea
                value={form.summary}
                onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
                rows={2}
                placeholder="Short executive summary"
                className="w-full px-3 py-2 rounded-lg border"
                style={{ borderColor: Brand.line }}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1" style={{ color: Brand.navy, opacity: 0.8 }}>Details</label>
              <textarea
                value={form.details}
                onChange={(e) => setForm((prev) => ({ ...prev, details: e.target.value }))}
                rows={5}
                placeholder="Detailed notes"
                className="w-full px-3 py-2 rounded-lg border"
                style={{ borderColor: Brand.line }}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1" style={{ color: Brand.navy, opacity: 0.8 }}>Source Doc Path (optional)</label>
              <input
                type="text"
                value={form.sourceDocPath}
                onChange={(e) => setForm((prev) => ({ ...prev, sourceDocPath: e.target.value }))}
                placeholder="TOKEN_USAGE_ADMIN_SUPAADMIN_EXEC_SUMMARY_2026-05-29.md"
                className="w-full px-3 py-2 rounded-lg border"
                style={{ borderColor: Brand.line }}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={saveLog}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-white disabled:opacity-60"
              style={{ background: Brand.teal }}
            >
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border shadow-sm" style={{ borderColor: Brand.line }}>
          <div className="flex items-center gap-2 mb-4" style={{ color: Brand.navy }}>
            <ClipboardList className="w-4 h-4" />
            <h2 className="font-semibold">Daily Log History</h2>
          </div>

          {loading ? (
            <div className="text-sm" style={{ color: Brand.navy, opacity: 0.7 }}>Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-sm" style={{ color: Brand.navy, opacity: 0.7 }}>No entries yet.</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedLogs).map(([date, rows]) => (
                <div key={date} className="border rounded-lg" style={{ borderColor: Brand.line }}>
                  <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: Brand.line, background: '#F9F9F9', color: Brand.navy }}>
                    <Calendar className="w-4 h-4" />
                    <span className="font-semibold">{new Date(date).toLocaleDateString()}</span>
                  </div>
                  <div className="divide-y" style={{ borderColor: Brand.line }}>
                    {rows.map((row) => (
                      <div key={row.id} className="p-4">
                        <h3 className="font-semibold" style={{ color: Brand.navy }}>{row.title}</h3>
                        {row.summary && (
                          <p className="text-sm mt-1" style={{ color: Brand.navy, opacity: 0.85 }}>{row.summary}</p>
                        )}
                        {row.details && (
                          <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: Brand.navy, opacity: 0.8 }}>{row.details}</p>
                        )}
                        {row.source_doc_path && (
                          <p className="text-xs mt-2" style={{ color: Brand.teal }}>
                            Source: {row.source_doc_path}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
