import { supabase } from './authService';
import { parseDocumentContent } from '../utils/documentParser';
import { getUserStorageUsed } from './fileService';

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

const STORAGE_BUCKET = 'user-files';
const MAX_USER_STORAGE_BYTES = 1 * 1024 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 5;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

export interface UploadResult {
  success: boolean;
  documents?: ClassDocument[];
  failedFiles?: { fileName: string; error: string }[];
  storageUsed?: number;
  error?: string;
}

const sanitizeFilename = (filename: string): string => {
  try {
    const lastDotIndex = filename.lastIndexOf('.');
    const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
    const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';

    const sanitizedName = name
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '');

    const sanitizedExt = extension.replace(/[^a-zA-Z0-9.]/g, '');
    const result = sanitizedName || 'document';
    return result + sanitizedExt;
  } catch (error) {
    console.error('Error sanitizing filename:', error);
    return 'document.bin';
  }
};

const detectDocumentType = (fileName: string, fileType: string): ClassDocument['document_type'] => {
  const lowerFileName = fileName.toLowerCase();
  const lowerFileType = fileType.toLowerCase();

  if (lowerFileName.includes('lesson') || lowerFileName.includes('plan')) {
    return 'lesson_plan';
  }
  if (lowerFileName.includes('note')) {
    return 'note';
  }
  if (lowerFileName.includes('report')) {
    return 'report';
  }
  if (lowerFileName.includes('resource')) {
    return 'resource';
  }

  if (lowerFileType.includes('pdf') || lowerFileType.includes('word') || lowerFileType.includes('document')) {
    return 'resource';
  }

  return 'other';
};

export const getClassDocumentsStorageUsed = async (
  classId: string
): Promise<ServiceResponse<number>> => {
  try {
    const { data, error } = await supabase
      .from('class_documents')
      .select('file_size')
      .eq('class_id', classId)
      .is('deleted_at', null);

    if (error) throw error;

    const totalBytes = data?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0;

    return { success: true, data: totalBytes };
  } catch (error: any) {
    console.error('Error getting class documents storage:', error);
    return { success: false, error: error.message || 'Failed to get storage usage' };
  }
};

export const getTotalStorageUsed = async (
  userId: string
): Promise<ServiceResponse<{ totalBytes: number; classDocsBytes: number; userFilesBytes: number }>> => {
  try {
    const userStorageResult = await getUserStorageUsed(userId);
    if (!userStorageResult.success) {
      return { success: false, error: userStorageResult.error };
    }

    const { data: classDocsData, error: classDocsError } = await supabase
      .from('class_documents')
      .select('file_size')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (classDocsError) throw classDocsError;

    const classDocsBytes = classDocsData?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0;
    const userFilesBytes = userStorageResult.bytesUsed || 0;
    const totalBytes = classDocsBytes + userFilesBytes;

    return {
      success: true,
      data: { totalBytes, classDocsBytes, userFilesBytes }
    };
  } catch (error: any) {
    console.error('Error getting total storage:', error);
    return { success: false, error: error.message || 'Failed to get total storage usage' };
  }
};

export const uploadClassDocuments = async (
  files: File[],
  classId: string,
  userId: string,
  folderId: string | null,
  onProgress?: (progress: UploadProgress[]) => void
): Promise<UploadResult> => {
  const uploadedDocuments: ClassDocument[] = [];
  const failedFiles: { fileName: string; error: string }[] = [];
  const progressMap = new Map<string, UploadProgress>();

  try {
    if (!supabase) {
      return { success: false, error: 'Service temporarily unavailable' };
    }

    if (files.length === 0) {
      return { success: false, error: 'No files selected' };
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      return { success: false, error: `Maximum ${MAX_FILES_PER_UPLOAD} files can be uploaded at once` };
    }

    files.forEach(file => {
      progressMap.set(file.name, {
        fileName: file.name,
        progress: 0,
        status: 'pending'
      });
    });

    if (onProgress) {
      onProgress(Array.from(progressMap.values()));
    }

    const totalFileSize = files.reduce((sum, file) => sum + file.size, 0);
    const storageResult = await getTotalStorageUsed(userId);

    if (!storageResult.success || !storageResult.data) {
      return { success: false, error: 'Could not check storage availability' };
    }

    const { totalBytes: currentUsage } = storageResult.data;
    const newTotal = currentUsage + totalFileSize;

    if (newTotal > MAX_USER_STORAGE_BYTES) {
      const currentGB = (currentUsage / (1024 * 1024 * 1024)).toFixed(2);
      const neededGB = (totalFileSize / (1024 * 1024 * 1024)).toFixed(2);
      return {
        success: false,
        error: `Storage limit exceeded. You're using ${currentGB}GB of 1GB. These files require ${neededGB}GB. Please delete some files first.`
      };
    }

    for (const file of files) {
      const progressItem = progressMap.get(file.name)!;

      try {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error(`File too large. Maximum size is ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB`);
        }

        progressItem.status = 'uploading';
        progressItem.progress = 25;
        if (onProgress) onProgress(Array.from(progressMap.values()));

        const timestamp = Date.now();
        const sanitizedName = sanitizeFilename(file.name);
        const fileExtension = sanitizedName.split('.').pop() || '';
        const storagePath = `${userId}/class-documents/${classId}/${timestamp}-${sanitizedName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'application/octet-stream'
          });

        if (uploadError) throw uploadError;

        progressItem.progress = 50;
        progressItem.status = 'processing';
        if (onProgress) onProgress(Array.from(progressMap.values()));

        const { data: { publicUrl } } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(storagePath);

        let contentPreview = '';
        try {
          contentPreview = await parseDocumentContent(file);
          if (contentPreview.length > 5000) {
            contentPreview = contentPreview.substring(0, 5000) + '...';
          }
        } catch (error) {
          console.warn('Could not extract content from file:', file.name, error);
        }

        progressItem.progress = 75;
        if (onProgress) onProgress(Array.from(progressMap.values()));

        const documentType = detectDocumentType(file.name, file.type);
        const isLessonPlan = contentPreview.toLowerCase().includes('lesson') && contentPreview.toLowerCase().includes('objective');

        const { data: docData, error: docError } = await supabase
          .from('class_documents')
          .insert({
            class_id: classId,
            folder_id: folderId,
            user_id: userId,
            title: file.name.replace(/\.[^/.]+$/, ''),
            document_type: documentType,
            content: contentPreview,
            file_url: publicUrl,
            storage_path: storagePath,
            file_extension: fileExtension,
            file_size: file.size,
            is_lesson_plan: isLessonPlan,
            metadata: {
              originalName: file.name,
              mimeType: file.type,
              uploadedAt: new Date().toISOString(),
              lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null
            }
          })
          .select()
          .single();

        if (docError) throw docError;

        uploadedDocuments.push(docData as ClassDocument);
        progressItem.status = 'complete';
        progressItem.progress = 100;
        if (onProgress) onProgress(Array.from(progressMap.values()));

      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error);
        progressItem.status = 'error';
        progressItem.error = error.message || 'Upload failed';
        failedFiles.push({ fileName: file.name, error: error.message || 'Upload failed' });
        if (onProgress) onProgress(Array.from(progressMap.values()));
      }
    }

    const finalStorageResult = await getTotalStorageUsed(userId);
    const storageUsed = finalStorageResult.success ? finalStorageResult.data?.totalBytes : currentUsage;

    if (uploadedDocuments.length === 0) {
      return {
        success: false,
        failedFiles,
        error: 'All file uploads failed'
      };
    }

    return {
      success: true,
      documents: uploadedDocuments,
      failedFiles: failedFiles.length > 0 ? failedFiles : undefined,
      storageUsed
    };

  } catch (error: any) {
    console.error('Error in batch upload:', error);
    return {
      success: false,
      error: error.message || 'Batch upload failed',
      failedFiles
    };
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

export const getDocumentById = async (documentId: string): Promise<ServiceResponse<ClassDocument>> => {
  try {
    const { data, error } = await supabase
      .from('class_documents')
      .select('*')
      .eq('id', documentId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching document:', error);
    return { success: false, error: error.message || 'Failed to fetch document' };
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
