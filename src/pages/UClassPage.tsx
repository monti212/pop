import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Calendar, TrendingUp, BookOpen, Search, Filter,
  BarChart3, Edit, Trash2, Eye, FileText, Brain, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getTeacherClasses, getClassWithAttendanceRate } from '../services/classService';
import { getClassStudents } from '../services/studentService';
import { Class, Student } from '../types/attendance';
import AddClassModal from '../components/AddClassModal';
import AddStudentModal from '../components/AddStudentModal';
import EditClassModal from '../components/EditClassModal';
import AttendanceModal from '../components/AttendanceModal';

const UClassPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadClasses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass.id);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const result = await getTeacherClasses(user.id);
      if (result.success && result.data) {
        setClasses(result.data);
        if (result.data.length > 0 && !selectedClass) {
          setSelectedClass(result.data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudents = async (classId: string) => {
    try {
      const result = await getClassStudents(classId);
      if (result.success && result.data) {
        setStudents(result.data);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const filteredStudents = students.filter(student =>
    student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.student_identifier && student.student_identifier.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading U Class...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/chat')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">U Class</h1>
                <p className="text-gray-600">Manage your classes and students</p>
              </div>
            </div>

            <button
              onClick={() => setShowAddClassModal(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>New Class</span>
            </button>
          </div>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Classes Yet</h2>
            <p className="text-gray-600 mb-6">Create your first class to get started with classroom management</p>
            <button
              onClick={() => setShowAddClassModal(true)}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First Class</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase">Your Classes</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {classes.map(classItem => (
                    <button
                      key={classItem.id}
                      onClick={() => setSelectedClass(classItem)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        selectedClass?.id === classItem.id ? 'bg-teal-50 border-l-4 border-teal-600' : ''
                      }`}
                    >
                      <p className="font-medium text-gray-900">{classItem.class_name}</p>
                      <p className="text-sm text-gray-600 mt-1">{classItem.grade_level}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-xs text-gray-500 flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{classItem.student_count || 0} students</span>
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              {selectedClass ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedClass.class_name}</h2>
                        <p className="text-gray-600 mt-1">{selectedClass.grade_level}</p>
                        {selectedClass.description && (
                          <p className="text-gray-600 mt-2">{selectedClass.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowEditClassModal(true)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <Users className="w-6 h-6 text-blue-600 mb-2" />
                        <p className="text-2xl font-bold text-blue-900">{students.length}</p>
                        <p className="text-sm text-blue-700">Students</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <Calendar className="w-6 h-6 text-green-600 mb-2" />
                        <p className="text-2xl font-bold text-green-900">--</p>
                        <p className="text-sm text-green-700">Attendance Rate</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <TrendingUp className="w-6 h-6 text-purple-600 mb-2" />
                        <p className="text-2xl font-bold text-purple-900">--</p>
                        <p className="text-sm text-purple-700">Avg Grade</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4">
                        <FileText className="w-6 h-6 text-orange-600 mb-2" />
                        <p className="text-2xl font-bold text-orange-900">0</p>
                        <p className="text-sm text-orange-700">Assignments</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Students</h3>
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search students..."
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={() => setShowAttendanceModal(true)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                        >
                          <Calendar className="w-4 h-4" />
                          <span>Take Attendance</span>
                        </button>
                        <button
                          onClick={() => setShowAddStudentModal(true)}
                          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Student</span>
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-200">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map(student => (
                          <div
                            key={student.id}
                            className="px-6 py-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                                  <span className="text-lg font-semibold text-teal-700">
                                    {student.student_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <p className="font-medium text-gray-900">{student.student_name}</p>
                                    {student.has_neurodivergence && student.neurodivergence_type && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                        {student.neurodivergence_type}
                                      </span>
                                    )}
                                  </div>
                                  {student.student_identifier && (
                                    <p className="text-sm text-gray-600">ID: {student.student_identifier}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => navigate(`/u-class/student/${student.id}`)}
                                  className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                  title="View Profile"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => {}}
                                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                  title="Personality Profile"
                                >
                                  <Brain className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => {}}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View Grades"
                                >
                                  <BarChart3 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-6 py-12 text-center">
                          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600">
                            {searchTerm ? 'No students match your search' : 'No students in this class yet'}
                          </p>
                          {!searchTerm && (
                            <button
                              onClick={() => setShowAddStudentModal(true)}
                              className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors inline-flex items-center space-x-2"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Add Your First Student</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Select a class to view students</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddClassModal && (
        <AddClassModal
          isOpen={showAddClassModal}
          onClose={() => setShowAddClassModal(false)}
          onSuccess={() => {
            loadClasses();
            setShowAddClassModal(false);
          }}
        />
      )}

      {showAddStudentModal && selectedClass && (
        <AddStudentModal
          isOpen={showAddStudentModal}
          onClose={() => setShowAddStudentModal(false)}
          onSuccess={() => {
            loadStudents(selectedClass.id);
            setShowAddStudentModal(false);
          }}
          classId={selectedClass.id}
        />
      )}

      {showEditClassModal && selectedClass && (
        <EditClassModal
          isOpen={showEditClassModal}
          onClose={() => setShowEditClassModal(false)}
          onSuccess={() => {
            loadClasses();
            setShowEditClassModal(false);
          }}
          classData={selectedClass}
        />
      )}

      {showAttendanceModal && selectedClass && (
        <AttendanceModal
          isOpen={showAttendanceModal}
          onClose={() => setShowAttendanceModal(false)}
          onSuccess={() => {
            setShowAttendanceModal(false);
          }}
          classId={selectedClass.id}
          className={selectedClass.class_name}
        />
      )}
    </div>
  );
};

export default UClassPage;
