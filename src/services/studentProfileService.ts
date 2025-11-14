import { supabase } from './authService';
import {
  EnhancedStudent,
  StudentPersonalityTraits,
  StudentBehaviorLog,
  LessonPlanRequest,
  CreatePersonalityTraitsData,
  CreateBehaviorLogData,
  CreateLessonPlanRequestData,
  UpdateStudentProfileData,
  ServiceResponse
} from '../types/studentProfile';

export const getEnhancedStudentProfile = async (
  studentId: string
): Promise<ServiceResponse<EnhancedStudent>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (studentError) throw new Error(studentError.message);
    if (!student) {
      return { success: false, error: 'Student not found' };
    }

    const { data: personality, error: personalityError } = await supabase
      .from('student_personality_traits')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    const { data: grades, error: gradesError } = await supabase
      .from('student_grades')
      .select('*')
      .eq('student_id', studentId)
      .order('graded_date', { ascending: false })
      .limit(10);

    const enhancedProfile: EnhancedStudent = {
      ...student,
      personality_traits: personality || undefined,
      recent_grades: grades || undefined
    };

    return { success: true, data: enhancedProfile };
  } catch (error: any) {
    console.error('Error fetching enhanced student profile:', error);
    return { success: false, error: error.message || 'Failed to fetch student profile' };
  }
};

export const updateStudentProfile = async (
  studentId: string,
  updates: UpdateStudentProfileData
): Promise<ServiceResponse<EnhancedStudent>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', studentId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { success: true, data: data as EnhancedStudent };
  } catch (error: any) {
    console.error('Error updating student profile:', error);
    return { success: false, error: error.message || 'Failed to update profile' };
  }
};

export const getStudentPersonalityTraits = async (
  studentId: string
): Promise<ServiceResponse<StudentPersonalityTraits>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data, error } = await supabase
      .from('student_personality_traits')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!data) {
      return { success: false, error: 'Personality traits not found' };
    }

    return { success: true, data: data as StudentPersonalityTraits };
  } catch (error: any) {
    console.error('Error fetching personality traits:', error);
    return { success: false, error: error.message || 'Failed to fetch personality traits' };
  }
};

export const createOrUpdatePersonalityTraits = async (
  traitsData: CreatePersonalityTraitsData
): Promise<ServiceResponse<StudentPersonalityTraits>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data, error } = await supabase
      .from('student_personality_traits')
      .upsert(traitsData, { onConflict: 'student_id' })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { success: true, data: data as StudentPersonalityTraits };
  } catch (error: any) {
    console.error('Error creating/updating personality traits:', error);
    return { success: false, error: error.message || 'Failed to save personality traits' };
  }
};

export const getStudentBehaviorLogs = async (
  studentId: string,
  limit?: number
): Promise<ServiceResponse<StudentBehaviorLog[]>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    let query = supabase
      .from('student_behavior_logs')
      .select('*')
      .eq('student_id', studentId)
      .order('incident_date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return { success: true, data: data as StudentBehaviorLog[] };
  } catch (error: any) {
    console.error('Error fetching behavior logs:', error);
    return { success: false, error: error.message || 'Failed to fetch behavior logs' };
  }
};

export const createBehaviorLog = async (
  logData: CreateBehaviorLogData
): Promise<ServiceResponse<StudentBehaviorLog>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data, error } = await supabase
      .from('student_behavior_logs')
      .insert(logData)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { success: true, data: data as StudentBehaviorLog };
  } catch (error: any) {
    console.error('Error creating behavior log:', error);
    return { success: false, error: error.message || 'Failed to create behavior log' };
  }
};

export const updateBehaviorLog = async (
  logId: string,
  updates: Partial<CreateBehaviorLogData>
): Promise<ServiceResponse<StudentBehaviorLog>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data, error } = await supabase
      .from('student_behavior_logs')
      .update(updates)
      .eq('id', logId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { success: true, data: data as StudentBehaviorLog };
  } catch (error: any) {
    console.error('Error updating behavior log:', error);
    return { success: false, error: error.message || 'Failed to update behavior log' };
  }
};

export const deleteBehaviorLog = async (
  logId: string
): Promise<ServiceResponse<void>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { error } = await supabase
      .from('student_behavior_logs')
      .delete()
      .eq('id', logId);

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting behavior log:', error);
    return { success: false, error: error.message || 'Failed to delete behavior log' };
  }
};

export const createLessonPlanRequest = async (
  requestData: CreateLessonPlanRequestData
): Promise<ServiceResponse<LessonPlanRequest>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data, error } = await supabase
      .from('lesson_plan_requests')
      .insert(requestData)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { success: true, data: data as LessonPlanRequest };
  } catch (error: any) {
    console.error('Error creating lesson plan request:', error);
    return { success: false, error: error.message || 'Failed to create lesson plan request' };
  }
};

export const getLessonPlanRequests = async (
  teacherId: string,
  limit?: number
): Promise<ServiceResponse<LessonPlanRequest[]>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    let query = supabase
      .from('lesson_plan_requests')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return { success: true, data: data as LessonPlanRequest[] };
  } catch (error: any) {
    console.error('Error fetching lesson plan requests:', error);
    return { success: false, error: error.message || 'Failed to fetch lesson plan requests' };
  }
};

export const updateLessonPlanRequest = async (
  requestId: string,
  updates: Partial<LessonPlanRequest>
): Promise<ServiceResponse<LessonPlanRequest>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data, error } = await supabase
      .from('lesson_plan_requests')
      .update(updates)
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { success: true, data: data as LessonPlanRequest };
  } catch (error: any) {
    console.error('Error updating lesson plan request:', error);
    return { success: false, error: error.message || 'Failed to update lesson plan request' };
  }
};

export const getClassBehaviorSummary = async (
  classId: string,
  startDate?: string,
  endDate?: string
): Promise<ServiceResponse<any>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    let query = supabase
      .from('student_behavior_logs')
      .select('*')
      .eq('class_id', classId);

    if (startDate) {
      query = query.gte('incident_date', startDate);
    }
    if (endDate) {
      query = query.lte('incident_date', endDate);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    const summary = {
      total_incidents: data.length,
      by_severity: {
        minor: data.filter(log => log.severity === 'minor').length,
        moderate: data.filter(log => log.severity === 'moderate').length,
        major: data.filter(log => log.severity === 'major').length
      },
      requiring_followup: data.filter(log => log.follow_up_needed && !log.follow_up_completed).length,
      parent_notifications: data.filter(log => log.parent_notified).length
    };

    return { success: true, data: summary };
  } catch (error: any) {
    console.error('Error fetching behavior summary:', error);
    return { success: false, error: error.message || 'Failed to fetch behavior summary' };
  }
};
