import { supabase } from './authService';
import {
  GradeCategory,
  Assignment,
  StudentGrade,
  GradeDistribution,
  CreateGradeCategoryData,
  CreateAssignmentData,
  CreateGradeData,
  ServiceResponse
} from '../types/grades';

export const getClassGradeCategories = async (
  classId: string
): Promise<ServiceResponse<GradeCategory[]>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data, error } = await supabase
      .from('grade_categories')
      .select('*')
      .eq('class_id', classId)
      .eq('active_status', true)
      .order('category_name', { ascending: true });

    if (error) throw new Error(error.message);

    return { success: true, data: data as GradeCategory[] };
  } catch (error: any) {
    console.error('Error fetching grade categories:', error);
    return { success: false, error: error.message || 'Failed to fetch grade categories' };
  }
};

export const createGradeCategory = async (
  categoryData: CreateGradeCategoryData
): Promise<ServiceResponse<GradeCategory>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data, error } = await supabase
      .from('grade_categories')
      .insert(categoryData)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { success: true, data: data as GradeCategory };
  } catch (error: any) {
    console.error('Error creating grade category:', error);
    return { success: false, error: error.message || 'Failed to create grade category' };
  }
};

export const getClassAssignments = async (
  classId: string
): Promise<ServiceResponse<Assignment[]>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('class_id', classId)
      .order('due_date', { ascending: false, nullsFirst: false });

    if (error) throw new Error(error.message);

    return { success: true, data: data as Assignment[] };
  } catch (error: any) {
    console.error('Error fetching assignments:', error);
    return { success: false, error: error.message || 'Failed to fetch assignments' };
  }
};

export const createAssignment = async (
  assignmentData: CreateAssignmentData
): Promise<ServiceResponse<Assignment>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data, error } = await supabase
      .from('assignments')
      .insert(assignmentData)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { success: true, data: data as Assignment };
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    return { success: false, error: error.message || 'Failed to create assignment' };
  }
};

export const getStudentGrades = async (
  studentId: string,
  classId?: string
): Promise<ServiceResponse<StudentGrade[]>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    let query = supabase
      .from('student_grades')
      .select('*')
      .eq('student_id', studentId)
      .order('graded_date', { ascending: false });

    if (classId) {
      query = query.eq('class_id', classId);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return { success: true, data: data as StudentGrade[] };
  } catch (error: any) {
    console.error('Error fetching student grades:', error);
    return { success: false, error: error.message || 'Failed to fetch grades' };
  }
};

export const createGrade = async (
  gradeData: CreateGradeData
): Promise<ServiceResponse<StudentGrade>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data, error } = await supabase
      .from('student_grades')
      .insert(gradeData)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { success: true, data: data as StudentGrade };
  } catch (error: any) {
    console.error('Error creating grade:', error);
    return { success: false, error: error.message || 'Failed to create grade' };
  }
};

export const updateGrade = async (
  gradeId: string,
  updates: Partial<CreateGradeData>
): Promise<ServiceResponse<StudentGrade>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data, error } = await supabase
      .from('student_grades')
      .update(updates)
      .eq('id', gradeId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { success: true, data: data as StudentGrade };
  } catch (error: any) {
    console.error('Error updating grade:', error);
    return { success: false, error: error.message || 'Failed to update grade' };
  }
};

export const deleteGrade = async (
  gradeId: string
): Promise<ServiceResponse<void>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { error } = await supabase
      .from('student_grades')
      .delete()
      .eq('id', gradeId);

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting grade:', error);
    return { success: false, error: error.message || 'Failed to delete grade' };
  }
};

export const getClassGradeDistribution = async (
  classId: string
): Promise<ServiceResponse<GradeDistribution[]>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data, error } = await supabase
      .rpc('get_class_grade_distribution', { p_class_id: classId });

    if (error) throw new Error(error.message);

    return { success: true, data: data as GradeDistribution[] };
  } catch (error: any) {
    console.error('Error fetching grade distribution:', error);
    return { success: false, error: error.message || 'Failed to fetch grade distribution' };
  }
};

export const calculateStudentGPA = async (
  studentId: string
): Promise<ServiceResponse<number>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data, error } = await supabase
      .rpc('calculate_student_gpa', { p_student_id: studentId });

    if (error) throw new Error(error.message);

    return { success: true, data: data as number };
  } catch (error: any) {
    console.error('Error calculating GPA:', error);
    return { success: false, error: error.message || 'Failed to calculate GPA' };
  }
};

export const getClassAverageGrade = async (
  classId: string
): Promise<ServiceResponse<number>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data, error } = await supabase
      .from('student_grades')
      .select('percentage')
      .eq('class_id', classId);

    if (error) throw new Error(error.message);

    if (!data || data.length === 0) {
      return { success: true, data: 0 };
    }

    const average = data.reduce((sum, grade) => sum + grade.percentage, 0) / data.length;

    return { success: true, data: Math.round(average * 100) / 100 };
  } catch (error: any) {
    console.error('Error calculating class average:', error);
    return { success: false, error: error.message || 'Failed to calculate class average' };
  }
};

export const bulkCreateGrades = async (
  grades: CreateGradeData[]
): Promise<ServiceResponse<StudentGrade[]>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    const { data, error } = await supabase
      .from('student_grades')
      .insert(grades)
      .select();

    if (error) throw new Error(error.message);

    return { success: true, data: data as StudentGrade[] };
  } catch (error: any) {
    console.error('Error creating grades:', error);
    return { success: false, error: error.message || 'Failed to create grades' };
  }
};

export const getClassGradesWithDetails = async (
  classId: string,
  startDate?: string,
  endDate?: string
): Promise<ServiceResponse<any[]>> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    let query = supabase
      .from('student_grades')
      .select(`
        *,
        assignment:assignments(
          id,
          title,
          assignment_type,
          points_possible,
          due_date
        ),
        student:students(
          id,
          student_name
        )
      `)
      .eq('class_id', classId)
      .order('graded_date', { ascending: false });

    if (startDate) {
      query = query.gte('graded_date', startDate);
    }

    if (endDate) {
      query = query.lte('graded_date', endDate);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching class grades with details:', error);
    return { success: false, error: error.message || 'Failed to fetch grades' };
  }
};
