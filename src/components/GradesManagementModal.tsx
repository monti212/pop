import React, { useState, useEffect } from 'react';
import { X, Save, Plus, TrendingUp, Award, Calendar, Trash2 } from 'lucide-react';
import {
  Assignment,
  StudentGrade,
  CreateGradeData,
  GradeCategory
} from '../types/grades';
import { Student } from '../types/attendance';
import {
  getClassAssignments,
  getClassGradeCategories,
  createGrade,
  updateGrade,
  deleteGrade,
  bulkCreateGrades
} from '../services/gradeService';

interface GradesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classId: string;
  className: string;
  students: Student[];
}

type ViewMode = 'entry' | 'history' | 'distribution';

const GradesManagementModal: React.FC<GradesManagementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  classId,
  className,
  students
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('entry');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [gradeEntries, setGradeEntries] = useState<{ [studentId: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, classId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [assignmentsResult, categoriesResult] = await Promise.all([
        getClassAssignments(classId),
        getClassGradeCategories(classId)
      ]);

      if (assignmentsResult.success && assignmentsResult.data) {
        setAssignments(assignmentsResult.data);
        if (assignmentsResult.data.length > 0) {
          setSelectedAssignment(assignmentsResult.data[0]);
        }
      }

      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load grade data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGradeChange = (studentId: string, value: string) => {
    setGradeEntries(prev => ({ ...prev, [studentId]: value }));
  };

  const handleSaveGrades = async () => {
    if (!selectedAssignment) {
      setError('Please select an assignment');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const gradesToCreate: CreateGradeData[] = Object.entries(gradeEntries)
        .filter(([_, value]) => value && value.trim() !== '')
        .map(([studentId, value]) => ({
          student_id: studentId,
          assignment_id: selectedAssignment.id,
          class_id: classId,
          category_id: selectedAssignment.category_id || undefined,
          grade_value: parseFloat(value),
          points_possible: selectedAssignment.points_possible,
          graded_date: new Date().toISOString().split('T')[0]
        }));

      if (gradesToCreate.length === 0) {
        setError('Please enter at least one grade');
        return;
      }

      const result = await bulkCreateGrades(gradesToCreate);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save grades');
      }

      setSuccessMessage(`Successfully saved ${gradesToCreate.length} grades!`);
      setGradeEntries({});
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save grades');
    } finally {
      setIsLoading(false);
    }
  };

  const getLetterGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const calculatePercentage = (value: number, possible: number): number => {
    if (possible === 0) return 0;
    return (value / possible) * 100;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Grades Management</h2>
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
              onClick={() => setViewMode('entry')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'entry'
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Grade Entry
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'history'
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setViewMode('distribution')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'distribution'
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Distribution
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          )}

          {viewMode === 'entry' && (
            <div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Assignment
                </label>
                {assignments.length > 0 ? (
                  <select
                    value={selectedAssignment?.id || ''}
                    onChange={(e) => {
                      const assignment = assignments.find(a => a.id === e.target.value);
                      setSelectedAssignment(assignment || null);
                      setGradeEntries({});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    {assignments.map(assignment => (
                      <option key={assignment.id} value={assignment.id}>
                        {assignment.title} ({assignment.points_possible} points)
                        {assignment.due_date && ` - Due: ${new Date(assignment.due_date).toLocaleDateString()}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-gray-600">No assignments found. Create assignments first.</p>
                )}
              </div>

              {selectedAssignment && students.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-4 font-medium text-sm text-gray-700 border-b border-gray-200 pb-2">
                    <div className="col-span-5">Student Name</div>
                    <div className="col-span-3">Grade (out of {selectedAssignment.points_possible})</div>
                    <div className="col-span-2">Percentage</div>
                    <div className="col-span-2">Letter Grade</div>
                  </div>

                  {students.map(student => {
                    const gradeValue = gradeEntries[student.id] || '';
                    const numericValue = parseFloat(gradeValue) || 0;
                    const percentage = calculatePercentage(numericValue, selectedAssignment.points_possible);
                    const letterGrade = gradeValue ? getLetterGrade(percentage) : '-';

                    return (
                      <div key={student.id} className="grid grid-cols-12 gap-4 items-center py-2 border-b border-gray-100">
                        <div className="col-span-5">
                          <p className="font-medium text-gray-900">{student.student_name}</p>
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            min="0"
                            max={selectedAssignment.points_possible}
                            step="0.5"
                            value={gradeValue}
                            onChange={(e) => handleGradeChange(student.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                        <div className="col-span-2">
                          <span className={`font-medium ${
                            percentage >= 90 ? 'text-green-600' :
                            percentage >= 80 ? 'text-blue-600' :
                            percentage >= 70 ? 'text-yellow-600' :
                            percentage >= 60 ? 'text-orange-600' :
                            gradeValue ? 'text-red-600' : 'text-gray-400'
                          }`}>
                            {gradeValue ? `${Math.round(percentage)}%` : '-'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                            letterGrade === 'A' ? 'bg-green-100 text-green-800' :
                            letterGrade === 'B' ? 'bg-blue-100 text-blue-800' :
                            letterGrade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                            letterGrade === 'D' ? 'bg-orange-100 text-orange-800' :
                            letterGrade === 'F' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-400'
                          }`}>
                            {letterGrade}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {students.length === 0 && (
                <div className="text-center py-12">
                  <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No students in this class yet</p>
                </div>
              )}
            </div>
          )}

          {viewMode === 'history' && (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Grade history view coming soon</p>
            </div>
          )}

          {viewMode === 'distribution' && (
            <div className="text-center py-12">
              <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Grade distribution charts coming soon</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          {viewMode === 'entry' && (
            <button
              onClick={handleSaveGrades}
              disabled={isLoading || !selectedAssignment || Object.keys(gradeEntries).length === 0}
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
                  <span>Save Grades</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradesManagementModal;
