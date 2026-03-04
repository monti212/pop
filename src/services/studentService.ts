import { supabase } from './authService';
import {
  Student,
  StudentWithAttendance,
  CreateStudentData,
  UpdateStudentData,
  ServiceResponse
} from '../types/attendance';

export const getClassStudents = async (
  classId: string,
  includeInactive: boolean = false
): Promise<ServiceResponse<Student[]>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    let query = supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('student_name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('active_status', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: data as Student[]
    };
  } catch (error: any) {
    console.error('Error fetching students:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch students'
    };
  }
};

export const getStudentById = async (
  studentId: string
): Promise<ServiceResponse<Student>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return {
        success: false,
        error: 'Student not found'
      };
    }

    return {
      success: true,
      data: data as Student
    };
  } catch (error: any) {
    console.error('Error fetching student:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch student'
    };
  }
};

export const createStudent = async (
  classId: string,
  studentData: CreateStudentData
): Promise<ServiceResponse<Student>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const activeStudentsResult = await getClassStudents(classId, false);
    if (activeStudentsResult.success && activeStudentsResult.data) {
      if (activeStudentsResult.data.length >= 35) {
        return {
          success: false,
          error: 'This class has reached the maximum of 35 students. Please remove a student before adding a new one.'
        };
      }
    }

    const { data, error } = await supabase
      .from('students')
      .insert({
        class_id: classId,
        student_name: studentData.student_name,
        student_identifier: studentData.student_identifier || null,
        has_neurodivergence: studentData.has_neurodivergence || false,
        neurodivergence_type: studentData.neurodivergence_type || null,
        accommodations: studentData.accommodations || null,
        learning_notes: studentData.learning_notes || null
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('Maximum of 35 students')) {
        return {
          success: false,
          error: 'This class has reached the maximum of 35 students. Please remove a student before adding a new one.'
        };
      }
      throw new Error(error.message);
    }

    return {
      success: true,
      data: data as Student
    };
  } catch (error: any) {
    console.error('Error creating student:', error);
    return {
      success: false,
      error: error.message || 'Failed to create student'
    };
  }
};

export const updateStudent = async (
  studentId: string,
  updates: UpdateStudentData
): Promise<ServiceResponse<Student>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', studentId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: data as Student
    };
  } catch (error: any) {
    console.error('Error updating student:', error);
    return {
      success: false,
      error: error.message || 'Failed to update student'
    };
  }
};

export const deleteStudent = async (
  studentId: string
): Promise<ServiceResponse<void>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error deleting student:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete student'
    };
  }
};

export const bulkDeleteStudents = async (
  studentIds: string[]
): Promise<ServiceResponse<{ deleted: number; failed: number }>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    if (studentIds.length === 0) {
      return { success: false, error: 'No students selected' };
    }

    const { error } = await supabase
      .from('students')
      .delete()
      .in('id', studentIds);

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: { deleted: studentIds.length, failed: 0 }
    };
  } catch (error: any) {
    console.error('Error bulk deleting students:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete students'
    };
  }
};

export const deactivateStudent = async (
  studentId: string
): Promise<ServiceResponse<Student>> => {
  return updateStudent(studentId, { active_status: false });
};

export const reactivateStudent = async (
  studentId: string
): Promise<ServiceResponse<Student>> => {
  return updateStudent(studentId, { active_status: true });
};

export const getStudentWithAttendanceRate = async (
  studentId: string,
  startDate?: string,
  endDate?: string
): Promise<ServiceResponse<StudentWithAttendance>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const studentResult = await getStudentById(studentId);
    if (!studentResult.success || !studentResult.data) {
      return {
        success: false,
        error: studentResult.error || 'Student not found'
      };
    }

    const { data: rateData, error: rateError } = await supabase
      .rpc('calculate_student_attendance_rate', {
        p_student_id: studentId,
        p_start_date: startDate || null,
        p_end_date: endDate || null
      });

    if (rateError) {
      console.warn('Error calculating attendance rate:', rateError);
    }

    const studentWithRate: StudentWithAttendance = {
      ...studentResult.data,
      attendance_rate: rateData || 0
    };

    return {
      success: true,
      data: studentWithRate
    };
  } catch (error: any) {
    console.error('Error fetching student with attendance rate:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch student statistics'
    };
  }
};

export const getClassStudentsWithAttendanceRates = async (
  classId: string,
  startDate?: string,
  endDate?: string
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

    const studentsWithRates = await Promise.all(
      studentsResult.data.map(async (student) => {
        const { data: rateData } = await supabase
          .rpc('calculate_student_attendance_rate', {
            p_student_id: student.id,
            p_start_date: startDate || null,
            p_end_date: endDate || null
          });

        return {
          ...student,
          attendance_rate: rateData || 0
        };
      })
    );

    return {
      success: true,
      data: studentsWithRates
    };
  } catch (error: any) {
    console.error('Error fetching students with rates:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch student statistics'
    };
  }
};

export const bulkCreateStudents = async (
  classId: string,
  students: CreateStudentData[]
): Promise<ServiceResponse<Student[]>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const activeStudentsResult = await getClassStudents(classId, false);
    if (activeStudentsResult.success && activeStudentsResult.data) {
      const currentCount = activeStudentsResult.data.length;
      if (currentCount + students.length > 35) {
        return {
          success: false,
          error: `Cannot add ${students.length} students. This would exceed the maximum of 35 students per class (current: ${currentCount}).`
        };
      }
    }

    const studentsToInsert = students.map(student => ({
      class_id: classId,
      student_name: student.student_name,
      student_identifier: student.student_identifier || null,
      has_neurodivergence: student.has_neurodivergence || false,
      neurodivergence_type: student.neurodivergence_type || null,
      accommodations: student.accommodations || null,
      learning_notes: student.learning_notes || null
    }));

    const { data, error } = await supabase
      .from('students')
      .insert(studentsToInsert)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: data as Student[]
    };
  } catch (error: any) {
    console.error('Error bulk creating students:', error);
    return {
      success: false,
      error: error.message || 'Failed to create students'
    };
  }
};

export const getActiveStudentCount = async (
  classId: string
): Promise<ServiceResponse<number>> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable'
      };
    }

    const { count, error } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('active_status', true);

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: count || 0
    };
  } catch (error: any) {
    console.error('Error getting student count:', error);
    return {
      success: false,
      error: error.message || 'Failed to get student count'
    };
  }
};
