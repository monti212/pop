import { supabase } from './authService';

export interface Assessment {
  id: string;
  class_id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'active' | 'upcoming' | 'due' | 'completed';
  due_date: string | null;
  document_url: string | null;
  document_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAssessmentInput {
  class_id: string;
  title: string;
  description?: string;
  status: 'active' | 'upcoming' | 'due' | 'completed';
  due_date?: string;
  document_url?: string;
  document_name?: string;
}

export interface UpdateAssessmentInput {
  title?: string;
  description?: string;
  status?: 'active' | 'upcoming' | 'due' | 'completed';
  due_date?: string;
  document_url?: string;
  document_name?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getClassAssessments(classId: string): Promise<ServiceResponse<Assessment[]>> {
  try {
    const { data, error } = await supabase
      .from('class_assessments')
      .select('*')
      .eq('class_id', classId)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching assessments:', error);
    return { success: false, error: error.message };
  }
}

export async function createAssessment(input: CreateAssessmentInput): Promise<ServiceResponse<Assessment>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('class_assessments')
      .insert({
        ...input,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating assessment:', error);
    return { success: false, error: error.message };
  }
}

export async function updateAssessment(
  assessmentId: string,
  input: UpdateAssessmentInput
): Promise<ServiceResponse<Assessment>> {
  try {
    const { data, error } = await supabase
      .from('class_assessments')
      .update(input)
      .eq('id', assessmentId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error updating assessment:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteAssessment(assessmentId: string): Promise<ServiceResponse<void>> {
  try {
    const { error } = await supabase
      .from('class_assessments')
      .delete()
      .eq('id', assessmentId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting assessment:', error);
    return { success: false, error: error.message };
  }
}

export async function uploadAssessmentDocument(
  file: File,
  classId: string
): Promise<ServiceResponse<{ url: string; name: string }>> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${classId}/assessments/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('user-files')
      .getPublicUrl(filePath);

    return {
      success: true,
      data: {
        url: filePath,
        name: file.name
      }
    };
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return { success: false, error: error.message };
  }
}

export async function getAssessmentCounts(classId: string): Promise<ServiceResponse<{
  active: number;
  upcoming: number;
  due: number;
  completed: number;
}>> {
  try {
    const { data, error } = await supabase
      .from('class_assessments')
      .select('status')
      .eq('class_id', classId);

    if (error) throw error;

    const counts = {
      active: 0,
      upcoming: 0,
      due: 0,
      completed: 0
    };

    data?.forEach((assessment) => {
      if (assessment.status in counts) {
        counts[assessment.status as keyof typeof counts]++;
      }
    });

    return { success: true, data: counts };
  } catch (error: any) {
    console.error('Error getting assessment counts:', error);
    return { success: false, error: error.message };
  }
}
