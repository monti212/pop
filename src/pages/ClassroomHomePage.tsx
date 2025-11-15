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
    setError(null);

    try {
      const overviewResult = await getClassroomOverview(classId);
      if (overviewResult.success && overviewResult.data) {
        setOverview(overviewResult.data);
      } else {
        setError(overviewResult.error || 'Failed to load classroom data');
      }

      const studentsResult = await getClassStudents(classId);
      if (studentsResult.success && studentsResult.data) {
        setStudents(studentsResult.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load classroom data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalSuccess = () => {
    loadData();
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-teal animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading classroom...</h3>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Classroom</h3>
          <p className="text-gray-600 mb-6">{error || 'Classroom not found'}</p>
          <button
            onClick={() => navigate('/u-class')}
            className="px-6 py-3 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors"
          >
            Back to Classes
          </button>
        </div>
      </div>
    );
  }

  const { class: classData } = overview;

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/u-class')}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-teal transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Classes</span>
            </button>

            <div className="h-6 w-px bg-gray-300"></div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{classData.class_name}</h1>
                <button
                  onClick={() => setShowEditClassModal(true)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-teal transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                {classData.subject && <span>{classData.subject}</span>}
                {classData.grade_level && (
                  <>
                    <span>•</span>
                    <span>Grade {classData.grade_level}</span>
                  </>
                )}
                {classData.class_section && (
                  <>
                    <span>•</span>
                    <span>Section {classData.class_section}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-teal transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowAttendanceModal(true)}
              className="px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors flex items-center gap-2 font-medium"
            >
              <ClipboardCheck className="w-4 h-4" />
              Take Attendance
            </button>
            <button
              onClick={() => setShowAddStudentModal(true)}
              disabled={students.length >= 35}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                students.length >= 35
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Add Student
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 border-b border-gray-200">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeView === 'overview'
                ? 'border-teal text-teal'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveView('students')}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeView === 'students'
                ? 'border-teal text-teal'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Students ({students.length})
          </button>
          <button
            onClick={() => setActiveView('documents')}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeView === 'documents'
                ? 'border-teal text-teal'
                : 'border-transparent text-gray-600 hover:text-gray-900'
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
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-blue-600" />
                  <span className="text-sm text-gray-600">of 35</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-1">{overview.studentCount}</h3>
                <p className="text-sm text-gray-600">Students</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <ClipboardCheck className="w-8 h-8 text-green-600" />
                  <span className="text-sm text-gray-600">rate</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-1">
                  {Math.round(overview.attendanceRate)}%
                </h3>
                <p className="text-sm text-gray-600">Attendance</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <Award className="w-8 h-8 text-yellow-600" />
                  <span className="text-sm text-gray-600">average</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-1">
                  {overview.averageGrade > 0 ? `${overview.averageGrade}%` : '—'}
                </h3>
                <p className="text-sm text-gray-600">Class Grade</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <BookOpen className="w-8 h-8 text-purple-600" />
                  <span className="text-sm text-gray-600">active</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-1">{overview.assignmentCount}</h3>
                <p className="text-sm text-gray-600">Assignments</p>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Feature Access</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setActiveView('students')}
                    className="p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                  >
                    <Users className="w-6 h-6 text-blue-600 mb-2" />
                    <h4 className="font-semibold text-gray-900 text-sm">Students</h4>
                    <p className="text-xs text-gray-600 mt-1">Manage roster</p>
                  </button>

                  <button
                    onClick={() => setShowGradesModal(true)}
                    className="p-4 rounded-lg border-2 border-gray-200 hover:border-yellow-500 hover:bg-yellow-50 transition-all text-left group"
                  >
                    <Award className="w-6 h-6 text-yellow-600 mb-2" />
                    <h4 className="font-semibold text-gray-900 text-sm">Grades</h4>
                    <p className="text-xs text-gray-600 mt-1">Manage grades</p>
                  </button>

                  <button
                    onClick={() => setShowBehaviorModal(true)}
                    className="p-4 rounded-lg border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all text-left group"
                  >
                    <Activity className="w-6 h-6 text-orange-600 mb-2" />
                    <h4 className="font-semibold text-gray-900 text-sm">Behavior</h4>
                    <p className="text-xs text-gray-600 mt-1">{overview.behaviorLogCount} logs</p>
                  </button>

                  <button
                    onClick={() => setShowAnalyticsModal(true)}
                    className="p-4 rounded-lg border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
                  >
                    <BarChart3 className="w-6 h-6 text-purple-600 mb-2" />
                    <h4 className="font-semibold text-gray-900 text-sm">Analytics</h4>
                    <p className="text-xs text-gray-600 mt-1">View insights</p>
                  </button>

                  <button
                    onClick={() => setActiveView('documents')}
                    className="p-4 rounded-lg border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                  >
                    <FolderOpen className="w-6 h-6 text-green-600 mb-2" />
                    <h4 className="font-semibold text-gray-900 text-sm">Documents</h4>
                    <p className="text-xs text-gray-600 mt-1">Class files</p>
                  </button>

                  <button
                    onClick={() => setShowLessonPlanModal(true)}
                    className="p-4 rounded-lg border-2 border-gray-200 hover:border-pink-500 hover:bg-pink-50 transition-all text-left group"
                  >
                    <Sparkles className="w-6 h-6 text-pink-600 mb-2" />
                    <h4 className="font-semibold text-gray-900 text-sm">AI Lesson Plan</h4>
                    <p className="text-xs text-gray-600 mt-1">Generate plan</p>
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
                {overview.recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {overview.recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                          {activity.icon === 'ClipboardCheck' && <ClipboardCheck className="w-4 h-4 text-teal" />}
                          {activity.icon === 'Award' && <Award className="w-4 h-4 text-yellow-600" />}
                          {activity.icon === 'Activity' && <Activity className="w-4 h-4 text-orange-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {format(parseISO(activity.timestamp), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">No recent activity</p>
                  </div>
                )}
              </motion.div>
            </div>

            {overview.lastAttendanceDate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-blue-900">
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
                  <Users className="w-24 h-24 text-gray-300 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">No Students Yet</h3>
                  <p className="text-gray-600 text-lg mb-8">
                    Add students to this class to start managing their profiles
                  </p>
                  <button
                    onClick={() => setShowAddStudentModal(true)}
                    className="px-8 py-4 bg-teal text-white rounded-lg hover:bg-teal/90 transition-all duration-200 flex items-center gap-2 mx-auto font-semibold shadow-sm hover:shadow-md"
                  >
                    <UserPlus className="w-5 h-5" />
                    Add Your First Student
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Student Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">ID</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center">
                                <span className="text-teal font-semibold text-sm">
                                  {student.student_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{student.student_name}</p>
                                {student.has_neurodivergence && student.neurodivergence_type && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                    {student.neurodivergence_type}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {student.student_identifier || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              student.active_status
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {student.active_status ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => navigate(`/u-class/student/${student.id}`)}
                              className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium flex items-center gap-1"
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
