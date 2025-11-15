import { supabase } from './authService';
import {
  Class,
  ClassWithStats,
  CreateClassData,
  UpdateClassData,
  ServiceResponse
} from '../types/attendance';

export const getTeacherClasses = async (
  teacherId: string,
  includeInactive: boolean = false
): Promise<ServiceResponse<Class[]>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    let query = supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      query = query.eq('active_status', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: data as Class[]
    };
  } catch (error: any) {
    console.error('Error fetching classes:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch classes'
    };
  }
};

export const getClassById = async (
  classId: string
): Promise<ServiceResponse<Class>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return {
        success: false,
        error: 'Class not found'
      };
    }

    return {
      success: true,
      data: data as Class
    };
  } catch (error: any) {
    console.error('Error fetching class:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch class'
    };
  }
};

export const createClass = async (
  teacherId: string,
  classData: CreateClassData
): Promise<ServiceResponse<Class>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const activeClassesResult = await getTeacherClasses(teacherId, false);
    if (activeClassesResult.success && activeClassesResult.data) {
      if (activeClassesResult.data.length >= 5) {
        return {
          success: false,
          error: 'You have reached the maximum of 5 classes. Please archive or delete a class before creating a new one.'
        };
      }
    }

    const { data, error } = await supabase
      .from('classes')
      .insert({
        teacher_id: teacherId,
        class_name: classData.class_name,
        subject: classData.subject || null,
        grade_level: classData.grade_level || null,
        class_section: classData.class_section || null,
        description: classData.description || null,
        meeting_days: classData.meeting_days || [],
        meeting_time: classData.meeting_time || null,
        room_location: classData.room_location || null
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('Maximum of 5 classes')) {
        return {
          success: false,
          error: 'You have reached the maximum of 5 classes. Please archive or delete a class before creating a new one.'
        };
      }
      throw new Error(error.message);
    }

    return {
      success: true,
      data: data as Class
    };
  } catch (error: any) {
    console.error('Error creating class:', error);
    return {
      success: false,
      error: error.message || 'Failed to create class'
    };
  }
};

export const updateClass = async (
  classId: string,
  updates: UpdateClassData
): Promise<ServiceResponse<Class>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const { data, error } = await supabase
      .from('classes')
      .update(updates)
      .eq('id', classId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: data as Class
    };
  } catch (error: any) {
    console.error('Error updating class:', error);
    return {
      success: false,
      error: error.message || 'Failed to update class'
    };
  }
};

export const deleteClass = async (
  classId: string
): Promise<ServiceResponse<void>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId);

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error deleting class:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete class'
    };
  }
};

export const archiveClass = async (
  classId: string
): Promise<ServiceResponse<Class>> => {
  return updateClass(classId, { active_status: false });
};

export const unarchiveClass = async (
  classId: string
): Promise<ServiceResponse<Class>> => {
  return updateClass(classId, { active_status: true });
};

export const getClassWithAttendanceRate = async (
  classId: string,
  startDate?: string,
  endDate?: string
): Promise<ServiceResponse<ClassWithStats>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const classResult = await getClassById(classId);
    if (!classResult.success || !classResult.data) {
      return {
        success: false,
        error: classResult.error || 'Class not found'
      };
    }

    const { data: rateData, error: rateError } = await supabase
      .rpc('calculate_class_attendance_rate', {
        p_class_id: classId,
        p_start_date: startDate || null,
        p_end_date: endDate || null
      });

    if (rateError) {
      console.warn('Error calculating attendance rate:', rateError);
    }

    let query = supabase
      .from('attendance_records')
      .select('attendance_date', { count: 'exact', head: true })
      .eq('class_id', classId);

    if (startDate) {
      query = query.gte('attendance_date', startDate);
    }
    if (endDate) {
      query = query.lte('attendance_date', endDate);
    }

    const { count } = await query;

    const classWithStats: ClassWithStats = {
      ...classResult.data,
      attendance_rate: rateData || 0,
      total_attendance_days: count || 0
    };

    return {
      success: true,
      data: classWithStats
    };
  } catch (error: any) {
    console.error('Error fetching class with stats:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch class statistics'
    };
  }
};

export const getActiveClassCount = async (
  teacherId: string
): Promise<ServiceResponse<number>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const { count, error } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', teacherId)
      .eq('active_status', true);

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: count || 0
    };
  } catch (error: any) {
    console.error('Error getting class count:', error);
    return {
      success: false,
      error: error.message || 'Failed to get class count'
    };
  }
};

export interface ClassroomOverview {
  class: Class;
  studentCount: number;
  attendanceRate: number;
  averageGrade: number;
  assignmentCount: number;
  behaviorLogCount: number;
  lastAttendanceDate: string | null;
  recentActivity: RecentActivity[];
}

export interface RecentActivity {
  id: string;
  type: 'attendance' | 'grade' | 'behavior' | 'document' | 'lesson_plan';
  description: string;
  timestamp: string;
  icon: string;
}

export const getClassroomOverview = async (
  classId: string
): Promise<ServiceResponse<ClassroomOverview>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    // Fetch all data in parallel for maximum performance
    const [
      classResult,
      assignmentCountResult,
      behaviorLogCountResult,
      avgGradeDataResult,
      attendanceDatesResult,
      rateDataResult,
      recentAttendanceResult,
      recentGradesResult,
      recentBehaviorResult
    ] = await Promise.all([
      getClassById(classId),
      supabase.from('assignments').select('*', { count: 'exact', head: true }).eq('class_id', classId),
      supabase.from('student_behavior_logs').select('*', { count: 'exact', head: true }).eq('class_id', classId),
      supabase.from('student_grades').select('percentage_grade').eq('class_id', classId),
      supabase.from('attendance_records').select('attendance_date').eq('class_id', classId).order('attendance_date', { ascending: false }).limit(1),
      supabase.rpc('calculate_class_attendance_rate', { p_class_id: classId, p_start_date: null, p_end_date: null }),
      supabase.from('attendance_records').select('attendance_date, recorded_at').eq('class_id', classId).order('recorded_at', { ascending: false }).limit(3),
      supabase.from('student_grades').select('created_at, assignments(assignment_name)').eq('class_id', classId).order('created_at', { ascending: false }).limit(2),
      supabase.from('student_behavior_logs').select('created_at, behavior_type').eq('class_id', classId).order('created_at', { ascending: false }).limit(2)
    ]);

    if (!classResult.success || !classResult.data) {
      return {
        success: false,
        error: classResult.error || 'Class not found'
      };
    }

    const classData = classResult.data;
    const { count: assignmentCount } = assignmentCountResult;
    const { count: behaviorLogCount } = behaviorLogCountResult;
    const { data: avgGradeData } = avgGradeDataResult;
    const { data: attendanceDates } = attendanceDatesResult;
    const { data: rateData } = rateDataResult;
    const { data: recentAttendance } = recentAttendanceResult;
    const { data: recentGrades } = recentGradesResult;
    const { data: recentBehavior } = recentBehaviorResult;

    const averageGrade = avgGradeData && avgGradeData.length > 0
      ? avgGradeData.reduce((sum, g) => sum + (g.percentage_grade || 0), 0) / avgGradeData.length
      : 0;

    const lastAttendanceDate = attendanceDates && attendanceDates.length > 0
      ? attendanceDates[0].attendance_date
      : null;

    const recentActivity: RecentActivity[] = [];

    if (recentAttendance) {
      const uniqueDates = [...new Set(recentAttendance.map(r => r.attendance_date))];
      uniqueDates.slice(0, 3).forEach(date => {
        const record = recentAttendance.find(r => r.attendance_date === date);
        if (record) {
          recentActivity.push({
            id: `attendance-${date}`,
            type: 'attendance',
            description: `Attendance taken for ${date}`,
            timestamp: record.recorded_at,
            icon: 'ClipboardCheck'
          });
        }
      });
    }

    if (recentGrades) {
      recentGrades.forEach(grade => {
        recentActivity.push({
          id: `grade-${grade.created_at}`,
          type: 'grade',
          description: `Grades entered for ${(grade.assignments as any)?.assignment_name || 'assignment'}`,
          timestamp: grade.created_at,
          icon: 'Award'
        });
      });
    }

    if (recentBehavior) {
      recentBehavior.forEach(behavior => {
        recentActivity.push({
          id: `behavior-${behavior.created_at}`,
          type: 'behavior',
          description: `Behavior log: ${behavior.behavior_type}`,
          timestamp: behavior.created_at,
          icon: 'Activity'
        });
      });
    }

    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      success: true,
      data: {
        class: classData,
        studentCount: classData.student_count,
        attendanceRate: rateData || 0,
        averageGrade: Math.round(averageGrade * 10) / 10,
        assignmentCount: assignmentCount || 0,
        behaviorLogCount: behaviorLogCount || 0,
        lastAttendanceDate,
        recentActivity: recentActivity.slice(0, 5)
      }
    };
  } catch (error: any) {
    console.error('Error fetching classroom overview:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch classroom overview'
    };
  }
};
