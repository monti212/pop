import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardCheck,
  FolderOpen,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getTeacherClasses } from '../../services/classService';
import { getUserLessonPlans } from '../../services/lessonPlanService';
import { Class } from '../../types/attendance';
import AddClassModal from '../../components/AddClassModal';

const TeacherHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [classes, setClasses] = useState<Class[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadHome = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const [cls, les] = await Promise.all([
      getTeacherClasses(user.id),
      getUserLessonPlans(user.id, 3),
    ]);
    if (cls.success && cls.data) setClasses(cls.data);
    if (les.success && les.lessonPlans) setLessons(les.lessonPlans);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadHome(); }, [loadHome]);

  useEffect(() => {
    const open = () => setShowCreate(true);
    window.addEventListener('teach:new-class', open);
    return () => window.removeEventListener('teach:new-class', open);
  }, []);

  const totalStudents = useMemo(
    () => classes.reduce((sum, item) => sum + (item.student_count || 0), 0),
    [classes],
  );

  const newestClass = classes[0];

  const summaryCards = [
    { icon: Users, value: classes.length, label: 'Classes', aside: 'set up' },
    { icon: Users, value: totalStudents, label: 'Students', aside: 'across classes' },
    { icon: BookOpen, value: lessons.length, label: 'Lessons', aside: 'ready' },
    { icon: ClipboardCheck, value: classes.length, label: 'Registers', aside: 'ready' },
  ];

  const featureCards = [
    { icon: Users, title: 'Students', detail: 'Manage roster', onClick: () => navigate('/teach/classes') },
    { icon: Award, title: 'Grades', detail: 'Manage grades', onClick: () => navigate('/teach/classes') },
    { icon: ClipboardCheck, title: 'Registers', detail: 'Take attendance', onClick: () => navigate('/teach/classes') },
    { icon: BarChart3, title: 'Analytics', detail: 'View insights', onClick: () => navigate('/teach/classes') },
    { icon: FolderOpen, title: 'Documents', detail: 'Class files', onClick: () => navigate('/teach/classes') },
    { icon: Sparkles, title: 'AI Lesson Plan', detail: 'Generate plan', onClick: () => navigate('/teach/lessons') },
  ];

  const recentItems = useMemo(() => {
    const lessonItems = lessons.slice(0, 2).map((lesson) => ({
      icon: BookOpen,
      title: `Lesson plan created: ${lesson.title || lesson.topic || 'Untitled lesson'}`,
      note: lesson.created_at
        ? new Date(lesson.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : 'Saved lesson plan',
    }));

    const classItems = classes.slice(0, 2).map((classItem) => ({
      icon: ClipboardCheck,
      title: `Class set up: ${classItem.class_name}`,
      note: `${classItem.student_count || 0} students`,
    }));

    return [...lessonItems, ...classItems].slice(0, 3);
  }, [classes, lessons]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-greyed-navy" />
      </div>
    );
  }

  return (
    <div className="p-6 animate-w-fade">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white rounded-lg border border-[#e8e6e0] p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-8 h-8 text-greyed-navy" />
                  <span className="text-sm text-greyed-black/70">{card.aside}</span>
                </div>
                <h3 className="text-3xl font-bold text-greyed-navy mb-1">{card.value}</h3>
                <p className="text-sm text-greyed-black/70">{card.label}</p>
              </div>
            );
          })}
        </div>

        <section className="bg-white rounded-lg border border-[#e8e6e0] p-6 shadow-sm">
          <h3 className="text-lg font-bold text-greyed-navy mb-4">Feature Access</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <button
                  key={feature.title}
                  onClick={feature.onClick}
                  className="p-3 rounded-lg border border-[#e8e6e0] hover:border-greyed-navy hover:bg-greyed-blue/20 transition-all text-left group shadow-sm hover:shadow-md"
                >
                  <Icon className="w-5 h-5 text-greyed-navy mb-1.5" />
                  <h4 className="font-semibold text-greyed-navy text-sm">{feature.title}</h4>
                  <p className="text-xs text-greyed-black/60">{feature.detail}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-lg border border-[#e8e6e0] p-6 shadow-sm">
          <h3 className="text-lg font-bold text-greyed-navy mb-4">Recent Activity</h3>
          {recentItems.length > 0 ? (
            <div className="space-y-3">
              {recentItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={`${item.title}-${index}`} className="flex items-start gap-3 p-3 bg-[#f8f8f6] rounded-lg border border-[#e8e6e0]">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Icon className="w-4 h-4 text-greyed-navy" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-greyed-navy">{item.title}</p>
                      <p className="text-xs text-greyed-black/60 mt-1">{item.note}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-5 bg-[#f8f8f6] rounded-lg border border-[#e8e6e0] text-center">
              <p className="text-sm font-medium text-greyed-navy">No recent activity yet</p>
              <p className="text-xs text-greyed-black/60 mt-1">Your classes, registers, and lesson plans will show up here.</p>
            </div>
          )}
        </section>

        <div className="bg-greyed-blue/20 border border-greyed-blue/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-greyed-navy flex-none" />
            <p className="text-sm text-greyed-navy">
              {newestClass
                ? <>Latest class ready: <span className="font-semibold">{newestClass.class_name}</span></>
                : 'Create your first class to begin tracking students, registers, and lessons.'}
            </p>
          </div>
        </div>
      </div>

      <AddClassModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false);
          loadHome();
        }}
      />
    </div>
  );
};

export default TeacherHomePage;
