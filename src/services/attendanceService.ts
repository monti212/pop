import { supabase } from './authService';
import {
  AttendanceRecord,
  RecordAttendanceData,
  BulkAttendanceData,
  AttendanceStats,
  StudentWithAttendance,
  ClassMissingAttendance,
  ServiceResponse
} from '../types/attendance';
import { getClassStudents } from './studentService';

export const getAttendanceForDate = async (
  classId: string,
  date: string
): Promise<ServiceResponse<AttendanceRecord[]>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('class_id', classId)
      .eq('attendance_date', date);

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: data as AttendanceRecord[]
    };
  } catch (error: any) {
    console.error('Error fetching attendance:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch attendance records'
    };
  }
};

export const getStudentAttendanceHistory = async (
  studentId: string,
  startDate?: string,
  endDate?: string
): Promise<ServiceResponse<AttendanceRecord[]>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    let query = supabase
      .from('attendance_records')
      .select('*')
      .eq('student_id', studentId)
      .order('attendance_date', { ascending: false });

    if (startDate) {
      query = query.gte('attendance_date', startDate);
    }
    if (endDate) {
      query = query.lte('attendance_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: data as AttendanceRecord[]
    };
  } catch (error: any) {
    console.error('Error fetching student attendance history:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch attendance history'
    };
  }
};

export const getClassAttendanceHistory = async (
  classId: string,
  startDate?: string,
  endDate?: string
): Promise<ServiceResponse<AttendanceRecord[]>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    let query = supabase
      .from('attendance_records')
      .select('*')
      .eq('class_id', classId)
      .order('attendance_date', { ascending: false });

    if (startDate) {
      query = query.gte('attendance_date', startDate);
    }
    if (endDate) {
      query = query.lte('attendance_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: data as AttendanceRecord[]
    };
  } catch (error: any) {
    console.error('Error fetching class attendance history:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch attendance history'
    };
  }
};

export const recordAttendance = async (
  attendanceData: RecordAttendanceData
): Promise<ServiceResponse<AttendanceRecord>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(
        {
          student_id: attendanceData.student_id,
          class_id: attendanceData.class_id,
          attendance_date: attendanceData.attendance_date,
          is_present: attendanceData.is_present
        },
        {
          onConflict: 'student_id,attendance_date'
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: data as AttendanceRecord
    };
  } catch (error: any) {
    console.error('Error recording attendance:', error);
    return {
      success: false,
      error: error.message || 'Failed to record attendance'
    };
  }
};

export const bulkRecordAttendance = async (
  bulkData: BulkAttendanceData
): Promise<ServiceResponse<AttendanceRecord[]>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const recordsToInsert = bulkData.records.map(record => ({
      student_id: record.student_id,
      class_id: bulkData.class_id,
      attendance_date: bulkData.attendance_date,
      is_present: record.is_present
    }));

    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(recordsToInsert, {
        onConflict: 'student_id,attendance_date'
      })
      .select();

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: data as AttendanceRecord[]
    };
  } catch (error: any) {
    console.error('Error bulk recording attendance:', error);
    return {
      success: false,
      error: error.message || 'Failed to record attendance'
    };
  }
};

export const getStudentAttendanceStats = async (
  studentId: string,
  startDate?: string,
  endDate?: string
): Promise<ServiceResponse<AttendanceStats>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    let query = supabase
      .from('attendance_records')
      .select('is_present')
      .eq('student_id', studentId);

    if (startDate) {
      query = query.gte('attendance_date', startDate);
    }
    if (endDate) {
      query = query.lte('attendance_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const total_days = data.length;
    const present_days = data.filter(r => r.is_present).length;
    const absent_days = total_days - present_days;
    const attendance_rate = total_days > 0 ? (present_days / total_days) * 100 : 0;

    return {
      success: true,
      data: {
        total_days,
        present_days,
        absent_days,
        attendance_rate: Math.round(attendance_rate * 100) / 100
      }
    };
  } catch (error: any) {
    console.error('Error calculating attendance stats:', error);
    return {
      success: false,
      error: error.message || 'Failed to calculate statistics'
    };
  }
};

export const getClassAttendanceStats = async (
  classId: string,
  startDate?: string,
  endDate?: string
): Promise<ServiceResponse<AttendanceStats>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    let query = supabase
      .from('attendance_records')
      .select('is_present')
      .eq('class_id', classId);

    if (startDate) {
      query = query.gte('attendance_date', startDate);
    }
    if (endDate) {
      query = query.lte('attendance_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const total_days = data.length;
    const present_days = data.filter(r => r.is_present).length;
    const absent_days = total_days - present_days;
    const attendance_rate = total_days > 0 ? (present_days / total_days) * 100 : 0;

    return {
      success: true,
      data: {
        total_days,
        present_days,
        absent_days,
        attendance_rate: Math.round(attendance_rate * 100) / 100
      }
    };
  } catch (error: any) {
    console.error('Error calculating class attendance stats:', error);
    return {
      success: false,
      error: error.message || 'Failed to calculate statistics'
    };
  }
};

export const getAttendanceDatesForClass = async (
  classId: string,
  startDate?: string,
  endDate?: string
): Promise<ServiceResponse<string[]>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    let query = supabase
      .from('attendance_records')
      .select('attendance_date')
      .eq('class_id', classId)
      .order('attendance_date', { ascending: false });

    if (startDate) {
      query = query.gte('attendance_date', startDate);
    }
    if (endDate) {
      query = query.lte('attendance_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const uniqueDates = [...new Set(data.map(r => r.attendance_date))];

    return {
      success: true,
      data: uniqueDates
    };
  } catch (error: any) {
    console.error('Error fetching attendance dates:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch attendance dates'
    };
  }
};

export const getStudentsWithAttendanceForDate = async (
  classId: string,
  date: string
): Promise<ServiceResponse<StudentWithAttendance[]>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const studentsResult = await getClassStudents(classId, false);
    if (!studentsResult.success || !studentsResult.data) {
      return {
        success: false,
        error: studentsResult.error || 'Failed to fetch students'
      };
    }

    const attendanceResult = await getAttendanceForDate(classId, date);
    const attendanceMap = new Map<string, AttendanceRecord>();

    if (attendanceResult.success && attendanceResult.data) {
      attendanceResult.data.forEach(record => {
        attendanceMap.set(record.student_id, record);
      });
    }

    const studentsWithAttendance: StudentWithAttendance[] = studentsResult.data.map(student => ({
      ...student,
      attendance: attendanceMap.get(student.id)
    }));

    return {
      success: true,
      data: studentsWithAttendance
    };
  } catch (error: any) {
    console.error('Error fetching students with attendance:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch attendance data'
    };
  }
};

export const deleteAttendanceRecord = async (
  recordId: string
): Promise<ServiceResponse<void>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error deleting attendance record:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete attendance record'
    };
  }
};

export const getClassesMissingAttendance = async (
  date?: string
): Promise<ServiceResponse<ClassMissingAttendance[]>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const dateToCheck = date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .rpc('get_classes_missing_attendance', {
        p_date: dateToCheck
      });

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: data as ClassMissingAttendance[]
    };
  } catch (error: any) {
    console.error('Error fetching classes missing attendance:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch missing attendance data'
    };
  }
};

export const hasAttendanceForDate = async (
  classId: string,
  date: string
): Promise<ServiceResponse<boolean>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const { count, error } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('attendance_date', date);

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: (count || 0) > 0
    };
  } catch (error: any) {
    console.error('Error checking attendance:', error);
    return {
      success: false,
      error: error.message || 'Failed to check attendance'
    };
  }
};
