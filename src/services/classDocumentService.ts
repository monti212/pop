import { supabase } from './authService';

export interface ClassFolder {
  id: string;
  class_id: string;
  folder_name: string;
  folder_type: 'lesson_plans' | 'notes' | 'reports' | 'resources' | 'custom';
  parent_folder_id: string | null;
  folder_path: string;
  folder_depth: number;
  color: string | null;
  icon: string | null;
  sort_order: number;
  document_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ClassDocument {
  id: string;
  class_id: string;
  folder_id: string | null;
  user_id: string;
  title: string;
  document_type: 'lesson_plan' | 'note' | 'report' | 'resource' | 'other';
  content: string | null;
  file_url: string | null;
  storage_path: string | null;
  file_extension: string | null;
  file_size: number | null;
  metadata: Record<string, any>;
  tags: string[];
  is_lesson_plan: boolean;
  lesson_plan_confidence: number;
  lesson_plan_metadata: Record<string, any>;
  conversation_id: string | null;
  message_id: string | null;
  auto_saved: boolean;
  version: number;
  parent_version_id: string | null;
  view_count: number;
  download_count: number;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DocumentWithFolder extends ClassDocument {
  folder_name: string | null;
}

export interface DocumentStats {
  total_documents: number;
  lesson_plans_count: number;
  notes_count: number;
  reports_count: number;
  resources_count: number;
  recent_document_title: string | null;
  recent_document_date: string | null;
}

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const getClassFolders = async (classId: string): Promise<ServiceResponse<ClassFolder[]>> => {
  try {
    const { data, error } = await supabase
      .from('class_folders')
      .select('*')
      .eq('class_id', classId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching class folders:', error);
    return { success: false, error: error.message || 'Failed to fetch folders' };
  }
};

export const getClassDocuments = async (classId: string): Promise<ServiceResponse<DocumentWithFolder[]>> => {
  try {
    const { data, error } = await supabase
      .from('class_documents')
      .select(`
        *,
        folder:class_folders(folder_name)
      `)
      .eq('class_id', classId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const documents = (data || []).map((doc: any) => ({
      ...doc,
      folder_name: doc.folder?.folder_name || null
    }));

    return { success: true, data: documents };
  } catch (error: any) {
    console.error('Error fetching class documents:', error);
    return { success: false, error: error.message || 'Failed to fetch documents' };
  }
};

export const getFolderDocuments = async (folderId: string): Promise<ServiceResponse<ClassDocument[]>> => {
  try {
    const { data, error } = await supabase
      .from('class_documents')
      .select('*')
      .eq('folder_id', folderId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching folder documents:', error);
    return { success: false, error: error.message || 'Failed to fetch folder documents' };
  }
};

export const getDocumentStats = async (classId: string): Promise<ServiceResponse<DocumentStats>> => {
  try {
    const { data, error } = await supabase
      .rpc('get_class_document_stats', { p_class_id: classId });

    if (error) throw error;

    return { success: true, data: data?.[0] || null };
  } catch (error: any) {
    console.error('Error fetching document stats:', error);
    return { success: false, error: error.message || 'Failed to fetch document statistics' };
  }
};

export const createDocument = async (
  classId: string,
  folderId: string | null,
  title: string,
  documentType: ClassDocument['document_type'],
  content?: string,
  metadata?: Record<string, any>
): Promise<ServiceResponse<ClassDocument>> => {
  try {
    const { data, error } = await supabase
      .from('class_documents')
      .insert({
        class_id: classId,
        folder_id: folderId,
        title,
        document_type: documentType,
        content,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating document:', error);
    return { success: false, error: error.message || 'Failed to create document' };
  }
};

export const updateDocument = async (
  documentId: string,
  updates: Partial<ClassDocument>
): Promise<ServiceResponse<ClassDocument>> => {
  try {
    const { data, error } = await supabase
      .from('class_documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error updating document:', error);
    return { success: false, error: error.message || 'Failed to update document' };
  }
};

export const deleteDocument = async (documentId: string, softDelete: boolean = true): Promise<ServiceResponse<void>> => {
  try {
    if (softDelete) {
      const { error } = await supabase
        .from('class_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', documentId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('class_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return { success: false, error: error.message || 'Failed to delete document' };
  }
};

export const createFolder = async (
  classId: string,
  folderName: string,
  folderType: ClassFolder['folder_type'],
  parentFolderId?: string | null
): Promise<ServiceResponse<ClassFolder>> => {
  try {
    const { data, error } = await supabase
      .from('class_folders')
      .insert({
        class_id: classId,
        folder_name: folderName,
        folder_type: folderType,
        parent_folder_id: parentFolderId || null
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating folder:', error);
    return { success: false, error: error.message || 'Failed to create folder' };
  }
};

export const incrementDocumentView = async (documentId: string): Promise<ServiceResponse<void>> => {
  try {
    const { error } = await supabase
      .rpc('increment', {
        row_id: documentId,
        table_name: 'class_documents',
        column_name: 'view_count'
      });

    await supabase
      .from('class_documents')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', documentId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error incrementing view count:', error);
    return { success: false, error: error.message || 'Failed to update view count' };
  }
};

export const incrementDocumentDownload = async (documentId: string): Promise<ServiceResponse<void>> => {
  try {
    const { data: currentDoc, error: fetchError } = await supabase
      .from('class_documents')
      .select('download_count')
      .eq('id', documentId)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('class_documents')
      .update({
        download_count: (currentDoc?.download_count || 0) + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error incrementing download count:', error);
    return { success: false, error: error.message || 'Failed to update download count' };
  }
};

export const moveDocumentToFolder = async (
  documentId: string,
  newFolderId: string | null
): Promise<ServiceResponse<void>> => {
  try {
    const { error } = await supabase
      .from('class_documents')
      .update({ folder_id: newFolderId })
      .eq('id', documentId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error moving document:', error);
    return { success: false, error: error.message || 'Failed to move document' };
  }
};

export const searchDocuments = async (
  classId: string,
  searchTerm: string
): Promise<ServiceResponse<DocumentWithFolder[]>> => {
  try {
    const { data, error } = await supabase
      .from('class_documents')
      .select(`
        *,
        folder:class_folders(folder_name)
      `)
      .eq('class_id', classId)
      .is('deleted_at', null)
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const documents = (data || []).map((doc: any) => ({
      ...doc,
      folder_name: doc.folder?.folder_name || null
    }));

    return { success: true, data: documents };
  } catch (error: any) {
    console.error('Error searching documents:', error);
    return { success: false, error: error.message || 'Failed to search documents' };
  }
};
