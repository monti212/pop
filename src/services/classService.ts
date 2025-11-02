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
