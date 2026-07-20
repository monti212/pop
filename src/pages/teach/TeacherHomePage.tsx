import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ArrowRight, ChevronRight, Download, Sparkles, Send, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getTeacherClasses } from '../../services/classService';
import { getUserLessonPlans } from '../../services/lessonPlanService';
import { Class } from '../../types/attendance';

/**
 * TeacherHomePage (S1) — the GreyEd teacher home.
 * Greeting hero + today's classes + a compact Ask/Do panel (full agentic
 * behaviour is S4) + quick stats + recent lessons, sourced from classService
 * and lessonPlanService. Responsive: reflows to a single column on mobile.
 */
const TeacherHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [classes, setClasses] = useState<Class[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [askInput, setAskInput] = useState('');
  const [askMode, setAskMode] = useState<'ask' | 'do'>('ask');

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const [cls, les] = await Promise.all([
        getTeacherClasses(user.id),
        getUserLessonPlans(user.id, 3),
      ]);
      if (!alive) return;
      if (cls.success && cls.data) setClasses(cls.data);
      if (les.success && les.lessonPlans) setLessons(les.lessonPlans);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const firstName = useMemo(() => {
    const n = (profile as any)?.name || (profile as any)?.full_name || user?.email?.split('@')[0] || 'there';
    return String(n).split(/[\s@._-]+/)[0];
  }, [profile, user]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${firstName}`;
  }, [firstName]);

  const dateLine = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
    [],
  );

  const totalLearners = useMemo(() => classes.reduce((s, c) => s + (c.student_count || 0), 0), [classes]);
  const todayClasses = classes.slice(0, 3);

  const quickStats = [
    { val: classes.length, label: 'Classes', sub: classes.length === 1 ? '1 class set up' : `${classes.length} classes set up` },
    { val: totalLearners, label: 'Learners', sub: 'across your classes' },
    { val: lessons.length, label: 'Lessons ready', sub: 'saved plans' },
    { val: classes.length, label: 'Registers', sub: 'ready to take today' },
  ];

  const goAsk = () => {
    navigate('/teach/ask', { state: { mode: askMode, q: askInput.trim() || undefined } });
  };

  const lessonMeta = (l: any) => ({
    topic: l.title || l.topic || 'Lesson plan',
    grade: l.grade_level || l.metadata?.grade_level || '',
    subject: l.subject || l.metadata?.subject || '',
    date: l.created_at ? new Date(l.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '',
    id: l.id,
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-greyed-navy" />
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-7 animate-w-fade">
      {/* greeting hero */}
      <div className="relative overflow-hidden rounded-[20px] px-6 sm:px-[30px] py-6 mb-[22px] text-white bg-gradient-to-br from-greyed-navy to-[#0B1640] flex items-start justify-between gap-4 flex-wrap">
        <div className="relative z-[1]">
          <div className="font-bold text-[10px] tracking-[0.18em] uppercase opacity-55 mb-[10px]">{dateLine}</div>
          <h2 className="font-display font-semibold text-[24px] sm:text-[30px] m-0 mb-2 tracking-[-0.02em]">{greeting}</h2>
          <div className="text-[14px] sm:text-[15px] opacity-75 leading-[1.5]">GreyEd helps. You decide.</div>
        </div>
        <div className="flex gap-[10px] flex-none relative z-[1]">
          <div className="bg-white/10 border border-white/15 rounded-12 px-4 py-[10px] text-center">
            <div className="font-display font-bold text-[22px]">{totalLearners}</div>
            <div className="text-[11.5px] opacity-65 mt-0.5">learners</div>
          </div>
          <div className="bg-white/10 border border-white/15 rounded-12 px-4 py-[10px] text-center">
            <div className="font-display font-bold text-[22px]">{lessons.length}</div>
            <div className="text-[11.5px] opacity-65 mt-0.5">lessons ready</div>
          </div>
        </div>
        <span className="absolute -top-[60px] -right-[40px] w-[200px] h-[200px] rounded-full bg-greyed-blue/10" />
      </div>

      {/* today's classes + mini Ask/Do */}
      <div className="grid grid-cols-1 lg:grid-cols-[repeat(3,1fr)_320px] gap-4 items-start mb-[22px]">
        {todayClasses.length === 0 ? (
          <button
            onClick={() => navigate('/teach/classes')}
            className="lg:col-span-3 min-h-[160px] flex flex-col items-start justify-between p-[22px] rounded-[18px] border-2 border-dashed border-greyed-beige bg-transparent text-left"
          >
            <span className="w-11 h-11 rounded-[13px] bg-greyed-white text-greyed-navy flex items-center justify-center"><Plus size={22} /></span>
            <span>
              <span className="block font-display font-semibold text-[16px] text-greyed-navy">Add your first class</span>
              <span className="block text-[13px] text-greyed-faint mt-0.5">Set up a grade to take registers and build lessons.</span>
            </span>
          </button>
        ) : (
          todayClasses.map((c) => (
            <div key={c.id} className="bg-white border border-greyed-line rounded-[18px] p-5 animate-w-fade">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-bold text-[9.5px] tracking-[0.14em] uppercase text-greyed-faint">
                  {c.meeting_time || 'Anytime'}
                </span>
              </div>
              <div className="font-display font-semibold text-[18px] text-greyed-navy mb-0.5 tracking-[-0.01em]">{c.class_name}</div>
              <div className="text-[13px] text-greyed-ink mb-4">
                {[c.grade_level, c.subject].filter(Boolean).join(' · ') || 'Class'} · {c.student_count || 0} learners
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate('/teach/classes')} className="flex-1 inline-flex items-center justify-center gap-1.5 p-2.5 rounded-[11px] border border-greyed-line bg-sand-200 text-greyed-navy font-semibold text-[12.5px]">
                  <ClipboardList size={14} />Register
                </button>
                <button onClick={() => navigate('/teach/lessons')} className="flex-1 inline-flex items-center justify-center gap-1.5 p-2.5 rounded-[11px] bg-greyed-navy text-white font-semibold text-[12.5px]">
                  Lessons<ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))
        )}

        {/* mini Ask/Do panel (compact; full agentic flow is S4) */}
        <div className="bg-white border border-greyed-line rounded-[18px] flex flex-col h-[302px]">
          <div className="px-[15px] py-3 border-b border-greyed-line flex items-center gap-[9px] flex-none">
            <span className="w-8 h-8 rounded-full bg-greyed-navy flex items-center justify-center flex-none"><Sparkles size={16} className="text-white" /></span>
            <span className="flex-1 font-display font-semibold text-[14px] text-greyed-navy">GreyEd</span>
            <div className="flex bg-sand-200 border border-greyed-line rounded-full p-0.5">
              {(['ask', 'do'] as const).map((m) => (
                <button key={m} onClick={() => setAskMode(m)}
                  className={`px-2.5 py-1 rounded-full text-[12px] font-semibold capitalize ${askMode === m ? 'bg-greyed-navy text-white' : 'text-greyed-ink'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-[13px] text-[13px] text-greyed-soft leading-[1.5]">
            {askMode === 'ask'
              ? 'Answers only. Nothing changes. Ask about your classes, learners, or a topic.'
              : 'Acts across your platform — you approve first. Try “Mark today’s register” or “Draft term reports”.'}
          </div>
          <div className="flex-none p-3 border-t border-greyed-line flex gap-[7px] items-center">
            <input
              value={askInput}
              onChange={(e) => setAskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && goAsk()}
              placeholder={askMode === 'ask' ? 'Ask GreyEd…' : 'Tell GreyEd what to do…'}
              className="flex-1 border-[1.5px] border-greyed-line rounded-[10px] px-[11px] py-2 text-[13px] text-greyed-black bg-white outline-none"
            />
            <button onClick={goAsk} aria-label="Send" className="w-[34px] h-[34px] rounded-[10px] bg-greyed-navy text-white flex items-center justify-center flex-none">
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] mb-[22px]">
        {quickStats.map((qs) => (
          <div key={qs.label} className="bg-white border border-greyed-line rounded-16 px-5 py-[18px]">
            <div className="font-display font-bold text-[26px] text-greyed-navy leading-none">{qs.val}</div>
            <div className="font-semibold text-[13.5px] text-greyed-black mt-[3px]">{qs.label}</div>
            <div className="text-[12px] text-greyed-faint mt-[3px]">{qs.sub}</div>
          </div>
        ))}
      </div>

      {/* recent lessons */}
      <div className="flex justify-between items-center mb-3">
        <div className="font-display font-semibold text-[16px] text-greyed-navy">Recent lessons</div>
        <button onClick={() => navigate('/teach/lessons')} className="font-semibold text-[13px] text-greyed-navy inline-flex items-center gap-1.5">
          See all<ChevronRight size={14} />
        </button>
      </div>
      {lessons.length === 0 ? (
        <div className="bg-white border border-greyed-line rounded-16 px-5 py-8 text-center">
          <div className="font-display font-semibold text-[15px] text-greyed-navy mb-1">No lessons yet</div>
          <div className="text-[13px] text-greyed-faint">The first lesson you build will show up here.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]">
          {lessons.map((raw) => {
            const l = lessonMeta(raw);
            return (
              <div key={l.id} onClick={() => navigate('/teach/lessons')} className="bg-white border border-greyed-line rounded-16 px-5 py-[18px] cursor-pointer shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all">
                {(l.grade || l.subject) && (
                  <div className="font-bold text-[9.5px] tracking-[0.12em] uppercase text-greyed-faint mb-1.5">
                    {[l.grade, l.subject].filter(Boolean).join(' · ')}
                  </div>
                )}
                <div className="font-display font-semibold text-[16px] text-greyed-navy leading-[1.3] mb-1">{l.topic}</div>
                <div className="text-[12px] text-greyed-faint">{l.date}</div>
                <div className="flex gap-2 mt-[14px]">
                  <button onClick={(e) => { e.stopPropagation(); navigate('/teach/lessons'); }} className="flex-1 p-2.5 rounded-[10px] bg-greyed-navy text-white font-semibold text-[12.5px]">Open plan</button>
                  <button onClick={(e) => { e.stopPropagation(); navigate('/teach/lessons'); }} aria-label="Download" className="px-3 rounded-[10px] border border-greyed-line bg-white text-greyed-navy"><Download size={15} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeacherHomePage;
