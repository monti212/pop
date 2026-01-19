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

export interface CreateAssessmentData {
  class_id: string;
  title: string;
  description?: string;
  status: 'active' | 'upcoming' | 'due' | 'completed';
  due_date?: string;
}

export interface UpdateAssessmentData {
  title?: string;
  description?: string;
  status?: 'active' | 'upcoming' | 'due' | 'completed';
  due_date?: string;
}

export const getClassAssessments = async (classId: string) => {
  try {
    const { data, error } = await supabase
      .from('class_assessments')
      .select('*')
      .eq('class_id', classId)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return { success: true, data: data as Assessment[] };
  } catch (error: any) {
    console.error('Error fetching class assessments:', error);
    return { success: false, error: error.message };
  }
};

export const createAssessment = async (assessmentData: CreateAssessmentData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('class_assessments')
      .insert([
        {
          class_id: assessmentData.class_id,
          user_id: user.id,
          title: assessmentData.title,
          description: assessmentData.description || null,
          status: assessmentData.status,
          due_date: assessmentData.due_date || null
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return { success: true, data: data as Assessment };
  } catch (error: any) {
    console.error('Error creating assessment:', error);
    return { success: false, error: error.message };
  }
};

export const updateAssessment = async (assessmentId: string, updates: UpdateAssessmentData) => {
  try {
    const { data, error } = await supabase
      .from('class_assessments')
      .update(updates)
      .eq('id', assessmentId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data: data as Assessment };
  } catch (error: any) {
    console.error('Error updating assessment:', error);
    return { success: false, error: error.message };
  }
};

export const deleteAssessment = async (assessmentId: string) => {
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
};

export const uploadAssessmentDocument = async (
  assessmentId: string,
  file: File,
  classId: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${assessmentId}-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${classId}/assessments/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('user-files')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('class_assessments')
      .update({
        document_url: filePath,
        document_name: file.name
      })
      .eq('id', assessmentId);

    if (updateError) throw updateError;

    return {
      success: true,
      url: urlData.publicUrl
    };
  } catch (error: any) {
    console.error('Error uploading assessment document:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const removeAssessmentDocument = async (assessmentId: string, documentUrl: string) => {
  try {
    const { error: deleteError } = await supabase.storage
      .from('user-files')
      .remove([documentUrl]);

    if (deleteError) throw deleteError;

    const { error: updateError } = await supabase
      .from('class_assessments')
      .update({
        document_url: null,
        document_name: null
      })
      .eq('id', assessmentId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error: any) {
    console.error('Error removing assessment document:', error);
    return { success: false, error: error.message };
  }
};

export const downloadAssessmentDocument = async (documentUrl: string): Promise<Blob | null> => {
  try {
    const { data, error } = await supabase.storage
      .from('user-files')
      .download(documentUrl);

    if (error) throw error;

    return data;
  } catch (error: any) {
    console.error('Error downloading assessment document:', error);
    return null;
  }
};
