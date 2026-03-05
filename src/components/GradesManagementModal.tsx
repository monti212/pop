import React, { useState, useEffect } from 'react';
import { X, Save, Plus, TrendingUp, Award, Calendar, Trash2, ChevronDown, ChevronRight, Edit2, FileText, Download } from 'lucide-react';
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
  bulkCreateGrades,
  getClassGradesWithDetails
} from '../services/gradeService';
import {
  Assessment,
  getClassAssessments,
  deleteAssessment,
  downloadAssessmentDocument
} from '../services/assessmentService';
import AssessmentManagementModal from './AssessmentManagementModal';

interface GradesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classId: string;
  className: string;
  students: Student[];
}

type ViewMode = 'entry' | 'assessments' | 'history' | 'distribution';

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

  // Assessment management state
  const [assessmentsList, setAssessmentsList] = useState<Assessment[]>([]);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  // New assessment entry fields
  const [assessmentType, setAssessmentType] = useState<string>('quiz');
  const [assessmentTitle, setAssessmentTitle] = useState<string>('');
  const [totalPoints, setTotalPoints] = useState<string>('100');
  const [assessmentDate, setAssessmentDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // History view fields
  const [historicalGrades, setHistoricalGrades] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'year' | 'month' | 'custom'>('all');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [expandedAssessments, setExpandedAssessments] = useState<Set<string>>(new Set());

  // Assessment management state
  const [assessmentsList, setAssessmentsList] = useState<Assessment[]>([]);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [selectedAssessmentItem, setSelectedAssessmentItem] = useState<Assessment | null>(null);

  // Distribution view fields
  const [distributionGrades, setDistributionGrades] = useState<any[]>([]);
  const [distributionFilter, setDistributionFilter] = useState<'week' | 'month' | 'year' | 'term' | 'all'>('month');
  const [distributionYear, setDistributionYear] = useState<string>(new Date().getFullYear().toString());
  const [distributionMonth, setDistributionMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [distributionTerm, setDistributionTerm] = useState<string>('1');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, classId]);

  useEffect(() => {
    if (isOpen && viewMode === 'history') {
      loadHistoricalGrades();
    }
  }, [isOpen, viewMode, filterType, selectedYear, selectedMonth, startDate, endDate]);

  useEffect(() => {
    if (isOpen && viewMode === 'distribution') {
      loadDistributionData();
    }
  }, [isOpen, viewMode, distributionFilter, distributionYear, distributionMonth, distributionTerm]);

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

  const loadAssessments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getClassAssessments(classId);

      if (result.success && result.data) {
        setAssessmentsList(result.data);
      } else {
        setError(result.error || 'Failed to load assessments');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load assessments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAssessment = () => {
    setSelectedAssessment(null);
    setShowAssessmentModal(true);
  };

  const handleEditAssessment = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setShowAssessmentModal(true);
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await deleteAssessment(assessmentId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete assessment');
      }

      setSuccessMessage('Assessment deleted successfully!');
      loadAssessments();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete assessment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAssessmentDocument = async (assessment: Assessment) => {
    if (!assessment.document_url || !assessment.document_name) return;

    try {
      const blob = await downloadAssessmentDocument(assessment.document_url);
      if (!blob) throw new Error('Failed to download document');

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = assessment.document_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to download document');
    }
  };

  const handleAssessmentModalSuccess = () => {
    loadAssessments();
    setShowAssessmentModal(false);
  };

  const loadHistoricalGrades = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let start: string | undefined;
      let end: string | undefined;

      if (filterType === 'year') {
        start = `${selectedYear}-01-01`;
        end = `${selectedYear}-12-31`;
      } else if (filterType === 'month') {
        const year = parseInt(selectedYear);
        const month = parseInt(selectedMonth);
        const lastDay = new Date(year, month, 0).getDate();
        start = `${selectedYear}-${selectedMonth}-01`;
        end = `${selectedYear}-${selectedMonth}-${lastDay.toString().padStart(2, '0')}`;
      } else if (filterType === 'custom') {
        start = startDate;
        end = endDate;
      }

      const result = await getClassGradesWithDetails(classId, start, end);

      if (result.success && result.data) {
        setHistoricalGrades(result.data);
      } else {
        setError(result.error || 'Failed to load historical grades');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load historical grades');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGradeChange = (studentId: string, value: string) => {
    setGradeEntries(prev => ({ ...prev, [studentId]: value }));
  };

  const handleSaveGrades = async () => {
    // Validation
    if (!assessmentTitle.trim()) {
      setError('Please enter an assessment title');
      return;
    }

    const pointsValue = parseFloat(totalPoints);
    if (isNaN(pointsValue) || pointsValue <= 0) {
      setError('Please enter a valid total points value');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // First, create the assignment
      const { createAssignment } = await import('../services/gradeService');

      const assignmentResult = await createAssignment({
        class_id: classId,
        title: assessmentTitle,
        description: `${assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)} assessment`,
        assignment_type: assessmentType,
        points_possible: pointsValue,
        due_date: assessmentDate
      });

      if (!assignmentResult.success || !assignmentResult.data) {
        throw new Error(assignmentResult.error || 'Failed to create assessment');
      }

      const assignmentId = assignmentResult.data.id;

      // Create grades for students who have entries
      const gradesToCreate: CreateGradeData[] = Object.entries(gradeEntries)
        .filter(([_, value]) => value && value.trim() !== '')
        .map(([studentId, value]) => {
          const gradeValue = parseFloat(value);
          const pct = calculatePercentage(gradeValue, pointsValue);
          return {
            student_id: studentId,
            assignment_id: assignmentId,
            class_id: classId,
            grade_value: gradeValue,
            points_possible: pointsValue,
            letter_grade: `Grade ${getLetterGrade(pct)}`,
            graded_date: assessmentDate
          };
        });

      if (gradesToCreate.length === 0) {
        setError('Please enter at least one grade');
        return;
      }

      const result = await bulkCreateGrades(gradesToCreate);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save grades');
      }

      setSuccessMessage(`Successfully saved ${gradesToCreate.length} grades for ${assessmentTitle}!`);

      // Reset form
      setGradeEntries({});
      setAssessmentTitle('');
      setTotalPoints('100');
      setAssessmentType('quiz');
      setAssessmentDate(new Date().toISOString().split('T')[0]);

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

  const toggleAssessment = (assessmentId: string) => {
    setExpandedAssessments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assessmentId)) {
        newSet.delete(assessmentId);
      } else {
        newSet.add(assessmentId);
      }
      return newSet;
    });
  };

  const groupGradesByAssessment = () => {
    const grouped: { [key: string]: any } = {};

    historicalGrades.forEach(grade => {
      const assignment = grade.assignment;
      if (!assignment) return;

      const key = assignment.id;
      if (!grouped[key]) {
        grouped[key] = {
          assignment: assignment,
          grades: []
        };
      }
      grouped[key].grades.push(grade);
    });

    return Object.values(grouped).sort((a, b) => {
      const dateA = a.assignment.due_date || a.grades[0]?.graded_date || '';
      const dateB = b.assignment.due_date || b.grades[0]?.graded_date || '';
      return dateB.localeCompare(dateA);
    });
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i.toString());
    }
    return years;
  };

  const getMonthOptions = () => [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const loadDistributionData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let start: string | undefined;
      let end: string | undefined;
      const now = new Date();

      if (distributionFilter === 'week') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        start = weekStart.toISOString().split('T')[0];
        end = weekEnd.toISOString().split('T')[0];
      } else if (distributionFilter === 'month') {
        const year = parseInt(distributionYear);
        const month = parseInt(distributionMonth);
        const lastDay = new Date(year, month, 0).getDate();
        start = `${distributionYear}-${distributionMonth}-01`;
        end = `${distributionYear}-${distributionMonth}-${lastDay.toString().padStart(2, '0')}`;
      } else if (distributionFilter === 'year') {
        start = `${distributionYear}-01-01`;
        end = `${distributionYear}-12-31`;
      } else if (distributionFilter === 'term') {
        const year = parseInt(distributionYear);
        if (distributionTerm === '1') {
          start = `${year}-01-01`;
          end = `${year}-05-31`;
        } else if (distributionTerm === '2') {
          start = `${year}-06-01`;
          end = `${year}-08-31`;
        } else {
          start = `${year}-09-01`;
          end = `${year}-12-31`;
        }
      }

      const result = await getClassGradesWithDetails(classId, start, end);

      if (result.success && result.data) {
        setDistributionGrades(result.data);
      } else {
        setError(result.error || 'Failed to load distribution data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load distribution data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDistributionStats = () => {
    if (distributionGrades.length === 0) {
      return {
        total: 0,
        average: 0,
        gradeCounts: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 },
        assessmentTypes: {} as { [key: string]: number },
        topPerformers: [] as { student: string; average: number }[],
        needsHelp: [] as { student: string; average: number }[]
      };
    }

    const gradeCounts: { [key: string]: number } = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 };
    const assessmentTypes: { [key: string]: number } = {};
    const studentGrades: { [key: string]: { name: string; grades: number[] } } = {};

    let totalPercentage = 0;

    distributionGrades.forEach(grade => {
      const percentage = calculatePercentage(grade.grade_value || 0, grade.points_possible || 100);
      const letter = getLetterGrade(percentage);
      letterCounts[letter as keyof typeof letterCounts]++;
      totalPercentage += percentage;

      // Track by assessment type
      const type = entry.assignment?.assignment_type || 'other';
      assessmentTypes[type] = (assessmentTypes[type] || 0) + 1;

      // Track by student
      const studentId = entry.student?.id;
      const studentName = entry.student?.student_name || 'Unknown';
      if (studentId) {
        if (!studentGrades[studentId]) {
          studentGrades[studentId] = { name: studentName, grades: [] };
        }
        studentGrades[studentId].grades.push(percentage);
      }
    });

    const average = totalPercentage / distributionGrades.length;

    // Calculate student averages
    const studentAverages = Object.entries(studentGrades).map(([id, data]) => ({
      student: data.name,
      average: data.grades.reduce((sum, g) => sum + g, 0) / data.grades.length
    }));

    const topPerformers = studentAverages
      .sort((a, b) => b.average - a.average)
      .slice(0, 5);

    const needsHelp = studentAverages
      .filter(s => s.average < 40)
      .sort((a, b) => a.average - b.average)
      .slice(0, 5);

    return {
      total: distributionGrades.length,
      average,
      gradeCounts,
      assessmentTypes,
      topPerformers,
      needsHelp
    };
  };

  const getWeekLabel = () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
  };

  const getTermLabel = () => {
    const labels: { [key: string]: string } = {
      '1': 'Spring (Jan-May)',
      '2': 'Summer (Jun-Aug)',
      '3': 'Fall (Sep-Dec)'
    };
    return labels[distributionTerm] || 'Term 1';
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
              onClick={() => setViewMode('assessments')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'assessments'
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Assessments
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
              {/* Assessment Details Form */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Assessment Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assessment Type *
                    </label>
                    <select
                      value={assessmentType}
                      onChange={(e) => setAssessmentType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="quiz">Quiz</option>
                      <option value="test">Test</option>
                      <option value="exam">Exam</option>
                      <option value="assignment">Assignment</option>
                      <option value="homework">Homework</option>
                      <option value="classwork">Class Exercise</option>
                      <option value="project">Project</option>
                      <option value="participation">Participation</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title/Name *
                    </label>
                    <input
                      type="text"
                      value={assessmentTitle}
                      onChange={(e) => setAssessmentTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="e.g., Chapter 5 Quiz, Midterm Exam"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Points *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={totalPoints}
                      onChange={(e) => setTotalPoints(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={assessmentDate}
                      onChange={(e) => setAssessmentDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Grade Entry Table */}
              {students.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Enter Student Grades</h3>

                  <div className="grid grid-cols-12 gap-4 font-medium text-sm text-gray-700 border-b border-gray-200 pb-2">
                    <div className="col-span-5">Student Name</div>
                    <div className="col-span-3">Score (out of {totalPoints || '—'})</div>
                    <div className="col-span-2">Percentage</div>
                    <div className="col-span-2">Grade</div>
                  </div>

                  {students.map(student => {
                    const gradeValue = gradeEntries[student.id] || '';
                    const numericValue = parseFloat(gradeValue) || 0;
                    const pointsValue = parseFloat(totalPoints) || 100;
                    const percentage = calculatePercentage(numericValue, pointsValue);
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
                            max={pointsValue}
                            step="0.5"
                            value={gradeValue}
                            onChange={(e) => handleGradeChange(student.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                        <div className="col-span-2">
                          <span className={`font-medium ${gradeValue ? getPercentageColor(percentage) : 'text-gray-400'}`}>
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

          {viewMode === 'assessments' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Manage Assessments</h3>
                  <p className="text-sm text-gray-600">Create, edit, and manage assessments for this class with document uploads</p>
                </div>
                <button
                  onClick={handleCreateAssessment}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2 font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Assessment</span>
                </button>
              </div>

              {/* Assessment Statistics */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-green-700">Active</span>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {assessmentsList.filter(a => a.status === 'active').length}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-blue-700">Upcoming</span>
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {assessmentsList.filter(a => a.status === 'upcoming').length}
                  </p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-red-700">Due</span>
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  </div>
                  <p className="text-2xl font-bold text-red-900">
                    {assessmentsList.filter(a => a.status === 'due').length}
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Completed</span>
                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {assessmentsList.filter(a => a.status === 'completed').length}
                  </p>
                </div>
              </div>

              {/* Assessments List */}
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-600">Loading assessments...</p>
                </div>
              ) : assessmentsList.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No Assessments Yet</h4>
                  <p className="text-gray-600 mb-6">Create your first assessment to start tracking student progress</p>
                  <button
                    onClick={handleCreateAssessment}
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2 mx-auto font-medium shadow-sm"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Create First Assessment</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {assessmentsList.map(assessment => {
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'active': return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100' };
                        case 'upcoming': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100' };
                        case 'due': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100' };
                        case 'completed': return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100' };
                        default: return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100' };
                      }
                    };

                    const colors = getStatusColor(assessment.status);

                    return (
                      <div key={assessment.id} className={`${colors.bg} border ${colors.border} rounded-lg p-4 hover:shadow-md transition-all`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-semibold text-gray-900">{assessment.title}</h4>
                              <span className={`px-3 py-1 text-xs font-medium rounded-full ${colors.badge} ${colors.text}`}>
                                {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                              </span>
                              {assessment.document_name && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-teal-100 text-teal-700">
                                  <FileText className="w-3 h-3 mr-1" />
                                  Document attached
                                </span>
                              )}
                            </div>
                            {assessment.description && (
                              <p className="text-sm text-gray-600 mb-2">{assessment.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              {assessment.due_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>Due: {new Date(assessment.due_date).toLocaleDateString()}</span>
                                </div>
                              )}
                              {assessment.document_name && (
                                <button
                                  onClick={() => handleDownloadAssessmentDocument(assessment)}
                                  className="flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>{assessment.document_name}</span>
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => handleEditAssessment(assessment)}
                              className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                              title="Edit assessment"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAssessment(assessment.id)}
                              disabled={isLoading}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete assessment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {viewMode === 'history' && (
            <div>
              {/* Filter Controls */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Filter Grades</h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter By
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="all">All Time</option>
                      <option value="year">Year</option>
                      <option value="month">Month</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  {filterType === 'year' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Year
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        {getYearOptions().map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {filterType === 'month' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Year
                        </label>
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                          {getYearOptions().map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Month
                        </label>
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                          {getMonthOptions().map(month => (
                            <option key={month.value} value={month.value}>{month.label}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {filterType === 'custom' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Grades List */}
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-600">Loading grades...</p>
                </div>
              ) : historicalGrades.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No grades found for the selected period</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupGradesByAssessment().map((group, index) => {
                    const assignment = group.assignment;
                    const grades = group.grades;
                    const isExpanded = expandedAssessments.has(assignment.id);
                    const averageGrade = grades.reduce((sum: number, g: any) => sum + (g.grade_value || 0), 0) / grades.length;
                    const averagePercentage = grades.reduce((sum: number, g: any) => sum + calculatePercentage(g.grade_value || 0, g.points_possible || 100), 0) / grades.length;

                    return (
                      <div key={assignment.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleAssessment(assignment.id)}
                          className="w-full px-4 py-3 bg-white hover:bg-gray-50 flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-500" />
                            )}
                            <div className="text-left">
                              <h4 className="font-semibold text-gray-900">{assignment.title}</h4>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                                <span className="capitalize">{assignment.assignment_type}</span>
                                <span>•</span>
                                <span>{assignment.points_possible} points</span>
                                {assignment.due_date && (
                                  <>
                                    <span>•</span>
                                    <span>{new Date(assignment.due_date).toLocaleDateString()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">{grades.length} students</div>
                            <div className="text-sm font-medium text-gray-900">
                              Avg: {Math.round(averagePercentage)}%
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="bg-gray-50 border-t border-gray-200 p-4">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                                    <th className="pb-2 pr-4">Student</th>
                                    <th className="pb-2 pr-4">Score</th>
                                    <th className="pb-2 pr-4">Percentage</th>
                                    <th className="pb-2 pr-4">Grade</th>
                                    <th className="pb-2">Date</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {grades.map((grade: any) => {
                                    const percentage = calculatePercentage(grade.grade_value || 0, grade.points_possible || 100);
                                    const letterGrade = getLetterGrade(percentage);

                                    return (
                                      <tr key={grade.id} className="text-sm border-b border-gray-100 last:border-0">
                                        <td className="py-2 pr-4 font-medium text-gray-900">
                                          {grade.student?.student_name || 'Unknown'}
                                        </td>
                                        <td className="py-2 pr-4 text-gray-700">
                                          {grade.grade_value} / {grade.points_possible}
                                        </td>
                                        <td className="py-2 pr-4">
                                          <span className={`font-medium ${getPercentageColor(percentage)}`}>
                                            {Math.round(percentage)}%
                                          </span>
                                        </td>
                                        <td className="py-2 pr-4">
                                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                            letterGrade === 'A' ? 'bg-green-100 text-green-800' :
                                            letterGrade === 'B' ? 'bg-blue-100 text-blue-800' :
                                            letterGrade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                            letterGrade === 'D' ? 'bg-orange-100 text-orange-800' :
                                            'bg-red-100 text-red-800'
                                          }`}>
                                            {letterGrade}
                                          </span>
                                        </td>
                                        <td className="py-2 text-gray-600">
                                          {new Date(grade.graded_date).toLocaleDateString()}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {viewMode === 'distribution' && (
            <div>
              {/* Filter Controls */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Analytics Period</h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      View By
                    </label>
                    <select
                      value={distributionFilter}
                      onChange={(e) => setDistributionFilter(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="week">This Week</option>
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                      <option value="term">Term</option>
                      <option value="all">All Time</option>
                    </select>
                  </div>

                  {distributionFilter === 'month' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Year
                        </label>
                        <select
                          value={distributionYear}
                          onChange={(e) => setDistributionYear(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                          {getYearOptions().map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Month
                        </label>
                        <select
                          value={distributionMonth}
                          onChange={(e) => setDistributionMonth(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                          {getMonthOptions().map(month => (
                            <option key={month.value} value={month.value}>{month.label}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {distributionFilter === 'year' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Year
                      </label>
                      <select
                        value={distributionYear}
                        onChange={(e) => setDistributionYear(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        {getYearOptions().map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {distributionFilter === 'term' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Year
                        </label>
                        <select
                          value={distributionYear}
                          onChange={(e) => setDistributionYear(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                          {getYearOptions().map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Term
                        </label>
                        <select
                          value={distributionTerm}
                          onChange={(e) => setDistributionTerm(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                          <option value="1">Spring (Jan-May)</option>
                          <option value="2">Summer (Jun-Aug)</option>
                          <option value="3">Fall (Sep-Dec)</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Analytics Content */}
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-600">Loading analytics...</p>
                </div>
              ) : (() => {
                const stats = calculateDistributionStats();

                if (stats.total === 0) {
                  return (
                    <div className="text-center py-12">
                      <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No grades found for the selected period</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-600 font-medium">Total Grades</p>
                            <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
                          </div>
                          <Award className="w-8 h-8 text-blue-400" />
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-green-600 font-medium">Class Average</p>
                            <p className="text-2xl font-bold text-green-900 mt-1">{Math.round(stats.average)}%</p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-green-400" />
                        </div>
                      </div>

                      <div className="bg-yellow-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-yellow-600 font-medium">Passing Rate</p>
                            <p className="text-2xl font-bold text-yellow-900 mt-1">
                              {Math.round(((stats.letterCounts.A + stats.letterCounts.B + stats.letterCounts.C + stats.letterCounts.D) / stats.total) * 100)}%
                            </p>
                            <p className="text-xs text-yellow-600 mt-0.5">Grade 1–7</p>
                          </div>
                          <Award className="w-8 h-8 text-yellow-400" />
                        </div>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-purple-600 font-medium">Excellence Rate</p>
                            <p className="text-2xl font-bold text-purple-900 mt-1">
                              {Math.round(((stats.letterCounts.A + stats.letterCounts.B) / stats.total) * 100)}%
                            </p>
                            <p className="text-xs text-purple-600 mt-0.5">Grade 1–3</p>
                          </div>
                          <Award className="w-8 h-8 text-purple-400" />
                        </div>
                      </div>
                    </div>

                    {/* Grade Distribution Chart */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
                      <div className="space-y-3">
                        {Object.entries(stats.letterCounts).map(([letter, count]) => {
                          const percentage = (count / stats.total) * 100;
                          const colors = {
                            A: 'bg-green-500',
                            B: 'bg-blue-500',
                            C: 'bg-yellow-500',
                            D: 'bg-orange-500',
                            F: 'bg-red-500'
                          };
                          const bgColors = {
                            A: 'bg-green-100',
                            B: 'bg-blue-100',
                            C: 'bg-yellow-100',
                            D: 'bg-orange-100',
                            F: 'bg-red-100'
                          };

                          return (
                            <div key={letter} className="flex items-center space-x-4">
                              <div className="w-8 text-center">
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${bgColors[letter as keyof typeof bgColors]} ${letter === 'A' ? 'text-green-800' : letter === 'B' ? 'text-blue-800' : letter === 'C' ? 'text-yellow-800' : letter === 'D' ? 'text-orange-800' : 'text-red-800'}`}>
                                  {letter}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-700">
                                    {letter} Grade
                                  </span>
                                  <span className="text-sm text-gray-600">
                                    {count} ({Math.round(pct)}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                  <div
                                    className={`h-3 rounded-full ${colors[letter as keyof typeof colors]}`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Top Performers */}
                      {stats.topPerformers.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Award className="w-5 h-5 text-yellow-500 mr-2" />
                            Top Performers
                          </h3>
                          <div className="space-y-2">
                            {stats.topPerformers.map((student, index) => (
                              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <div className="flex items-center space-x-3">
                                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">
                                    {index + 1}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900">{student.student}</span>
                                </div>
                                <span className="text-sm font-semibold text-green-600">
                                  {Math.round(student.average)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Students Needing Support */}
                      {stats.needsHelp.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <TrendingUp className="w-5 h-5 text-orange-500 mr-2" />
                            Needs Support
                          </h3>
                          <div className="space-y-2">
                            {stats.needsHelp.map((student, index) => (
                              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <span className="text-sm font-medium text-gray-900">{student.student}</span>
                                <span className="text-sm font-semibold text-orange-600">
                                  {Math.round(student.average)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Assessment Types Breakdown */}
                    {Object.keys(stats.assessmentTypes).length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Types</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(stats.assessmentTypes).map(([type, count]) => (
                            <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                              <p className="text-2xl font-bold text-gray-900">{count}</p>
                              <p className="text-sm text-gray-600 capitalize mt-1">{type}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
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
              disabled={isLoading || !assessmentTitle.trim() || Object.keys(gradeEntries).length === 0}
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
