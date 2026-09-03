import React, { useEffect, useState } from 'react';
import { ArrowLeft, Megaphone, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import {
  createTeacherAnnouncement,
  deleteTeacherAnnouncement,
  getAdminTeacherAnnouncements,
  TeacherAnnouncement,
  TeacherAnnouncementInput,
  TeacherAnnouncementPriority,
  TeacherAnnouncementStatus,
  updateTeacherAnnouncement,
} from '../../services/announcementService';

const Brand = {
  sand: '#F7F5F2',
  navy: '#19324A',
  teal: '#0096B3',
  orange: '#FF6A00',
  line: '#EAE7E3',
};

const emptyForm: TeacherAnnouncementInput = {
  title: '',
  body: '',
  status: 'draft',
  priority: 'normal',
  expires_at: '',
};

const formatDate = (value: string | null) => {
  if (!value) return 'Not published';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
};

const TeacherAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<TeacherAnnouncement[]>([]);
  const [form, setForm] = useState<TeacherAnnouncementInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);
    const result = await getAdminTeacherAnnouncements();
    if (result.success) {
      setAnnouncements(result.announcements || []);
    } else {
      setError(result.error || 'Could not load announcements');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      setError('Title and update body are required.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload: TeacherAnnouncementInput = {
      ...form,
      title: form.title.trim(),
      body: form.body.trim(),
      expires_at: form.expires_at || null,
    };

    const result = editingId
      ? await updateTeacherAnnouncement(editingId, payload)
      : await createTeacherAnnouncement(payload);

    if (!result.success) {
      setError(result.error || 'Could not save announcement');
      setSaving(false);
      return;
    }

    resetForm();
    await loadAnnouncements();
    setSaving(false);
  };

  const handleEdit = (announcement: TeacherAnnouncement) => {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title,
      body: announcement.body,
      status: announcement.status,
      priority: announcement.priority,
      expires_at: announcement.expires_at ? announcement.expires_at.slice(0, 10) : '',
    });
  };

  const handleStatusChange = async (
    announcement: TeacherAnnouncement,
    status: TeacherAnnouncementStatus
  ) => {
    setError(null);
    const result = await updateTeacherAnnouncement(announcement.id, { status });
    if (!result.success) {
      setError(result.error || 'Could not update status');
      return;
    }
    await loadAnnouncements();
  };

  const handleDelete = async (announcement: TeacherAnnouncement) => {
    const confirmed = window.confirm(`Delete "${announcement.title}"?`);
    if (!confirmed) return;

    setError(null);
    const result = await deleteTeacherAnnouncement(announcement.id);
    if (!result.success) {
      setError(result.error || 'Could not delete announcement');
      return;
    }
    await loadAnnouncements();
  };

  return (
    <div className="min-h-screen flex" style={{ background: Brand.sand }}>
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"
                style={{ color: Brand.teal }}
              >
                <ArrowLeft className="h-4 w-4" />
                Admin Dashboard
              </Link>
              <h1 className="mt-3 text-3xl font-bold" style={{ color: Brand.navy }}>
                Teacher Announcements
              </h1>
              <p className="mt-2 text-sm" style={{ color: '#64748b' }}>
                Publish PoP updates to the teacher home page.
              </p>
            </div>
            <button
              onClick={loadAnnouncements}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-semibold"
              style={{ borderColor: Brand.line, color: Brand.navy }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <form
              onSubmit={handleSubmit}
              className="rounded-lg border bg-white p-5 shadow-sm"
              style={{ borderColor: Brand.line }}
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg text-white" style={{ background: Brand.teal }}>
                  {editingId ? <Save className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="font-bold" style={{ color: Brand.navy }}>
                    {editingId ? 'Edit update' : 'New update'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Published updates appear for all teachers.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold" style={{ color: Brand.navy }}>
                    Title
                  </label>
                  <input
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                    style={{ borderColor: Brand.line }}
                    placeholder="e.g., September literacy coaching schedule"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold" style={{ color: Brand.navy }}>
                    Update
                  </label>
                  <textarea
                    value={form.body}
                    onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                    className="min-h-[160px] w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                    style={{ borderColor: Brand.line }}
                    placeholder="Write the teacher-facing message..."
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold" style={{ color: Brand.navy }}>
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        status: event.target.value as TeacherAnnouncementStatus,
                      }))}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: Brand.line }}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold" style={{ color: Brand.navy }}>
                      Priority
                    </label>
                    <select
                      value={form.priority}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        priority: event.target.value as TeacherAnnouncementPriority,
                      }))}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: Brand.line }}
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold" style={{ color: Brand.navy }}>
                    Expiry date
                  </label>
                  <input
                    type="date"
                    value={form.expires_at || ''}
                    onChange={(event) => setForm((current) => ({ ...current, expires_at: event.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: Brand.line }}
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: Brand.teal }}
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create update'}
                </button>
              </div>
            </form>

            <section className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: Brand.line }}>
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: '#FEF7E8', color: Brand.orange }}>
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold" style={{ color: Brand.navy }}>
                    Updates
                  </h2>
                  <p className="text-xs text-slate-500">
                    Drafts stay private. Published updates appear on /home.
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
                  Loading announcements...
                </div>
              ) : announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.map((announcement) => (
                    <article
                      key={announcement.id}
                      className="rounded-lg border p-4"
                      style={{ borderColor: Brand.line }}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span
                              className="rounded-full px-2 py-0.5 text-xs font-bold uppercase"
                              style={{
                                background: announcement.status === 'published' ? '#E6F6F9' : '#F1F5F9',
                                color: announcement.status === 'published' ? Brand.teal : '#64748b',
                              }}
                            >
                              {announcement.status}
                            </span>
                            {announcement.priority === 'high' && (
                              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold uppercase" style={{ color: Brand.orange }}>
                                Priority
                              </span>
                            )}
                            <span className="text-xs text-slate-500">
                              Published {formatDate(announcement.published_at)}
                            </span>
                          </div>
                          <h3 className="font-bold" style={{ color: Brand.navy }}>
                            {announcement.title}
                          </h3>
                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                            {announcement.body}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            onClick={() => handleEdit(announcement)}
                            className="rounded-lg border px-3 py-2 text-xs font-semibold"
                            style={{ borderColor: Brand.line, color: Brand.navy }}
                          >
                            Edit
                          </button>
                          {announcement.status !== 'published' ? (
                            <button
                              onClick={() => handleStatusChange(announcement, 'published')}
                              className="rounded-lg px-3 py-2 text-xs font-semibold text-white"
                              style={{ background: Brand.teal }}
                            >
                              Publish
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(announcement, 'archived')}
                              className="rounded-lg border px-3 py-2 text-xs font-semibold"
                              style={{ borderColor: Brand.line, color: Brand.navy }}
                            >
                              Archive
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(announcement)}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600"
                            aria-label={`Delete ${announcement.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
                  No announcements yet.
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherAnnouncements;
