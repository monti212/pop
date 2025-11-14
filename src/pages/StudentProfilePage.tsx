import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit, Save, X, User, GraduationCap, Heart, Brain,
  Phone, Mail, AlertCircle, TrendingUp, Calendar, CheckCircle,
  FileText, Plus, Activity
} from 'lucide-react';
import { getEnhancedStudentProfile, updateStudentProfile, getStudentBehaviorLogs } from '../services/studentProfileService';
import { getStudentGrades } from '../services/gradeService';
import { getStudentWithAttendanceRate } from '../services/studentService';
import { EnhancedStudent, StudentBehaviorLog } from '../types/studentProfile';
import { StudentGrade } from '../types/grades';
import StudentPersonalityModal from '../components/StudentPersonalityModal';

const StudentProfilePage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<EnhancedStudent | null>(null);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [behaviorLogs, setBehaviorLogs] = useState<StudentBehaviorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);
  const [editData, setEditData] = useState({
    parent_guardian_name: '',
    parent_guardian_email: '',
    parent_guardian_phone: '',
    emergency_contact: '',
    medical_notes: '',
    strengths: '',
    areas_for_improvement: '',
    interests: '',
    preferred_seating: ''
  });

  useEffect(() => {
    if (studentId) {
      loadStudentData();
    }
  }, [studentId]);

  const loadStudentData = async () => {
    if (!studentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [profileResult, gradesResult, behaviorResult, attendanceResult] = await Promise.all([
        getEnhancedStudentProfile(studentId),
        getStudentGrades(studentId),
        getStudentBehaviorLogs(studentId, 10),
        getStudentWithAttendanceRate(studentId)
      ]);

      if (!profileResult.success || !profileResult.data) {
        throw new Error(profileResult.error || 'Failed to load student profile');
      }

      const enhancedStudent = {
        ...profileResult.data,
        attendance_rate: attendanceResult.data?.attendance_rate
      };

      setStudent(enhancedStudent);
      setGrades(gradesResult.data || []);
      setBehaviorLogs(behaviorResult.data || []);

      setEditData({
        parent_guardian_name: enhancedStudent.parent_guardian_name || '',
        parent_guardian_email: enhancedStudent.parent_guardian_email || '',
        parent_guardian_phone: enhancedStudent.parent_guardian_phone || '',
        emergency_contact: enhancedStudent.emergency_contact || '',
        medical_notes: enhancedStudent.medical_notes || '',
        strengths: enhancedStudent.strengths || '',
        areas_for_improvement: enhancedStudent.areas_for_improvement || '',
        interests: enhancedStudent.interests || '',
        preferred_seating: enhancedStudent.preferred_seating || ''
      });
    } catch (err: any) {
      console.error('Error loading student data:', err);
      setError(err.message || 'Failed to load student profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!studentId) return;

    try {
      const result = await updateStudentProfile(studentId, editData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      setIsEditing(false);
      loadStudentData();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading student profile...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">Error Loading Profile</h2>
          <p className="text-gray-600 text-center mb-6">{error || 'Student not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const averageGrade = grades.length > 0
    ? grades.reduce((sum, grade) => sum + grade.percentage, 0) / grades.length
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Class</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-8 py-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                  {student.profile_photo_url ? (
                    <img src={student.profile_photo_url} alt={student.student_name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-teal-600" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{student.student_name}</h1>
                  {student.student_identifier && (
                    <p className="text-teal-100 mt-1">ID: {student.student_identifier}</p>
                  )}
                  {student.has_neurodivergence && student.neurodivergence_type && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 mt-2">
                      {student.neurodivergence_type}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 bg-white text-teal-700 rounded-lg hover:bg-teal-50 transition-colors flex items-center space-x-2"
              >
                {isEditing ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span className="text-2xl font-bold text-blue-900">{student.current_gpa.toFixed(2)}</span>
              </div>
              <p className="text-sm text-blue-700">Current GPA</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold text-green-900">
                  {student.attendance_rate ? `${Math.round(student.attendance_rate)}%` : 'N/A'}
                </span>
              </div>
              <p className="text-sm text-green-700">Attendance Rate</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <GraduationCap className="w-5 h-5 text-purple-600" />
                <span className="text-2xl font-bold text-purple-900">{Math.round(averageGrade)}%</span>
              </div>
              <p className="text-sm text-purple-700">Average Grade</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-5 h-5 text-orange-600" />
                <span className="text-2xl font-bold text-orange-900">{behaviorLogs.length}</span>
              </div>
              <p className="text-sm text-orange-700">Behavior Logs</p>
            </div>
          </div>

          <div className="px-8 pb-8 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-teal-600" />
                  <span>Personality Profile</span>
                </h2>
                <button
                  onClick={() => setShowPersonalityModal(true)}
                  className="px-3 py-1 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors text-sm flex items-center space-x-1"
                >
                  {student.personality_traits ? (
                    <>
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </>
                  )}
                </button>
              </div>

              {student.personality_traits ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Learning Style</p>
                    <p className="font-medium text-gray-900 capitalize">{student.personality_traits.learning_style}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Work Pace</p>
                    <p className="font-medium text-gray-900 capitalize">{student.personality_traits.work_pace}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Participation</p>
                    <p className="font-medium text-gray-900 capitalize">{student.personality_traits.participation_level}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Collaboration</p>
                    <p className="font-medium text-gray-900 capitalize">{student.personality_traits.collaboration_preference}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Motivation</p>
                    <p className="font-medium text-gray-900 capitalize">{student.personality_traits.motivation_type}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Communication</p>
                    <p className="font-medium text-gray-900 capitalize">{student.personality_traits.communication_style}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">No personality profile yet</p>
                  <button
                    onClick={() => setShowPersonalityModal(true)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors inline-flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Profile</span>
                  </button>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Phone className="w-5 h-5 text-teal-600" />
                <span>Contact & Emergency Information</span>
              </h2>

              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent/Guardian Name
                    </label>
                    <input
                      type="text"
                      value={editData.parent_guardian_name}
                      onChange={(e) => setEditData({...editData, parent_guardian_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent/Guardian Email
                    </label>
                    <input
                      type="email"
                      value={editData.parent_guardian_email}
                      onChange={(e) => setEditData({...editData, parent_guardian_email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent/Guardian Phone
                    </label>
                    <input
                      type="tel"
                      value={editData.parent_guardian_phone}
                      onChange={(e) => setEditData({...editData, parent_guardian_phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emergency Contact
                    </label>
                    <input
                      type="text"
                      value={editData.emergency_contact}
                      onChange={(e) => setEditData({...editData, emergency_contact: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {student.parent_guardian_name && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Parent/Guardian</p>
                      <p className="font-medium text-gray-900">{student.parent_guardian_name}</p>
                    </div>
                  )}
                  {student.parent_guardian_email && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Email</p>
                      <p className="font-medium text-gray-900">{student.parent_guardian_email}</p>
                    </div>
                  )}
                  {student.parent_guardian_phone && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Phone</p>
                      <p className="font-medium text-gray-900">{student.parent_guardian_phone}</p>
                    </div>
                  )}
                  {student.emergency_contact && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Emergency Contact</p>
                      <p className="font-medium text-gray-900">{student.emergency_contact}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Heart className="w-5 h-5 text-teal-600" />
                <span>Student Information</span>
              </h2>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Strengths
                    </label>
                    <textarea
                      value={editData.strengths}
                      onChange={(e) => setEditData({...editData, strengths: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Areas for Improvement
                    </label>
                    <textarea
                      value={editData.areas_for_improvement}
                      onChange={(e) => setEditData({...editData, areas_for_improvement: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interests & Hobbies
                    </label>
                    <textarea
                      value={editData.interests}
                      onChange={(e) => setEditData({...editData, interests: e.target.value})}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medical Notes
                    </label>
                    <textarea
                      value={editData.medical_notes}
                      onChange={(e) => setEditData({...editData, medical_notes: e.target.value})}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preferred Seating
                    </label>
                    <input
                      type="text"
                      value={editData.preferred_seating}
                      onChange={(e) => setEditData({...editData, preferred_seating: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {student.strengths && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-green-900 mb-2">Strengths</p>
                      <p className="text-gray-700">{student.strengths}</p>
                    </div>
                  )}
                  {student.areas_for_improvement && (
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-yellow-900 mb-2">Areas for Improvement</p>
                      <p className="text-gray-700">{student.areas_for_improvement}</p>
                    </div>
                  )}
                  {student.interests && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-900 mb-2">Interests & Hobbies</p>
                      <p className="text-gray-700">{student.interests}</p>
                    </div>
                  )}
                  {student.medical_notes && (
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-red-900 mb-2">Medical Notes</p>
                      <p className="text-gray-700">{student.medical_notes}</p>
                    </div>
                  )}
                  {student.preferred_seating && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">Preferred Seating</p>
                      <p className="text-gray-700">{student.preferred_seating}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {student.accommodations && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-purple-600" />
                  <span>Accommodations</span>
                </h2>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{student.accommodations}</p>
                </div>
              </div>
            )}

            {isEditing && (
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <GraduationCap className="w-5 h-5 text-teal-600" />
              <span>Recent Grades</span>
            </h2>

            {grades.length > 0 ? (
              <div className="space-y-3">
                {grades.slice(0, 5).map((grade) => (
                  <div key={grade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{grade.subject || 'Assignment'}</p>
                      <p className="text-sm text-gray-600">{new Date(grade.graded_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{Math.round(grade.percentage)}%</p>
                      <p className="text-sm text-gray-600">
                        {grade.grade_value}/{grade.points_possible}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No grades recorded yet</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-teal-600" />
              <span>Recent Behavior</span>
            </h2>

            {behaviorLogs.length > 0 ? (
              <div className="space-y-3">
                {behaviorLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        log.severity === 'major' ? 'bg-red-100 text-red-800' :
                        log.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {log.severity}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(log.incident_date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 mb-1">{log.behavior_type}</p>
                    <p className="text-sm text-gray-600">{log.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-gray-600">No behavior logs recorded</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPersonalityModal && (
        <StudentPersonalityModal
          isOpen={showPersonalityModal}
          onClose={() => setShowPersonalityModal(false)}
          onSuccess={() => {
            loadStudentData();
            setShowPersonalityModal(false);
          }}
          studentId={studentId!}
          studentName={student.student_name}
          existingTraits={student.personality_traits}
        />
      )}
    </div>
  );
};

export default StudentProfilePage;
