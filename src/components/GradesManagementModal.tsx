import React, { useState, useEffect } from 'react';
import { X, Save, Plus, TrendingUp, Award, Calendar, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
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
        .map(([studentId, value]) => ({
          student_id: studentId,
          assignment_id: assignmentId,
          class_id: classId,
          grade_value: parseFloat(value),
          points_possible: pointsValue,
          graded_date: assessmentDate
        }));

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
                    <div className="col-span-3">Grade (out of {totalPoints || '—'})</div>
                    <div className="col-span-2">Percentage</div>
                    <div className="col-span-2">Letter Grade</div>
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
                                    <th className="pb-2 pr-4">Letter</th>
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
                                          <span className={`font-medium ${
                                            percentage >= 90 ? 'text-green-600' :
                                            percentage >= 80 ? 'text-blue-600' :
                                            percentage >= 70 ? 'text-yellow-600' :
                                            percentage >= 60 ? 'text-orange-600' :
                                            'text-red-600'
                                          }`}>
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
