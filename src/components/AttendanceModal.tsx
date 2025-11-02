import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Calendar, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { recordAttendance } from '../services/attendanceService';
import { getClassStudents } from '../services/studentService';
import { format } from 'date-fns';

interface Student {
  id: string;
  student_name: string;
  student_id: string | null;
  neurodivergence_type: string | null;
}

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classId: string;
  className: string;
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface StudentAttendance {
  student_id: string;
  status: AttendanceStatus;
  notes: string;
}

const AttendanceModal: React.FC<AttendanceModalProps> = ({ isOpen, onClose, onSuccess, classId, className }) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, StudentAttendance>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStudents();
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
      setServerError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, classId]);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const result = await getClassStudents(classId);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load students');
      }

      const studentList = result.data.map(s => ({
        id: s.id,
        student_name: s.student_name,
        student_id: s.student_identifier,
        neurodivergence_type: s.neurodivergence_type
      }));
      setStudents(studentList);

      const initialAttendance: Record<string, StudentAttendance> = {};
      studentList.forEach(student => {
        initialAttendance[student.id] = {
          student_id: student.id,
          status: 'present',
          notes: ''
        };
      });
      setAttendance(initialAttendance);
    } catch (error: any) {
      console.error('Error loading students:', error);
      setServerError('Failed to load students. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes
      }
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, StudentAttendance> = {};
    students.forEach(student => {
      updated[student.id] = {
        student_id: student.id,
        status,
        notes: attendance[student.id]?.notes || ''
      };
    });
    setAttendance(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const records = Object.values(attendance).map(record => ({
        student_id: record.student_id,
        class_id: classId,
        attendance_date: selectedDate,
        status: record.status,
        notes: record.notes || null
      }));

      const results = await Promise.all(
        records.map(record => recordAttendance(record))
      );

      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        throw new Error(`Failed to record ${failed.length} attendance records`);
      }

      setSuccessMessage('Attendance recorded successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Error recording attendance:', error);
      setServerError(error.message || 'Failed to record attendance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4" />;
      case 'absent':
        return <XCircle className="w-4 h-4" />;
      case 'late':
        return <Clock className="w-4 h-4" />;
      case 'excused':
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'excused':
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getSummary = () => {
    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0
    };

    Object.values(attendance).forEach(record => {
      counts[record.status]++;
    });

    return counts;
  };

  const summary = getSummary();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Take Attendance</h2>
              <p className="text-sm text-gray-600 mt-1">{className}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Quick actions:</span>
              <button
                type="button"
                onClick={() => handleMarkAll('present')}
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                disabled={isSubmitting || isLoading}
              >
                All Present
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll('absent')}
                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                disabled={isSubmitting || isLoading}
              >
                All Absent
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4 mt-4 text-sm">
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">Present: {summary.present}</span>
            </div>
            <div className="flex items-center space-x-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-gray-600">Absent: {summary.absent}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-gray-600">Late: {summary.late}</span>
            </div>
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              <span className="text-gray-600">Excused: {summary.excused}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {serverError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{serverError}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No students in this class yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">
                          {student.student_name}
                        </h3>
                        {student.neurodivergence_type && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            {student.neurodivergence_type}
                          </span>
                        )}
                      </div>
                      {student.student_id && (
                        <p className="text-sm text-gray-500 mt-1">ID: {student.student_id}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatusChange(student.id, status)}
                          className={`flex items-center space-x-1 px-3 py-2 rounded-lg border-2 transition-all ${
                            attendance[student.id]?.status === status
                              ? getStatusColor(status)
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                          }`}
                          disabled={isSubmitting}
                        >
                          {getStatusIcon(status)}
                          <span className="text-xs font-medium capitalize">{status}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {(attendance[student.id]?.status === 'absent' ||
                    attendance[student.id]?.status === 'late' ||
                    attendance[student.id]?.status === 'excused') && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={attendance[student.id]?.notes || ''}
                        onChange={(e) => handleNotesChange(student.id, e.target.value)}
                        placeholder="Add a note (optional)..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        disabled={isSubmitting}
                        maxLength={200}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {students.length > 0 && (
            <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Attendance</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AttendanceModal;
