export interface GradeCategory {
  id: string;
  class_id: string;
  category_name: string;
  category_weight: number;
  description: string | null;
  color: string;
  active_status: boolean;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  class_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  points_possible: number;
  due_date: string | null;
  assigned_date: string;
  assignment_type: string;
  status: string;
  rubric: any | null;
  created_at: string;
  updated_at: string;
}

export interface StudentGrade {
  id: string;
  student_id: string;
  assignment_id: string | null;
  class_id: string;
  category_id: string | null;
  subject: string | null;
  grade_value: number;
  points_possible: number;
  percentage: number;
  letter_grade: string | null;
  graded_date: string;
  teacher_comments: string | null;
  late_submission: boolean;
  extra_credit: boolean;
  created_at: string;
  updated_at: string;
}

export interface GradeDistribution {
  grade_range: string;
  student_count: number;
  percentage: number;
}

export interface CreateGradeCategoryData {
  class_id: string;
  category_name: string;
  category_weight: number;
  description?: string;
  color?: string;
}

export interface CreateAssignmentData {
  class_id: string;
  category_id?: string;
  title: string;
  description?: string;
  points_possible: number;
  due_date?: string;
  assignment_type?: string;
  rubric?: any;
}

export interface CreateGradeData {
  student_id: string;
  assignment_id?: string;
  class_id: string;
  category_id?: string;
  subject?: string;
  grade_value: number;
  points_possible: number;
  letter_grade?: string;
  graded_date?: string;
  teacher_comments?: string;
  late_submission?: boolean;
  extra_credit?: boolean;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
