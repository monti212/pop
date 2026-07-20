import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Users, UserPlus, X, GraduationCap, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getTeacherClasses } from '../../services/classService';
import { getClassStudents } from '../../services/studentService';
import { Class, Student } from '../../types/attendance';
import AddClassModal from '../../components/AddClassModal';
import AddStudentModal from '../../components/AddStudentModal';
import AttendanceModal from '../../components/AttendanceModal';
import GradesManagementModal from '../../components/GradesManagementModal';

type PanelTab = 'roster' | 'grades' | 'reports';

/** Support tags, framed as support (never a label) — GreyEd responsible-AI tone. */
function supportTags(s: Student): string[] {
  const tags: string[] = [];
  if (s.has_neurodivergence && s.neurodivergence_type) tags.push(String(s.neurodivergence_type));
  if (s.accommodations) tags.push(s.accommodations.length > 28 ? s.accommodations.slice(0, 28) + '…' : s.accommodations);
  return tags;
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || name.slice(0, 2).toUpperCase();
}

/**
 * TeacherClassesPage (S2a) — class grid + detail panel (Roster).
 * Grades table is 2b; Reports is 2c. Reuses AddClassModal / AddStudentModal /
 * AttendanceModal / GradesManagementModal at their existing signatures.
 */
const TeacherClassesPage: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [tab, setTab] = useState<PanelTab>('roster');

  const [showCreate, setShowCreate] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [registerFor, setRegisterFor] = useState<Class | null>(null);
  const [showGrades, setShowGrades] = useState(false);

  const selected = classes.find((c) => c.id === selectedId) || null;

  const loadClasses = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const res = await getTeacherClasses(user.id);
    if (res.success && res.data) setClasses(res.data);
    setLoading(false);
  }, [user?.id]);

  const loadStudents = useCallback(async (classId: string) => {
    const res = await getClassStudents(classId);
    setStudents(res.success && res.data ? res.data : []);
  }, []);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  useEffect(() => {
    if (selectedId) loadStudents(selectedId);
  }, [selectedId, loadStudents]);

  // Wire the shell top-bar "New class" button.
  useEffect(() => {
    const open = () => setShowCreate(true);
    window.addEventListener('teach:new-class', open);
    return () => window.removeEventListener('teach:new-class', open);
  }, []);

  const selectClass = (c: Class) => { setSelectedId(c.id); setTab('roster'); };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-greyed-navy" />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* class grid */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 animate-w-fade min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <button
            onClick={() => setShowCreate(true)}
            className="min-h-[160px] flex flex-col items-start justify-between p-[22px] rounded-[18px] border-2 border-dashed border-greyed-beige bg-transparent cursor-pointer text-left hover:bg-white/40"
          >
            <span className="w-11 h-11 rounded-[13px] bg-greyed-white text-greyed-navy flex items-center justify-center"><Plus size={22} /></span>
            <span>
              <span className="block font-display font-semibold text-[16px] text-greyed-navy">Create a class</span>
              <span className="block text-[13px] text-greyed-faint mt-0.5">Add a new grade</span>
            </span>
          </button>

          {classes.map((c) => {
            const active = c.id === selectedId;
            return (
              <div
                key={c.id}
                onClick={() => selectClass(c)}
                className={`min-h-[160px] flex flex-col justify-between p-[22px] rounded-[18px] bg-white cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-card-hover ${active ? 'border-2 border-greyed-navy shadow-card' : 'border border-greyed-line'}`}
              >
                <div className="flex items-start justify-between">
                  <span className="w-11 h-11 rounded-[13px] bg-greyed-tile text-greyed-navy flex items-center justify-center"><Users size={22} /></span>
                  {active && <span className="w-[10px] h-[10px] rounded-full bg-greyed-navy" />}
                </div>
                <div>
                  <div className="font-display font-semibold text-[17px] text-greyed-navy tracking-[-0.01em]">{c.class_name}</div>
                  <div className="text-[13px] text-greyed-ink mt-0.5">
                    {c.student_count || 0} learners{c.subject ? ` · ${c.subject}` : ''}
                  </div>
                  <div className="flex gap-2 mt-[13px]" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setRegisterFor(c)} className="flex-1 p-2.5 rounded-[10px] border border-greyed-line bg-sand-200 text-greyed-navy font-semibold text-[12px]">Register</button>
                    <button onClick={() => { setSelectedId(c.id); setTab('roster'); setShowAdd(true); }} aria-label="Add learner" className="w-9 h-9 rounded-[10px] border border-greyed-line bg-white text-greyed-navy flex items-center justify-center flex-none"><UserPlus size={16} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* detail panel — docked on desktop, full-screen overlay on mobile */}
      {selected && (
        <div className="fixed inset-0 z-40 bg-white flex flex-col animate-w-fade lg:static lg:z-auto lg:w-[480px] lg:flex-none lg:border-l lg:border-greyed-line">
          <div className="px-[22px] py-[18px] border-b border-greyed-line flex items-center gap-3 flex-none">
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold text-[18px] text-greyed-navy tracking-[-0.01em] truncate">{selected.class_name}</div>
              <div className="text-[13px] text-greyed-ink mt-0.5">
                {[selected.grade_level, selected.subject].filter(Boolean).join(' · ') || 'Class'} · {students.length} learners
              </div>
            </div>
            <button onClick={() => setSelectedId(null)} aria-label="Close" className="w-[34px] h-[34px] rounded-[10px] border border-greyed-line bg-white text-greyed-navy flex items-center justify-center flex-none"><X size={18} /></button>
          </div>

          {/* tabs */}
          <div className="flex border-b border-greyed-line flex-none px-[22px]">
            {(['roster', 'grades', 'reports'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-3 px-3 text-[13.5px] font-semibold capitalize border-b-2 -mb-px ${tab === t ? 'border-greyed-navy text-greyed-navy' : 'border-transparent text-greyed-ink'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === 'roster' && (
              <div className="p-[22px] animate-w-fade">
                {students.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="font-display font-semibold text-[15px] text-greyed-navy mb-1">No learners yet</div>
                    <div className="text-[13px] text-greyed-faint">Add your first learner to build the roster.</div>
                  </div>
                ) : (
                  students.map((s) => {
                    const tags = supportTags(s);
                    return (
                      <div key={s.id} className="flex items-start gap-3 py-[11px] border-b border-greyed-line/70">
                        <span className="w-9 h-9 rounded-full bg-greyed-tile text-greyed-navy flex items-center justify-center font-semibold text-[12px] flex-none mt-0.5">{initials(s.student_name)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[14.5px] text-greyed-black">{s.student_name}</div>
                          {s.student_identifier && <div className="text-[12.5px] text-greyed-ink mt-0.5">{s.student_identifier}</div>}
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-[7px]">
                              {tags.map((tg, i) => (
                                <span key={i} className="bg-greyed-tile text-greyed-navy border border-[#c9dff0] rounded-full px-[9px] py-[3px] text-[11px] font-medium">{tg}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <button onClick={() => setShowAdd(true)} className="w-full mt-[14px] inline-flex items-center justify-center gap-[7px] p-3 rounded-12 bg-greyed-navy text-white font-semibold text-[13.5px]">
                  <UserPlus size={16} />Add learner
                </button>
              </div>
            )}

            {tab === 'grades' && (
              <div className="p-[22px] text-center animate-w-fade">
                <span className="w-14 h-14 rounded-[16px] bg-greyed-tile text-greyed-navy flex items-center justify-center mx-auto mb-3"><GraduationCap size={24} /></span>
                <div className="font-display font-semibold text-[15px] text-greyed-navy mb-1">Gradebook</div>
                <div className="text-[13px] text-greyed-faint mb-4 max-w-[300px] mx-auto">The inline editable grades table lands in the next slice (2b). For now, open the full gradebook.</div>
                <button onClick={() => setShowGrades(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-12 bg-greyed-navy text-white font-semibold text-[13px]">Open gradebook</button>
              </div>
            )}

            {tab === 'reports' && (
              <div className="p-[22px] text-center animate-w-fade">
                <span className="w-14 h-14 rounded-[16px] bg-greyed-tile text-greyed-navy flex items-center justify-center mx-auto mb-3"><FileText size={24} /></span>
                <div className="font-display font-semibold text-[15px] text-greyed-navy mb-1">Term reports</div>
                <div className="text-[13px] text-greyed-faint max-w-[300px] mx-auto">Per-learner reports (grades + attendance) with Word/PDF export arrive in slice 2c.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* modals */}
      <AddClassModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); loadClasses(); }} />
      {selected && (
        <>
          <AddStudentModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); loadStudents(selected.id); loadClasses(); }} classId={selected.id} />
          <GradesManagementModal isOpen={showGrades} onClose={() => setShowGrades(false)} onSuccess={() => setShowGrades(false)} classId={selected.id} className={selected.class_name} students={students} />
        </>
      )}
      {registerFor && (
        <AttendanceModal isOpen={!!registerFor} onClose={() => setRegisterFor(null)} onSuccess={() => setRegisterFor(null)} classId={registerFor.id} className={registerFor.class_name} />
      )}
    </div>
  );
};

export default TeacherClassesPage;
