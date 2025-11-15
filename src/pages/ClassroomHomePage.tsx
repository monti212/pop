import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit, Users, Award, Activity, BarChart3, FolderOpen,
  Sparkles, ClipboardCheck, UserPlus, TrendingUp, AlertCircle,
  Calendar, BookOpen, Brain, Loader, X, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getClassroomOverview, ClassroomOverview } from '../services/classService';
import { getClassStudents } from '../services/studentService';
import { Student } from '../types/attendance';
import { format, parseISO } from 'date-fns';
import AddStudentModal from '../components/AddStudentModal';
import EditClassModal from '../components/EditClassModal';
import AttendanceModal from '../components/AttendanceModal';
import AnalyticsModal from '../components/AnalyticsModal';
import GradesManagementModal from '../components/GradesManagementModal';
import BehaviorLogModal from '../components/BehaviorLogModal';
import LessonPlanGeneratorModal from '../components/LessonPlanGeneratorModal';
import ClassDocumentsView from '../components/ClassDocumentsView';

const ClassroomHomePage: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [overview, setOverview] = useState<ClassroomOverview | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'students' | 'documents'>('overview');

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showGradesModal, setShowGradesModal] = useState(false);
  const [showBehaviorModal, setShowBehaviorModal] = useState(false);
  const [showLessonPlanModal, setShowLessonPlanModal] = useState(false);

  useEffect(() => {
    if (classId && user) {
      loadData();
    }
  }, [classId, user]);

  const loadData = async () => {
    if (!classId) return;

    setIsLoading(true);
    setOverviewLoading(true);
    setStudentsLoading(true);
    setError(null);

    try {
      // Fetch both overview and students in parallel for faster loading
      const [overviewResult, studentsResult] = await Promise.all([
        getClassroomOverview(classId),
        getClassStudents(classId)
      ]);

      if (overviewResult.success && overviewResult.data) {
        setOverview(overviewResult.data);
        setOverviewLoading(false);
      } else {
        setError(overviewResult.error || 'Failed to load classroom data');
        setOverviewLoading(false);
      }

      if (studentsResult.success && studentsResult.data) {
        setStudents(studentsResult.data);
        setStudentsLoading(false);
      } else {
        setStudentsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load classroom data');
      setOverviewLoading(false);
      setStudentsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalSuccess = () => {
    loadData();
  };

  if (isLoading && !overview) {
    return (
      <div className="h-screen bg-greyed-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-greyed-blue animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-greyed-black mb-2">Loading classroom...</h3>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="h-screen bg-greyed-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-greyed-black mb-2">Error Loading Classroom</h3>
          <p className="text-black/60 mb-6">{error || 'Classroom not found'}</p>
          <button
            onClick={() => navigate('/greyed-class')}
            className="px-6 py-3 bg-greyed-navy text-white rounded-lg hover:bg-greyed-navy/90 transition-colors"
          >
            Back to Classes
          </button>
        </div>
      </div>
    );
  }

  const { class: classData } = overview;

  return (
    <div className="h-screen bg-greyed-white flex flex-col overflow-hidden">
      <header className="bg-greyed-navy shadow-sm border-b border-greyed-navy/20 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/greyed-class')}
              className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Classes</span>
            </button>
          </div>

          {/* Centered GreyEd Logo */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <img src="/src/assets/Logo PNG.png" alt="GreyEd Teach" className="h-10" />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowAttendanceModal(true)}
              className="px-4 py-2 bg-greyed-blue text-greyed-navy rounded-lg hover:bg-greyed-blue/90 transition-colors flex items-center gap-2 font-medium"
            >
              <ClipboardCheck className="w-4 h-4" />
              Take Attendance
            </button>
            <button
              onClick={() => setShowAddStudentModal(true)}
              disabled={students.length >= 35}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                students.length >= 35
                  ? 'bg-greyed-beige/20 text-white/50 cursor-not-allowed'
                  : 'bg-white text-greyed-navy hover:bg-white/90'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Add Student
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 border-b border-white/10">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeView === 'overview'
                ? 'border-greyed-blue text-greyed-blue'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveView('students')}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeView === 'students'
                ? 'border-greyed-blue text-greyed-blue'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            Students ({students.length})
          </button>
          <button
            onClick={() => setActiveView('documents')}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeView === 'documents'
                ? 'border-greyed-blue text-greyed-blue'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            Documents
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {activeView === 'overview' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-greyed-beige/20 p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-greyed-navy" />
                  <span className="text-sm text-black/60">of 35</span>
                </div>
                <h3 className="text-3xl font-bold text-greyed-black mb-1">{overview.studentCount}</h3>
                <p className="text-sm text-black/60">Students</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg border border-greyed-beige/20 p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <ClipboardCheck className="w-8 h-8 text-greyed-blue" />
                  <span className="text-sm text-black/60">rate</span>
                </div>
                <h3 className="text-3xl font-bold text-greyed-black mb-1">
                  {Math.round(overview.attendanceRate)}%
                </h3>
                <p className="text-sm text-black/60">Attendance</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg border border-greyed-beige/20 p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <Award className="w-8 h-8 text-orange" />
                  <span className="text-sm text-black/60">average</span>
                </div>
                <h3 className="text-3xl font-bold text-greyed-black mb-1">
                  {overview.averageGrade > 0 ? `${overview.averageGrade}%` : '—'}
                </h3>
                <p className="text-sm text-black/60">Class Grade</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg border border-greyed-beige/20 p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <BookOpen className="w-8 h-8 text-greyed-navy" />
                  <span className="text-sm text-black/60">active</span>
                </div>
                <h3 className="text-3xl font-bold text-greyed-black mb-1">{overview.assignmentCount}</h3>
                <p className="text-sm text-black/60">Assignments</p>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-lg border border-greyed-beige/20 p-6"
              >
                <h3 className="text-lg font-bold text-greyed-black mb-4">Feature Access</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setActiveView('students')}
                    className="p-4 rounded-lg border-2 border-greyed-beige/20 hover:border-greyed-blue hover:bg-greyed-blue/10 transition-all text-left group"
                  >
                    <Users className="w-6 h-6 text-greyed-navy mb-2" />
                    <h4 className="font-semibold text-greyed-black text-sm">Students</h4>
                    <p className="text-xs text-black/60 mt-1">Manage roster</p>
                  </button>

                  <button
                    onClick={() => setShowGradesModal(true)}
                    className="p-4 rounded-lg border-2 border-greyed-beige/20 hover:border-orange hover:bg-orange/10 transition-all text-left group"
                  >
                    <Award className="w-6 h-6 text-orange mb-2" />
                    <h4 className="font-semibold text-greyed-black text-sm">Grades</h4>
                    <p className="text-xs text-black/60 mt-1">Manage grades</p>
                  </button>

                  <button
                    onClick={() => setShowBehaviorModal(true)}
                    className="p-4 rounded-lg border-2 border-greyed-beige/20 hover:border-orange hover:bg-orange/10 transition-all text-left group"
                  >
                    <Activity className="w-6 h-6 text-orange mb-2" />
                    <h4 className="font-semibold text-greyed-black text-sm">Behavior</h4>
                    <p className="text-xs text-black/60 mt-1">{overview.behaviorLogCount} logs</p>
                  </button>

                  <button
                    onClick={() => setShowAnalyticsModal(true)}
                    className="p-4 rounded-lg border-2 border-greyed-beige/20 hover:border-greyed-navy hover:bg-greyed-navy/10 transition-all text-left group"
                  >
                    <BarChart3 className="w-6 h-6 text-greyed-navy mb-2" />
                    <h4 className="font-semibold text-greyed-black text-sm">Analytics</h4>
                    <p className="text-xs text-black/60 mt-1">View insights</p>
                  </button>

                  <button
                    onClick={() => setActiveView('documents')}
                    className="p-4 rounded-lg border-2 border-greyed-beige/20 hover:border-greyed-blue hover:bg-greyed-blue/10 transition-all text-left group"
                  >
                    <FolderOpen className="w-6 h-6 text-greyed-blue mb-2" />
                    <h4 className="font-semibold text-greyed-black text-sm">Documents</h4>
                    <p className="text-xs text-black/60 mt-1">Class files</p>
                  </button>

                  <button
                    onClick={() => setShowLessonPlanModal(true)}
                    className="p-4 rounded-lg border-2 border-greyed-beige/20 hover:border-greyed-navy hover:bg-greyed-navy/10 transition-all text-left group"
                  >
                    <Sparkles className="w-6 h-6 text-greyed-navy mb-2" />
                    <h4 className="font-semibold text-greyed-black text-sm">AI Lesson Plan</h4>
                    <p className="text-xs text-black/60 mt-1">Generate plan</p>
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-lg border border-greyed-beige/20 p-6"
              >
                <h3 className="text-lg font-bold text-greyed-black mb-4">Recent Activity</h3>
                {overview.recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {overview.recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-greyed-white border border-greyed-beige/20"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-greyed-beige/20 flex items-center justify-center flex-shrink-0">
                          {activity.icon === 'ClipboardCheck' && <ClipboardCheck className="w-4 h-4 text-greyed-blue" />}
                          {activity.icon === 'Award' && <Award className="w-4 h-4 text-orange" />}
                          {activity.icon === 'Activity' && <Activity className="w-4 h-4 text-orange" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-greyed-black">{activity.description}</p>
                          <p className="text-xs text-black/60 mt-1">
                            {format(parseISO(activity.timestamp), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-greyed-beige mx-auto mb-3" />
                    <p className="text-sm text-black/60">No recent activity</p>
                  </div>
                )}
              </motion.div>
            </div>

            {overview.lastAttendanceDate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-greyed-blue/10 border border-greyed-blue/20 rounded-lg p-4"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-greyed-navy" />
                  <p className="text-sm text-greyed-navy">
                    Last attendance taken on{' '}
                    <span className="font-semibold">
                      {format(parseISO(overview.lastAttendanceDate), 'MMMM d, yyyy')}
                    </span>
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {activeView === 'students' && (
          <div className="max-w-7xl mx-auto">
            {students.length === 0 ? (
              <div className="flex items-center justify-center min-h-[500px]">
                <div className="text-center max-w-md">
                  <Users className="w-24 h-24 text-greyed-beige mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-greyed-black mb-3">No Students Yet</h3>
                  <p className="text-black/60 text-lg mb-8">
                    Add students to this class to start managing their profiles
                  </p>
                  <button
                    onClick={() => setShowAddStudentModal(true)}
                    className="px-8 py-4 bg-greyed-navy text-white rounded-lg hover:bg-greyed-navy/90 transition-all duration-200 flex items-center gap-2 mx-auto font-semibold shadow-sm hover:shadow-md"
                  >
                    <UserPlus className="w-5 h-5" />
                    Add Your First Student
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-greyed-beige/20 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-greyed-white border-b border-greyed-beige/20">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-greyed-black">Student Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-greyed-black">ID</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-greyed-black">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-greyed-black">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-greyed-white transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center">
                                <span className="text-greyed-blue font-semibold text-sm">
                                  {student.student_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-greyed-black">{student.student_name}</p>
                                {student.has_neurodivergence && student.neurodivergence_type && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                    {student.neurodivergence_type}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-black/60">
                            {student.student_identifier || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              student.active_status
                                ? 'bg-greyed-blue/20 text-greyed-navy'
                                : 'bg-greyed-beige/10 text-greyed-black'
                            }`}>
                              {student.active_status ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => navigate(`/greyed-class/student/${student.id}`)}
                              className="px-3 py-1.5 rounded-lg bg-greyed-blue/10 text-greyed-navy hover:bg-greyed-blue/20 transition-colors text-sm font-medium flex items-center gap-1"
                            >
                              <TrendingUp className="w-4 h-4" />
                              View Profile
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'documents' && (
          <div className="max-w-7xl mx-auto">
            <ClassDocumentsView classId={classId!} className={classData.class_name} />
          </div>
        )}
      </div>

      {showEditClassModal && (
        <EditClassModal
          isOpen={showEditClassModal}
          onClose={() => setShowEditClassModal(false)}
          onSuccess={handleModalSuccess}
          classData={{
            id: classData.id,
            name: classData.class_name,
            grade_level: classData.grade_level || '',
            description: classData.subject || null,
            school_year: new Date().getFullYear().toString(),
            is_active: classData.active_status
          }}
        />
      )}

      {showAddStudentModal && (
        <AddStudentModal
          isOpen={showAddStudentModal}
          onClose={() => setShowAddStudentModal(false)}
          onSuccess={handleModalSuccess}
          classId={classId!}
        />
      )}

      {showAttendanceModal && (
        <AttendanceModal
          isOpen={showAttendanceModal}
          onClose={() => setShowAttendanceModal(false)}
          onSuccess={handleModalSuccess}
          classId={classId!}
          className={classData.class_name}
        />
      )}

      {showAnalyticsModal && (
        <AnalyticsModal
          isOpen={showAnalyticsModal}
          onClose={() => setShowAnalyticsModal(false)}
          classId={classId!}
          className={classData.class_name}
        />
      )}

      {showGradesModal && (
        <GradesManagementModal
          isOpen={showGradesModal}
          onClose={() => setShowGradesModal(false)}
          onSuccess={handleModalSuccess}
          classId={classId!}
          className={classData.class_name}
          students={students}
        />
      )}

      {showBehaviorModal && (
        <BehaviorLogModal
          isOpen={showBehaviorModal}
          onClose={() => setShowBehaviorModal(false)}
          onSuccess={handleModalSuccess}
          classId={classId!}
          className={classData.class_name}
          students={students}
        />
      )}

      {showLessonPlanModal && (
        <LessonPlanGeneratorModal
          isOpen={showLessonPlanModal}
          onClose={() => setShowLessonPlanModal(false)}
          onSuccess={(lessonPlan: string) => {
            console.log('Generated lesson plan:', lessonPlan);
            handleModalSuccess();
            setShowLessonPlanModal(false);
          }}
          classId={classId!}
          className={classData.class_name}
          students={students}
        />
      )}
    </div>
  );
};

export default ClassroomHomePage;
