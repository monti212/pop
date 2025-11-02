export type NeurodivergenceType = 'ADHD' | 'Autism' | 'Dyslexia' | 'Dyscalculia' | 'Other';

export interface Class {
  id: string;
  teacher_id: string;
  class_name: string;
  subject: string | null;
  grade_level: string | null;
  class_section: string | null;
  description: string | null;
  meeting_days: string[];
  meeting_time: string | null;
  room_location: string | null;
  student_count: number;
  active_status: boolean;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  class_id: string;
  student_name: string;
  student_identifier: string | null;
  has_neurodivergence: boolean;
  neurodivergence_type: NeurodivergenceType | null;
  accommodations: string | null;
  learning_notes: string | null;
  active_status: boolean;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  attendance_date: string;
  is_present: boolean;
  status: AttendanceStatus;
  notes: string | null;
  recorded_at: string;
  recorded_by: string | null;
  last_modified_at: string;
}

export interface StudentWithAttendance extends Student {
  attendance?: AttendanceRecord;
  attendance_rate?: number;
}

export interface ClassWithStats extends Class {
  attendance_rate?: number;
  total_attendance_days?: number;
  students?: Student[];
}

export interface AttendanceStats {
  total_days: number;
  present_days: number;
  absent_days: number;
  attendance_rate: number;
}

export interface ClassMissingAttendance {
  class_id: string;
  class_name: string;
  teacher_id: string;
  teacher_name: string;
  student_count: number;
}

export interface CreateClassData {
  class_name: string;
  subject?: string;
  grade_level?: string;
  class_section?: string;
  description?: string;
  meeting_days?: string[];
  meeting_time?: string;
  room_location?: string;
}

export interface UpdateClassData {
  class_name?: string;
  subject?: string;
  grade_level?: string;
  class_section?: string;
  description?: string;
  meeting_days?: string[];
  meeting_time?: string;
  room_location?: string;
  active_status?: boolean;
}

export interface CreateStudentData {
  student_name: string;
  student_identifier?: string;
  has_neurodivergence?: boolean;
  neurodivergence_type?: NeurodivergenceType;
  accommodations?: string;
  learning_notes?: string;
}

export interface UpdateStudentData {
  student_name?: string;
  student_identifier?: string;
  has_neurodivergence?: boolean;
  neurodivergence_type?: NeurodivergenceType;
  accommodations?: string;
  learning_notes?: string;
  active_status?: boolean;
}

export interface RecordAttendanceData {
  student_id: string;
  class_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  notes?: string | null;
}

export interface BulkAttendanceData {
  class_id: string;
  attendance_date: string;
  records: Array<{
    student_id: string;
    status: AttendanceStatus;
    notes?: string | null;
  }>;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
