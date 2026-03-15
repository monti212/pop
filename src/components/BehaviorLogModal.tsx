import React, { useState, useEffect } from 'react';
import { X, Save, Plus, AlertCircle, CheckCircle, Clock, User } from 'lucide-react';
import { Student } from '../types/attendance';
import { CreateBehaviorLogData, StudentBehaviorLog } from '../types/studentProfile';
import {
  createBehaviorLog,
  getStudentBehaviorLogs,
} from '../services/studentProfileService';
import { useAuth } from '../context/AuthContext';

interface BehaviorLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classId: string;
  className: string;
  students: Student[];
  preSelectedStudent?: Student;
}

type ViewMode = 'create' | 'history';

const BehaviorLogModal: React.FC<BehaviorLogModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  classId,
  className,
  students,
  preSelectedStudent
}) => {
  useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('create');
  const [formData, setFormData] = useState<CreateBehaviorLogData>({
    student_id: preSelectedStudent?.id || '',
    class_id: classId,
    incident_date: new Date().toISOString().split('T')[0],
    behavior_type: '',
    severity: 'minor',
    description: '',
    context: '',
    action_taken: '',
    follow_up_needed: false,
    parent_notified: false
  });
  const [behaviorLogs, setBehaviorLogs] = useState<StudentBehaviorLog[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>(preSelectedStudent?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (preSelectedStudent) {
      setFormData(prev => ({ ...prev, student_id: preSelectedStudent.id }));
      setSelectedStudent(preSelectedStudent.id);
    }
  }, [preSelectedStudent]);

  useEffect(() => {
    if (isOpen && viewMode === 'history' && selectedStudent) {
      loadBehaviorLogs(selectedStudent);
    }
  }, [isOpen, viewMode, selectedStudent]);

  const loadBehaviorLogs = async (studentId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getStudentBehaviorLogs(studentId);
      if (result.success && result.data) {
        setBehaviorLogs(result.data);
      } else {
        setError(result.error || 'Failed to load behavior logs');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load behavior logs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof CreateBehaviorLogData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.student_id) {
      setError('Please select a student');
      return;
    }

    if (!formData.behavior_type || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await createBehaviorLog(formData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create behavior log');
      }

      setSuccessMessage('Behavior log saved successfully!');

      setFormData({
        student_id: preSelectedStudent?.id || '',
        class_id: classId,
        incident_date: new Date().toISOString().split('T')[0],
        behavior_type: '',
        severity: 'minor',
        description: '',
        context: '',
        action_taken: '',
        follow_up_needed: false,
        parent_notified: false
      });

      setTimeout(() => {
        onSuccess();
        if (!preSelectedStudent) {
          onClose();
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save behavior log');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'major':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'minor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Behavior Tracking</h2>
              <p className="text-sm text-gray-600 mt-1">{className}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('create')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                viewMode === 'create'
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>New Log</span>
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                viewMode === 'history'
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>History</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          )}

          {viewMode === 'create' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student *
                  </label>
                  <select
                    value={formData.student_id}
                    onChange={(e) => handleChange('student_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                    disabled={!!preSelectedStudent}
                  >
                    <option value="">Select a student</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.student_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Incident Date *
                  </label>
                  <input
                    type="date"
                    value={formData.incident_date}
                    onChange={(e) => handleChange('incident_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Behavior Type *
                  </label>
                  <select
                    value={formData.behavior_type}
                    onChange={(e) => handleChange('behavior_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select type</option>
                    <option value="Positive - Excellent Participation">Positive - Excellent Participation</option>
                    <option value="Positive - Helping Others">Positive - Helping Others</option>
                    <option value="Positive - Outstanding Work">Positive - Outstanding Work</option>
                    <option value="Disruptive Behavior">Disruptive Behavior</option>
                    <option value="Off-Task Behavior">Off-Task Behavior</option>
                    <option value="Incomplete Work">Incomplete Work</option>
                    <option value="Disrespectful Behavior">Disrespectful Behavior</option>
                    <option value="Conflict with Peer">Conflict with Peer</option>
                    <option value="Late to Class">Late to Class</option>
                    <option value="Missing Materials">Missing Materials</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Severity *
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => handleChange('severity', e.target.value as 'minor' | 'moderate' | 'major')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  >
                    <option value="minor">Minor - Low impact</option>
                    <option value="moderate">Moderate - Needs attention</option>
                    <option value="major">Major - Serious concern</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  placeholder="Describe what happened..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Context
                </label>
                <textarea
                  value={formData.context || ''}
                  onChange={(e) => handleChange('context', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  placeholder="What was happening before/during the incident?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action Taken
                </label>
                <textarea
                  value={formData.action_taken || ''}
                  onChange={(e) => handleChange('action_taken', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  placeholder="How was this addressed?"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.follow_up_needed}
                    onChange={(e) => handleChange('follow_up_needed', e.target.checked)}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Follow-up Needed</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.parent_notified}
                    onChange={(e) => handleChange('parent_notified', e.target.checked)}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Parent Notified</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Log</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {viewMode === 'history' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Student
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">Select a student</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.student_name}
                    </option>
                  ))}
                </select>
              </div>

              {behaviorLogs.length > 0 ? (
                <div className="space-y-3">
                  {behaviorLogs.map(log => (
                    <div key={log.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(log.severity)}`}>
                          {log.severity.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-600">
                          {new Date(log.incident_date).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">{log.behavior_type}</h4>
                      <p className="text-sm text-gray-700 mb-2">{log.description}</p>
                      {log.action_taken && (
                        <p className="text-sm text-gray-600 italic">Action: {log.action_taken}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                        {log.follow_up_needed && (
                          <span className="flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Follow-up needed</span>
                          </span>
                        )}
                        {log.parent_notified && (
                          <span className="flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Parent notified</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    {selectedStudent ? 'No behavior logs found for this student' : 'Select a student to view their history'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BehaviorLogModal;
