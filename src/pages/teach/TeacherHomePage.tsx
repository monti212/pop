import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardCheck,
  FolderOpen,
  RefreshCw,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { getClassroomOverview, getTeacherClasses, type ClassroomOverview, type RecentActivity } from '../../services/classService';
import { getClassStudents } from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';
import { Class, Student } from '../../types/attendance';
import AddClassModal from '../../components/AddClassModal';
import AddStudentModal from '../../components/AddStudentModal';
import AnalyticsModal from '../../components/AnalyticsModal';
import AttendanceModal from '../../components/AttendanceModal';
import BehaviorLogModal from '../../components/BehaviorLogModal';
import ClassDocumentsView from '../../components/ClassDocumentsView';
import GradesManagementModal from '../../components/GradesManagementModal';
import LessonPlanGeneratorModal from '../../components/LessonPlanGeneratorModal';

type ViewMode = 'overview' | 'students' | 'documents';

function viewModeFromParam(value: string | null): ViewMode {
  if (value === 'students' || value === 'documents') return value;
  return 'overview';
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || name.slice(0, 2).toUpperCase();
}

function activityIcon(activity: RecentActivity) {
  if (activity.icon === 'Award' || activity.type === 'grade') return Award;
  if (activity.icon === 'Activity' || activity.type === 'behavior') return Activity;
  if (activity.icon === 'BookOpen' || activity.type === 'lesson_plan') return BookOpen;
  return ClipboardCheck;
}

const TeacherHomePage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [classes, setClasses] = useState<Class[]>([]);
  const [overview, setOverview] = useState<ClassroomOverview | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showGrades, setShowGrades] = useState(false);
  const [showBehavior, setShowBehavior] = useState(false);
  const [showLessonPlan, setShowLessonPlan] = useState(false);

  const selectedClass = overview?.class || classes[0] || null;
  const activeView = viewModeFromParam(searchParams.get('view'));

  const updateActiveView = useCallback((view: ViewMode) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (view === 'overview') {
        next.delete('view');
      } else {
        next.set('view', view);
      }
      return next;
    });
  }, [setSearchParams]);

  const loadHome = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const classResult = await getTeacherClasses(user.id);
    const classList = classResult.success && classResult.data ? classResult.data : [];
    setClasses(classList);

    const currentClass = classList[0];
    if (currentClass) {
      const [overviewResult, studentsResult] = await Promise.all([
        getClassroomOverview(currentClass.id),
        getClassStudents(currentClass.id),
      ]);
      setOverview(overviewResult.success && overviewResult.data ? overviewResult.data : null);
      setStudents(studentsResult.success && studentsResult.data ? studentsResult.data : []);
    } else {
      setOverview(null);
      setStudents([]);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadHome(); }, [loadHome]);

  useEffect(() => {
    const open = () => setShowCreateClass(true);
    window.addEventListener('teach:new-class', open);
    return () => window.removeEventListener('teach:new-class', open);
  }, []);

  const headingMeta = useMemo(() => {
    if (!selectedClass) return 'GREYED TEACH';
    return [selectedClass.subject, selectedClass.grade_level].filter(Boolean).join(' · ') || selectedClass.class_name;
  }, [selectedClass]);

  const featureCards = [
    { icon: Users, title: 'Students', detail: 'Manage roster', active: activeView === 'students', onClick: () => updateActiveView('students') },
    { icon: Award, title: 'Grades', detail: 'Manage grades', active: false, onClick: () => selectedClass && setShowGrades(true) },
    { icon: Activity, title: 'Behavior', detail: `${overview?.behaviorLogCount || 0} logs`, active: false, onClick: () => selectedClass && setShowBehavior(true) },
    { icon: BarChart3, title: 'Analytics', detail: 'View insights', active: false, onClick: () => selectedClass && setShowAnalytics(true) },
    { icon: FolderOpen, title: 'Documents', detail: 'Class files', active: activeView === 'documents', onClick: () => updateActiveView('documents') },
    { icon: Sparkles, title: 'AI Lesson Plan', detail: 'Generate plan', active: false, onClick: () => selectedClass && setShowLessonPlan(true) },
  ];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-greyed-navy" />
      </div>
    );
  }

  return (
    <div className="min-h-full pb-20 lg:pb-0 font-sans [&_button]:font-sans [&_h1]:font-sans [&_h2]:font-sans [&_h3]:font-sans [&_h4]:font-sans [&_h5]:font-sans [&_h6]:font-sans">
      <header className="bg-white shadow-sm border-b border-[#e8e6e0] px-5 sm:px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-greyed-faint">{headingMeta}</div>
            <h1 className="font-display font-bold text-[26px] sm:text-[30px] text-greyed-navy leading-none mt-1">
              Classroom overview
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            <button
              type="button"
              onClick={loadHome}
              className="p-2 rounded-lg hover:bg-greyed-blue/20 text-greyed-navy transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => selectedClass && setShowAttendance(true)}
              disabled={!selectedClass}
              className="px-4 py-2 border-2 border-greyed-navy text-greyed-navy rounded-lg hover:bg-greyed-navy/10 transition-all flex items-center gap-2 font-medium disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <ClipboardCheck className="w-4 h-4" />
              Take Attendance
            </button>
            <button
              type="button"
              onClick={() => selectedClass && setShowAddStudent(true)}
              disabled={!selectedClass || students.length >= 35}
              className="px-4 py-2 border-2 border-greyed-navy text-greyed-navy rounded-lg hover:bg-greyed-navy/10 transition-all flex items-center gap-2 font-medium disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              Add Student
            </button>
          </div>
        </div>

      </header>

      <div className="p-5 sm:p-8">
        {!selectedClass ? (
          <div className="max-w-7xl mx-auto bg-white rounded-lg border border-[#e8e6e0] p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-greyed-navy mb-3">No Classes Yet</h2>
            <p className="text-greyed-black/70 mb-6">Create your first class to start tracking attendance, students, and lessons.</p>
            <button
              type="button"
              onClick={() => setShowCreateClass(true)}
              className="px-8 py-4 bg-greyed-navy text-white rounded-lg hover:bg-greyed-navy/90 transition-all duration-200 inline-flex items-center gap-2 font-semibold shadow-sm hover:shadow-md"
            >
              <Users className="w-5 h-5" />
              Create Your First Class
            </button>
          </div>
        ) : activeView === 'overview' ? (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-[#e8e6e0] p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="w-12 h-12 rounded-[14px] bg-greyed-tile text-greyed-navy flex items-center justify-center"><Users className="w-7 h-7" /></span>
                  <span className="text-sm text-greyed-black/70">of 35</span>
                </div>
                <h3 className="text-3xl font-bold text-greyed-navy mb-1">{overview?.studentCount ?? students.length}</h3>
                <p className="text-sm text-greyed-black/70">Students</p>
              </div>

              <div className="bg-white rounded-lg border border-[#e8e6e0] p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="w-12 h-12 rounded-[14px] bg-greyed-tile text-greyed-navy flex items-center justify-center"><ClipboardCheck className="w-7 h-7" /></span>
                  <span className="text-sm text-greyed-black/70">rate</span>
                </div>
                <h3 className="text-3xl font-bold text-greyed-navy mb-1">{Math.round(overview?.attendanceRate || 0)}%</h3>
                <p className="text-sm text-greyed-black/70">Attendance</p>
              </div>

              <div className="bg-white rounded-lg border border-[#e8e6e0] p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="w-12 h-12 rounded-[14px] bg-greyed-tile text-greyed-navy flex items-center justify-center"><Award className="w-7 h-7" /></span>
                  <span className="text-sm text-greyed-black/70">average</span>
                </div>
                <h3 className="text-3xl font-bold text-greyed-navy mb-1">{selectedClass.grade_level || 'Grade'}</h3>
                <p className="text-sm text-greyed-black/70">Class Average: {Math.round(overview?.averageGrade || 0)}%</p>
              </div>

              <div className="bg-white rounded-lg border border-[#e8e6e0] p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-12 h-12 rounded-[14px] bg-greyed-tile text-greyed-navy flex items-center justify-center"><BookOpen className="w-7 h-7" /></span>
                </div>
                <h3 className="font-bold text-greyed-navy mb-3">Assessment</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-greyed-black/70">
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />{overview?.activeAssignments || 0} active</span>
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />{overview?.upcomingAssignments || 0} upcoming</span>
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />{overview?.dueAssignments || 0} due</span>
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-gray-500" />{overview?.completedAssignments || 0} completed</span>
                </div>
              </div>
            </div>

            <section className="bg-white rounded-lg border border-[#e8e6e0] p-6 shadow-sm">
              <h3 className="text-lg font-bold text-greyed-navy mb-4">Feature Access</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {featureCards.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <button
                      key={feature.title}
                      onClick={feature.onClick}
                      className={`p-3 rounded-lg border transition-all text-left shadow-sm hover:shadow-md ${
                        feature.active
                          ? 'border-greyed-navy bg-greyed-blue/20'
                          : 'border-[#e8e6e0] hover:border-greyed-navy hover:bg-greyed-blue/20'
                      }`}
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
              {overview?.recentActivity?.length ? (
                <div className="space-y-3">
                  {overview.recentActivity.map((activity) => {
                    const Icon = activityIcon(activity);
                    return (
                      <div key={activity.id} className="flex items-start gap-3 p-3 bg-[#f8f8f6] rounded-lg border border-[#e8e6e0]">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <Icon className="w-4 h-4 text-greyed-navy" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-greyed-navy">{activity.description}</p>
                          <p className="text-xs text-greyed-black/60 mt-1">{formatDateTime(activity.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-5 bg-[#f8f8f6] rounded-lg border border-[#e8e6e0] text-center">
                  <p className="text-sm font-medium text-greyed-navy">No recent activity yet</p>
                  <p className="text-xs text-greyed-black/60 mt-1">Attendance, grades, behavior notes, and lesson plans will show up here.</p>
                </div>
              )}
            </section>

            {overview?.lastAttendanceDate && (
              <div className="bg-greyed-blue/20 border border-greyed-blue/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-greyed-navy flex-none" />
                  <p className="text-sm text-greyed-navy">
                    Last attendance taken on <span className="font-semibold">{formatDate(overview.lastAttendanceDate)}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : activeView === 'students' ? (
          <div className="max-w-7xl mx-auto bg-white rounded-lg border border-[#e8e6e0] shadow-sm overflow-hidden">
            {students.length === 0 ? (
              <div className="text-center py-14">
                <h3 className="text-2xl font-bold text-greyed-navy mb-3">No Students Yet</h3>
                <p className="text-greyed-black/70 mb-6">Add your first student to begin tracking classroom support.</p>
                <button
                  type="button"
                  onClick={() => setShowAddStudent(true)}
                  className="px-8 py-4 bg-greyed-navy text-white rounded-lg hover:bg-greyed-navy/90 transition-all inline-flex items-center gap-2 font-semibold shadow-sm hover:shadow-md"
                >
                  <UserPlus className="w-5 h-5" />
                  Add Student
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#e8e6e0]">
                {students.map((student) => (
                  <div key={student.id} className="flex items-center gap-4 px-6 py-4">
                    <span className="w-10 h-10 rounded-full bg-greyed-blue/30 flex items-center justify-center text-greyed-navy font-semibold text-sm">
                      {initials(student.student_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-greyed-navy">{student.student_name}</p>
                      {student.student_identifier && <p className="text-sm text-greyed-black/60">{student.student_identifier}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            <ClassDocumentsView classId={selectedClass.id} className={selectedClass.class_name} />
          </div>
        )}
      </div>

      <AddClassModal isOpen={showCreateClass} onClose={() => setShowCreateClass(false)} onSuccess={() => { setShowCreateClass(false); loadHome(); }} />
      {selectedClass && (
        <>
          <AddStudentModal isOpen={showAddStudent} onClose={() => setShowAddStudent(false)} onSuccess={() => { setShowAddStudent(false); loadHome(); }} classId={selectedClass.id} />
          <AttendanceModal isOpen={showAttendance} onClose={() => setShowAttendance(false)} onSuccess={() => { setShowAttendance(false); loadHome(); }} classId={selectedClass.id} className={selectedClass.class_name} />
          <AnalyticsModal isOpen={showAnalytics} onClose={() => setShowAnalytics(false)} classId={selectedClass.id} className={selectedClass.class_name} />
          <GradesManagementModal isOpen={showGrades} onClose={() => setShowGrades(false)} onSuccess={() => { setShowGrades(false); loadHome(); }} classId={selectedClass.id} className={selectedClass.class_name} students={students} />
          <BehaviorLogModal isOpen={showBehavior} onClose={() => setShowBehavior(false)} onSuccess={() => { setShowBehavior(false); loadHome(); }} classId={selectedClass.id} className={selectedClass.class_name} students={students} />
          <LessonPlanGeneratorModal
            isOpen={showLessonPlan}
            onClose={() => setShowLessonPlan(false)}
            onSuccess={() => {
              setShowLessonPlan(false);
              loadHome();
            }}
            classId={selectedClass.id}
            className={selectedClass.class_name}
            students={students}
            classGrade={selectedClass.grade_level}
            classSubject={selectedClass.subject}
          />
        </>
      )}
    </div>
  );
};

export default TeacherHomePage;
