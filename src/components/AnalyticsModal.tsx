import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Users, Calendar, Download, AlertCircle } from 'lucide-react';
import { getStudentAttendanceHistory } from '../services/attendanceService';
import { getClassStudents } from '../services/studentService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  className: string;
}

interface StudentStats {
  student_id: string;
  student_name: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  excused_days: number;
  attendance_rate: number;
  neurodivergence_type: string | null;
}

const COLORS = {
  present: '#10b981',
  absent: '#ef4444',
  late: '#f59e0b',
  excused: '#3b82f6'
};

const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose, classId, className }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'trends'>('overview');
  const [dateRange, setDateRange] = useState(30);
  const [stats, setStats] = useState<StudentStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAnalytics();
    }
  }, [isOpen, classId, dateRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), dateRange), 'yyyy-MM-dd');

      const studentsResult = await getClassStudents(classId);
      if (!studentsResult.success || !studentsResult.data) {
        throw new Error(studentsResult.error || 'Failed to load students');
      }
      const students = studentsResult.data;

      const studentStats = await Promise.all(
        students.map(async (student) => {
          const attendanceResult = await getStudentAttendanceHistory(student.id, startDate, endDate);
          if (!attendanceResult.success || !attendanceResult.data) {
            return {
              student_id: student.id,
              student_name: student.student_name,
              total_days: 0,
              present_days: 0,
              absent_days: 0,
              late_days: 0,
              excused_days: 0,
              attendance_rate: 0,
              neurodivergence_type: student.neurodivergence_type
            };
          }
          const attendance = attendanceResult.data;

          const totals = {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0
          };

          attendance.forEach(record => {
            totals[record.status]++;
          });

          const totalDays = attendance.length;
          const presentDays = totals.present + totals.late;
          const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

          return {
            student_id: student.id,
            student_name: student.student_name,
            total_days: totalDays,
            present_days: totals.present,
            absent_days: totals.absent,
            late_days: totals.late,
            excused_days: totals.excused,
            attendance_rate: attendanceRate,
            neurodivergence_type: student.neurodivergence_type
          };
        })
      );

      setStats(studentStats);
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const getClassOverview = () => {
    const totalStudents = stats.length;
    if (totalStudents === 0) return null;

    const avgAttendanceRate = stats.reduce((sum, s) => sum + s.attendance_rate, 0) / totalStudents;
    const totalPresent = stats.reduce((sum, s) => sum + s.present_days, 0);
    const totalAbsent = stats.reduce((sum, s) => sum + s.absent_days, 0);
    const totalLate = stats.reduce((sum, s) => sum + s.late_days, 0);
    const totalExcused = stats.reduce((sum, s) => sum + s.excused_days, 0);

    return {
      totalStudents,
      avgAttendanceRate,
      totalPresent,
      totalAbsent,
      totalLate,
      totalExcused
    };
  };

  const getChartData = () => {
    return [
      { name: 'Present', value: stats.reduce((sum, s) => sum + s.present_days, 0), color: COLORS.present },
      { name: 'Absent', value: stats.reduce((sum, s) => sum + s.absent_days, 0), color: COLORS.absent },
      { name: 'Late', value: stats.reduce((sum, s) => sum + s.late_days, 0), color: COLORS.late },
      { name: 'Excused', value: stats.reduce((sum, s) => sum + s.excused_days, 0), color: COLORS.excused }
    ];
  };

  const getAtRiskStudents = () => {
    return stats.filter(s => s.attendance_rate < 85).sort((a, b) => a.attendance_rate - b.attendance_rate);
  };

  const getNeurodivergentComparison = () => {
    const neurodivergent = stats.filter(s => s.neurodivergence_type);
    const neurotypical = stats.filter(s => !s.neurodivergence_type);

    if (neurodivergent.length === 0 || neurotypical.length === 0) return null;

    const ndAvg = neurodivergent.reduce((sum, s) => sum + s.attendance_rate, 0) / neurodivergent.length;
    const ntAvg = neurotypical.reduce((sum, s) => sum + s.attendance_rate, 0) / neurotypical.length;

    return {
      neurodivergent: ndAvg,
      neurotypical: ntAvg,
      count_nd: neurodivergent.length,
      count_nt: neurotypical.length
    };
  };

  const overview = getClassOverview();
  const chartData = getChartData();
  const atRiskStudents = getAtRiskStudents();
  const ndComparison = getNeurodivergentComparison();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Attendance Analytics</h2>
              <p className="text-sm text-gray-600 mt-1">{className}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-teal-100 text-teal-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'students'
                    ? 'bg-teal-100 text-teal-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Students
              </button>
              <button
                onClick={() => setActiveTab('trends')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'trends'
                    ? 'bg-teal-100 text-teal-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Trends
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === 'overview' && overview && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <Users className="w-8 h-8 text-teal-600" />
                        <span className="text-2xl font-bold text-teal-900">{overview.totalStudents}</span>
                      </div>
                      <p className="text-sm text-teal-700 mt-2">Total Students</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <TrendingUp className="w-8 h-8 text-green-600" />
                        <span className="text-2xl font-bold text-green-900">{overview.avgAttendanceRate.toFixed(1)}%</span>
                      </div>
                      <p className="text-sm text-green-700 mt-2">Avg Attendance Rate</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <Calendar className="w-8 h-8 text-blue-600" />
                        <span className="text-2xl font-bold text-blue-900">{dateRange}</span>
                      </div>
                      <p className="text-sm text-blue-700 mt-2">Days Analyzed</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <AlertCircle className="w-8 h-8 text-purple-600" />
                        <span className="text-2xl font-bold text-purple-900">{atRiskStudents.length}</span>
                      </div>
                      <p className="text-sm text-purple-700 mt-2">At-Risk Students</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Distribution</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Days</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-sm text-gray-700">Present</span>
                          </div>
                          <span className="text-lg font-semibold text-gray-900">{overview.totalPresent}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="text-sm text-gray-700">Absent</span>
                          </div>
                          <span className="text-lg font-semibold text-gray-900">{overview.totalAbsent}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <span className="text-sm text-gray-700">Late</span>
                          </div>
                          <span className="text-lg font-semibold text-gray-900">{overview.totalLate}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-sm text-gray-700">Excused</span>
                          </div>
                          <span className="text-lg font-semibold text-gray-900">{overview.totalExcused}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {atRiskStudents.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-red-900 mb-4">Students Needing Support (Below 85%)</h3>
                      <div className="space-y-2">
                        {atRiskStudents.map((student) => (
                          <div key={student.student_id} className="flex items-center justify-between bg-white rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">{student.student_name}</span>
                              {student.neurodivergence_type && (
                                <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                                  {student.neurodivergence_type}
                                </span>
                              )}
                            </div>
                            <span className="text-red-600 font-semibold">{student.attendance_rate.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ndComparison && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-purple-900 mb-4">Neurodivergent vs Neurotypical Comparison</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-2">Neurodivergent Students ({ndComparison.count_nd})</p>
                          <p className="text-3xl font-bold text-purple-600">{ndComparison.neurodivergent.toFixed(1)}%</p>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-2">Neurotypical Students ({ndComparison.count_nt})</p>
                          <p className="text-3xl font-bold text-gray-600">{ndComparison.neurotypical.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'students' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Late</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Excused</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stats.map((student) => (
                          <tr key={student.student_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">{student.student_name}</span>
                                {student.neurodivergence_type && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                                    {student.neurodivergence_type}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-900">{student.present_days}</td>
                            <td className="px-4 py-3 text-center text-sm text-gray-900">{student.absent_days}</td>
                            <td className="px-4 py-3 text-center text-sm text-gray-900">{student.late_days}</td>
                            <td className="px-4 py-3 text-center text-sm text-gray-900">{student.excused_days}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                student.attendance_rate >= 95
                                  ? 'bg-green-100 text-green-800'
                                  : student.attendance_rate >= 85
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {student.attendance_rate.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'trends' && (
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Rates by Student</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={stats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="student_name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="attendance_rate" fill="#14b8a6" name="Attendance Rate (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsModal;
