import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Loader, AlertTriangle, X, Users, ClipboardCheck,
  Calendar, Edit, Trash2, UserPlus, BarChart3, School, Archive, FolderOpen,
  Award, Activity, Sparkles, Brain, TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Class, Student } from '../types/attendance';
import { getTeacherClasses, getActiveClassCount } from '../services/classService';
import { getClassStudents } from '../services/studentService';
import AddClassModal from '../components/AddClassModal';
import EditClassModal from '../components/EditClassModal';
import AddStudentModal from '../components/AddStudentModal';
import EditStudentModal from '../components/EditStudentModal';
import AttendanceModal from '../components/AttendanceModal';
import AnalyticsModal from '../components/AnalyticsModal';
import ClassDocumentsView from '../components/ClassDocumentsView';
import GradesManagementModal from '../components/GradesManagementModal';
import BehaviorLogModal from '../components/BehaviorLogModal';
import LessonPlanGeneratorModal from '../components/LessonPlanGeneratorModal';
import StudentPersonalityModal from '../components/StudentPersonalityModal';

type ViewMode = 'classes' | 'students' | 'attendance' | 'analytics' | 'documents';

const UhuruFilesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>('classes');
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classCount, setClassCount] = useState<number>(0);

  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showGradesModal, setShowGradesModal] = useState(false);
  const [showBehaviorModal, setShowBehaviorModal] = useState(false);
  const [showLessonPlanModal, setShowLessonPlanModal] = useState(false);
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (user) {
      loadClasses();
      loadClassCount();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClass && viewMode === 'students') {
      loadStudents(selectedClass.id);
    }
  }, [selectedClass, viewMode]);

  const loadClasses = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getTeacherClasses(user.id);
      if (result.success && result.data) {
        setClasses(result.data);
      } else {
        setError(result.error || 'Failed to load classes');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load classes');
    } finally {
      setIsLoading(false);
    }
  };

  const loadClassCount = async () => {
    if (!user) return;

    try {
      const result = await getActiveClassCount(user.id);
      if (result.success && result.data !== undefined) {
        setClassCount(result.data);
      }
    } catch (error: any) {
      console.error('Error loading class count:', error);
    }
  };

  const loadStudents = async (classId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getClassStudents(classId);
      if (result.success && result.data) {
        setStudents(result.data);
      } else {
        setError(result.error || 'Failed to load students');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassSelect = (classItem: Class) => {
    navigate(`/greyed-class/classroom/${classItem.id}`);
  };

  const handleBackToClasses = () => {
    setSelectedClass(null);
    setViewMode('classes');
  };

  const handleTakeAttendance = (classItem: Class) => {
    setSelectedClass(classItem);
    setShowAttendanceModal(true);
  };

  const handleViewAnalytics = (classItem: Class) => {
    setSelectedClass(classItem);
    setShowAnalyticsModal(true);
  };

  const handleModalSuccess = () => {
    loadClasses();
    loadClassCount();
    if (selectedClass) {
      loadStudents(selectedClass.id);
    }
  };

  return (
    <div className="h-screen bg-greyed-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-greyed-navy shadow-sm border-b border-greyed-navy/20 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {viewMode !== 'classes' ? (
              <button
                onClick={handleBackToClasses}
                className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Classes</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Chat</span>
              </button>
            )}

            <div className="h-6 w-px bg-white/10"></div>

            <div className="flex items-center gap-3">
              <img src="/src/assets/Logo PNG.png" alt="GreyEd" className="w-7 h-7" />
              <div>
                <h1 className="text-2xl font-headline font-bold text-white">
                  {viewMode === 'classes' && 'GreyEd Teach'}
                  {viewMode === 'students' && `${selectedClass?.class_name} - Students`}
                  {viewMode === 'attendance' && `${selectedClass?.class_name} - Take Attendance`}
                  {viewMode === 'analytics' && `${selectedClass?.class_name} - Analytics`}
                  {viewMode === 'documents' && `${selectedClass?.class_name} - Documents`}
                </h1>
                <p className="text-sm text-white/80">
                  {viewMode === 'classes' && `Manage your classes and students • ${classCount} of 5 classes`}
                  {viewMode === 'students' && `${students.length} of 35 students`}
                  {viewMode === 'attendance' && 'Record daily attendance'}
                  {viewMode === 'analytics' && 'View attendance statistics'}
                  {viewMode === 'documents' && 'Lesson plans, notes, and reports'}
                </p>
              </div>
            </div>
          </div>

          {viewMode === 'classes' && (
            <motion.button
              onClick={() => setShowCreateClassModal(true)}
              disabled={classCount >= 5}
              className={`px-6 py-3 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 ${
                classCount >= 5
                  ? 'bg-greyed-beige/20 text-white/50 cursor-not-allowed'
                  : 'bg-greyed-blue text-greyed-navy hover:bg-greyed-blue/90'
              }`}
              whileHover={classCount < 5 ? { scale: 1.02 } : {}}
              whileTap={classCount < 5 ? { scale: 0.98 } : {}}
            >
              <Plus className="w-4 h-4" />
              Create Class
            </motion.button>
          )}

          {viewMode === 'students' && (
            <motion.button
              onClick={() => setShowAddStudentModal(true)}
              disabled={students.length >= 35}
              className={`px-6 py-3 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 ${
                students.length >= 35
                  ? 'bg-greyed-beige/20 text-white/50 cursor-not-allowed'
                  : 'bg-greyed-blue text-greyed-navy hover:bg-greyed-blue/90'
              }`}
              whileHover={students.length < 35 ? { scale: 1.02 } : {}}
              whileTap={students.length < 35 ? { scale: 0.98 } : {}}
            >
              <UserPlus className="w-4 h-4" />
              Add Student
            </motion.button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-2 rounded-lg text-red-500 hover:bg-red-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center">
              <Loader className="w-12 h-12 text-greyed-blue animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-greyed-black mb-2">Loading...</h3>
              <p className="text-black/60">Getting everything ready</p>
            </div>
          </div>
        ) : viewMode === 'classes' ? (
          classes.length === 0 ? (
            <div className="flex items-center justify-center min-h-[500px]">
              <div className="text-center max-w-md">
                <School className="w-24 h-24 text-greyed-beige mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-greyed-black mb-3">No Classes Yet</h3>
                <p className="text-black/60 text-lg mb-8">
                  Create your first class to start tracking attendance
                </p>
                <motion.button
                  onClick={() => setShowCreateClassModal(true)}
                  className="px-8 py-4 bg-greyed-navy text-white rounded-lg hover:bg-greyed-navy/90 transition-all duration-200 flex items-center gap-2 mx-auto font-semibold shadow-sm hover:shadow-md"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Class
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {classes.map((classItem) => (
                <motion.div
                  key={classItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleClassSelect(classItem)}
                  className="bg-white rounded-lg border border-greyed-beige/20 shadow-sm hover:shadow-lg hover:border-greyed-blue/30 transition-all duration-200 overflow-hidden cursor-pointer group"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-greyed-black group-hover:text-greyed-navy transition-colors mb-0.5">
                          {classItem.class_name}
                        </h3>
                        {classItem.subject && (
                          <p className="text-xs text-black/60 mb-0.5">{classItem.subject}</p>
                        )}
                        {classItem.grade_level && (
                          <p className="text-xs text-black/50">Grade {classItem.grade_level}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClass(classItem);
                          setShowEditClassModal(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-greyed-navy/10 text-black/60 hover:text-greyed-navy transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 mb-3 text-xs text-greyed-black">
                      <Users className="w-3.5 h-3.5 text-greyed-blue" />
                      <span className="font-medium">{classItem.student_count} students</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-center gap-2 p-2 bg-greyed-beige/10 rounded-lg border border-greyed-beige/20">
                        <School className="w-4 h-4 text-greyed-blue" />
                        <span className="text-xs font-medium text-greyed-black">Click to open classroom</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTakeAttendance(classItem);
                        }}
                        className="w-full px-3 py-2 bg-greyed-navy text-white rounded-lg hover:bg-greyed-navy/90 transition-colors text-sm font-semibold flex items-center justify-center gap-1.5"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        Quick Attendance
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        ) : viewMode === 'students' ? (
          students.length === 0 ? (
            <div className="flex items-center justify-center min-h-[500px]">
              <div className="text-center max-w-md">
                <Users className="w-24 h-24 text-greyed-beige mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-greyed-black mb-3">No Students Yet</h3>
                <p className="text-black/60 text-lg mb-8">
                  Add students to this class to start tracking attendance
                </p>
                <motion.button
                  onClick={() => setShowAddStudentModal(true)}
                  className="px-8 py-4 bg-greyed-navy text-white rounded-lg hover:bg-greyed-navy/90 transition-all duration-200 flex items-center gap-2 mx-auto font-semibold shadow-sm hover:shadow-md"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <UserPlus className="w-5 h-5" />
                  Add Your First Student
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-greyed-beige/20 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-greyed-beige/10 border-b border-greyed-beige/20">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-greyed-black">Student Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-greyed-black">ID</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-greyed-black">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-greyed-black">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-greyed-beige/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-greyed-blue/20 flex items-center justify-center">
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
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {student.active_status ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/greyed-class/student/${student.id}`)}
                              className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                              title="View Profile"
                            >
                              <TrendingUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowPersonalityModal(true);
                              }}
                              className="p-2 rounded-lg hover:bg-purple-100 text-purple-600 transition-colors"
                              title="Personality Profile"
                            >
                              <Brain className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowEditStudentModal(true);
                              }}
                              className="p-2 rounded-lg hover:bg-greyed-navy/10 text-black/60 hover:text-greyed-navy transition-colors"
                              title="Edit Student"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : viewMode === 'documents' && selectedClass ? (
          <ClassDocumentsView classId={selectedClass.id} className={selectedClass.class_name} />
        ) : null}
      </div>

      {/* Modals */}
      <AddClassModal
        isOpen={showCreateClassModal}
        onClose={() => setShowCreateClassModal(false)}
        onSuccess={handleModalSuccess}
      />

      {selectedClass && (
        <>
          <EditClassModal
            isOpen={showEditClassModal}
            onClose={() => {
              setShowEditClassModal(false);
              setSelectedClass(null);
            }}
            onSuccess={handleModalSuccess}
            classData={{
              id: selectedClass.id,
              name: selectedClass.class_name,
              grade_level: selectedClass.grade_level || '',
              description: selectedClass.subject || null,
              school_year: new Date().getFullYear().toString(),
              is_active: selectedClass.active_status
            }}
          />

          <AddStudentModal
            isOpen={showAddStudentModal}
            onClose={() => setShowAddStudentModal(false)}
            onSuccess={handleModalSuccess}
            classId={selectedClass.id}
          />

          <AttendanceModal
            isOpen={showAttendanceModal}
            onClose={() => setShowAttendanceModal(false)}
            onSuccess={handleModalSuccess}
            classId={selectedClass.id}
            className={selectedClass.class_name}
          />

          <AnalyticsModal
            isOpen={showAnalyticsModal}
            onClose={() => setShowAnalyticsModal(false)}
            classId={selectedClass.id}
            className={selectedClass.class_name}
          />
        </>
      )}

      {selectedStudent && (
        <>
          <EditStudentModal
            isOpen={showEditStudentModal}
            onClose={() => {
              setShowEditStudentModal(false);
              setSelectedStudent(null);
            }}
            onSuccess={handleModalSuccess}
            studentData={{
              id: selectedStudent.id,
              class_id: selectedStudent.class_id || selectedClass?.id || '',
              student_name: selectedStudent.student_name,
              student_identifier: selectedStudent.student_identifier,
              neurodivergence_type: selectedStudent.neurodivergence_type,
              accommodations: null,
              learning_notes: null,
              active_status: selectedStudent.active_status
            }}
          />

          <StudentPersonalityModal
            isOpen={showPersonalityModal}
            onClose={() => {
              setShowPersonalityModal(false);
              setSelectedStudent(null);
            }}
            onSuccess={() => {
              handleModalSuccess();
              setShowPersonalityModal(false);
              setSelectedStudent(null);
            }}
            studentId={selectedStudent.id}
            studentName={selectedStudent.student_name}
          />
        </>
      )}

      {selectedClass && (
        <>
          <GradesManagementModal
            isOpen={showGradesModal}
            onClose={() => {
              setShowGradesModal(false);
            }}
            onSuccess={handleModalSuccess}
            classId={selectedClass.id}
            className={selectedClass.class_name}
            students={students}
          />

          <BehaviorLogModal
            isOpen={showBehaviorModal}
            onClose={() => {
              setShowBehaviorModal(false);
            }}
            onSuccess={handleModalSuccess}
            classId={selectedClass.id}
            className={selectedClass.class_name}
            students={students}
          />

          <LessonPlanGeneratorModal
            isOpen={showLessonPlanModal}
            onClose={() => {
              setShowLessonPlanModal(false);
            }}
            onSuccess={(lessonPlan: string) => {
              console.log('Generated lesson plan:', lessonPlan);
              handleModalSuccess();
              setShowLessonPlanModal(false);
            }}
            classId={selectedClass.id}
            className={selectedClass.class_name}
            students={students}
          />
        </>
      )}
    </div>
  );
};

export default UhuruFilesPage;
