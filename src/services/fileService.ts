import { supabase } from './authService';
import { parseDocumentContent } from '../utils/documentParser';
import { User } from '@supabase/supabase-js';

export interface UserFile {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number;
  content_preview?: string;
  storage_path: string;
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FocusSet {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileUploadResult {
  success: boolean;
  file?: UserFile;
  error?: string;
}

export interface FileSearchResult {
  success: boolean;
  files?: UserFile[];
  totalCount?: number;
  error?: string;
}

const STORAGE_BUCKET = 'user-files';

// File size limit: 2GB
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB in bytes

// User storage limit: 1GB total
const MAX_USER_STORAGE_BYTES = 1 * 1024 * 1024 * 1024; // 1GB in bytes

/**
 * Sanitize filename to remove problematic Unicode characters and ensure safe storage
 * Keeps alphanumeric characters, dots, hyphens, and underscores
 * Replaces all other characters with underscores
 */
const sanitizeFilename = (filename: string): string => {
  try {
    // Extract extension
    const lastDotIndex = filename.lastIndexOf('.');
    const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
    const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';

    // Replace problematic characters with underscores
    // Keep only: alphanumeric, hyphen, underscore, and dot
    const sanitizedName = name
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

    // Sanitize extension (keep dot and alphanumeric only)
    const sanitizedExt = extension.replace(/[^a-zA-Z0-9.]/g, '');

    // Ensure we have a valid filename
    const result = sanitizedName || 'file';
    return result + sanitizedExt;
  } catch (error) {
    console.error('Error sanitizing filename:', error);
    return 'file.bin'; // Fallback to generic name
  }
};

/**
 * Robust base64 to Blob converter that handles Unicode strings properly
 * Uses modern Blob API instead of atob to avoid Unicode escape sequence errors
 */
const base64ToBlob = (base64Data: string, contentType: string = 'image/png'): Blob => {
  try {
    // Remove data URL prefix if present
    const base64String = base64Data.replace(/^data:[^;]+;base64,/, '');

    // Validate base64 format
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64String)) {
      throw new Error('Invalid base64 format');
    }

    // Use fetch API to decode base64 (more robust than atob)
    const dataUrl = `data:${contentType};base64,${base64String}`;
    return fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => blob)
      .catch(err => {
        // Fallback to atob method with proper error handling
        try {
          const binaryString = atob(base64String);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return new Blob([bytes], { type: contentType });
        } catch (atobError) {
          throw new Error(`Failed to decode base64 data: ${atobError}`);
        }
      });
  } catch (error: any) {
    console.error('Error converting base64 to blob:', error);
    throw new Error(`Base64 conversion failed: ${error.message}`);
  }
};

/**
 * Validate and refresh the user session before file operations
 * This ensures we have a valid authentication token for storage operations
 */
const validateAndRefreshSession = async (): Promise<{ valid: boolean; userId?: string; error?: string }> => {
  try {
    if (!supabase) {
      console.error('[FileService] Supabase client not initialized');
      return { valid: false, error: 'Service temporarily unavailable. Please try again.' };
    }

    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('[FileService] Session error:', sessionError);
      return { valid: false, error: 'Authentication error. Please sign in again.' };
    }

    if (!session) {
      console.error('[FileService] No active session found');
      return { valid: false, error: 'You need to be signed in to upload files.' };
    }

    // Validate session is not expired
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;

      console.log('[FileService] Session validation:', {
        userId: session.user.id,
        expiresIn: `${Math.floor(timeUntilExpiry / 60)} minutes`,
        isExpired: timeUntilExpiry <= 0
      });

      // If session expires in less than 5 minutes, refresh it
      if (timeUntilExpiry < 300) {
        console.log('[FileService] Session expiring soon, refreshing...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshData.session) {
          console.error('[FileService] Session refresh failed:', refreshError);
          return { valid: false, error: 'Your session has expired. Please sign in again.' };
        }

        console.log('[FileService] Session refreshed successfully');
        return { valid: true, userId: refreshData.session.user.id };
      }
    }

    // Validate userId format (should be a UUID)
    const userId = session.user.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('[FileService] Invalid userId format:', userId);
      return { valid: false, error: 'Invalid user session. Please sign in again.' };
    }

    console.log('[FileService] Session validated successfully for user:', userId);
    return { valid: true, userId };
  } catch (error: any) {
    console.error('[FileService] Session validation error:', error);
    return { valid: false, error: error.message || 'Authentication error. Please try again.' };
  }
};

/**
 * Get total storage used by a user
 */
export const getUserStorageUsed = async (
  userId: string
): Promise<{ success: boolean; bytesUsed?: number; error?: string }> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having technical difficulties. Give me a sec?'
      };
    }

    const { data, error } = await supabase
      .from('user_files')
      .select('file_size')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`I couldn't check your storage usage. ${error.message}`);
    }

    const totalBytes = data?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0;

    return {
      success: true,
      bytesUsed: totalBytes
    };
  } catch (error: any) {
    console.error('Error getting user storage usage:', error);
    return {
      success: false,
      error: error.message || 'Storage usage check isn\'t working right now. Try again?'
    };
  }
};

/**
 * Upload a base64 image to Supabase Storage and return the public URL
 */
export const uploadBase64Image = async (
  base64Data: string,
  userId: string,
  filename?: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having a bit of trouble right now. Give me a moment and try again?'
      };
    }

    console.log('[uploadBase64Image] Starting upload:', {
      hasData: !!base64Data,
      dataLength: base64Data?.length,
      userId,
      filename
    });

    // Convert base64 to blob using robust method
    let blob: Blob;
    try {
      const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

      // Use fetch API for more robust base64 decoding
      const dataUrl = `data:image/png;base64,${base64String}`;
      const response = await fetch(dataUrl);
      blob = await response.blob();

      console.log('[uploadBase64Image] Base64 converted to blob:', {
        blobSize: blob.size,
        blobType: blob.type
      });
    } catch (conversionError: any) {
      console.error('[uploadBase64Image] Base64 conversion failed:', conversionError);
      throw new Error(`Failed to process image data. The image may be corrupted or in an unsupported format.`);
    }

    // Validate blob
    if (!blob || blob.size === 0) {
      throw new Error('Invalid image data - the image appears to be empty or corrupted.');
    }

    // Generate unique filename with sanitization
    const timestamp = Date.now();
    const rawFilename = filename || `generated-image-${timestamp}.png`;
    const sanitizedFilename = sanitizeFilename(rawFilename);
    const filePath = `${userId}/generated-images/${sanitizedFilename}`;

    console.log('[uploadBase64Image] Uploading to storage:', {
      originalFilename: rawFilename,
      sanitizedFilename,
      filePath,
      blobSize: blob.size
    });

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/png'
      });

    if (uploadError) {
      console.error('[uploadBase64Image] Upload error:', uploadError);
      throw new Error(`I couldn't get that image uploaded. ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    console.log('[uploadBase64Image] Upload successful:', { publicUrl });

    return {
      success: true,
      url: publicUrl
    };
  } catch (error: any) {
    console.error('[uploadBase64Image] Error uploading base64 image:', error);
    return {
      success: false,
      error: error.message || 'Something went wrong uploading that image. Want to try again?'
    };
  }
};

/**
 * Upload a chat image (File object) to Supabase Storage and return the public URL
 * Used for images attached to chat messages
 */
export const uploadChatImage = async (
  file: File,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    console.log('[uploadChatImage] Starting upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileSizeMB: (file.size / 1024 / 1024).toFixed(2),
      fileType: file.type,
      providedUserId: userId,
      timestamp: new Date().toISOString()
    });

    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having a bit of trouble right now. Give me a moment and try again?'
      };
    }

    // Validate and refresh session before upload
    const sessionValidation = await validateAndRefreshSession();
    if (!sessionValidation.valid) {
      console.error('[uploadChatImage] Session validation failed:', sessionValidation.error);
      return {
        success: false,
        error: sessionValidation.error || 'Authentication error. Please sign in again.'
      };
    }

    // Use the validated userId from session
    const validatedUserId = sessionValidation.userId!;
    console.log('[uploadChatImage] Session validated, using userId:', { validatedUserId, originalUserId: userId });

    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'Only image files are supported for chat images'
      };
    }

    // Check file size (max 10MB for images)
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_IMAGE_SIZE) {
      return {
        success: false,
        error: `Image is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 10MB.`
      };
    }

    // Generate unique filename with sanitization
    const timestamp = Date.now();
    const sanitizedName = sanitizeFilename(file.name);
    const extension = sanitizedName.split('.').pop() || 'png';
    const imageFilename = `chat-image-${timestamp}.${extension}`;
    const filePath = `${validatedUserId}/chat-images/${imageFilename}`;

    console.log('[uploadChatImage] Filename processing:', {
      originalName: file.name,
      sanitizedName,
      finalFilename: imageFilename
    });

    console.log('[uploadChatImage] Uploading to storage:', { filePath, bucket: STORAGE_BUCKET, fileSize: file.size });

    // Upload file directly to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      console.error('[uploadChatImage] Upload error:', uploadError);
      // Provide more specific error messages
      if (uploadError.message.includes('Bucket not found')) {
        throw new Error('Storage is not configured properly. Please contact support.');
      } else if (uploadError.message.includes('new row violates row-level security')) {
        throw new Error('You don\'t have permission to upload files. Please sign in again.');
      }
      throw new Error(`I couldn't get that image uploaded. ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    console.log('[uploadChatImage] Image uploaded successfully:', { filePath, publicUrl, fileName: file.name, fileSize: file.size });

    return {
      success: true,
      url: publicUrl
    };
  } catch (error: any) {
    console.error('[uploadChatImage] Error uploading chat image:', { error: error.message, stack: error.stack, fileName: file.name, fileSize: file.size, userId });
    return {
      success: false,
      error: error.message || 'Something went wrong uploading that image. Want to try again?'
    };
  }
};

/**
 * Upload a chat document (File object) to Supabase Storage and return the public URL
 * Used for non-image files attached to chat messages (PDFs, Word docs, etc.)
 */
export const uploadChatDocument = async (
  file: File,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    console.log('[uploadChatDocument] Starting upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileSizeMB: (file.size / 1024 / 1024).toFixed(2),
      fileType: file.type,
      providedUserId: userId,
      timestamp: new Date().toISOString()
    });

    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having a bit of trouble right now. Give me a moment and try again?'
      };
    }

    // Validate and refresh session before upload
    const sessionValidation = await validateAndRefreshSession();
    if (!sessionValidation.valid) {
      console.error('[uploadChatDocument] Session validation failed:', sessionValidation.error);
      return {
        success: false,
        error: sessionValidation.error || 'Authentication error. Please sign in again.'
      };
    }

    // Use the validated userId from session
    const validatedUserId = sessionValidation.userId!;
    console.log('[uploadChatDocument] Session validated, using userId:', { validatedUserId, originalUserId: userId });

    // Check file size (max 50MB for documents)
    const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_DOCUMENT_SIZE) {
      return {
        success: false,
        error: `Document is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 50MB.`
      };
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];

    if (file.type && !allowedTypes.includes(file.type)) {
      console.warn('[uploadChatDocument] Uploading file with unverified type:', file.type);
    }

    // Generate unique filename with robust sanitization
    const timestamp = Date.now();
    const sanitizedName = sanitizeFilename(file.name);
    const extension = sanitizedName.split('.').pop() || 'bin';
    const documentFilename = `chat-document-${timestamp}-${sanitizedName}`;
    const filePath = `${validatedUserId}/chat-documents/${documentFilename}`;

    console.log('[uploadChatDocument] Filename processing:', {
      originalName: file.name,
      sanitizedName,
      finalFilename: documentFilename
    });

    console.log('[uploadChatDocument] Uploading to storage:', { filePath, bucket: STORAGE_BUCKET, fileSize: file.size, fileType: file.type });

    // Upload file directly to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream'
      });

    if (uploadError) {
      console.error('[uploadChatDocument] Supabase upload error:', uploadError);
      // Provide more specific error messages
      if (uploadError.message.includes('Bucket not found')) {
        throw new Error('Storage bucket not found. Please ensure the storage bucket is configured in Supabase.');
      } else if (uploadError.message.includes('new row violates row-level security')) {
        throw new Error('You don\'t have permission to upload files. Please sign in again.');
      } else if (uploadError.message.includes('already exists')) {
        throw new Error('A file with this name already exists. Please try again.');
      }
      throw new Error(`I couldn't get that document uploaded. ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    console.log('[uploadChatDocument] Document uploaded successfully:', { filePath, publicUrl, fileName: file.name, fileSize: file.size, fileType: file.type });

    return {
      success: true,
      url: publicUrl
    };
  } catch (error: any) {
    console.error('[uploadChatDocument] Error uploading chat document:', { error: error.message, stack: error.stack, fileName: file.name, fileSize: file.size, fileType: file.type, userId });
    return {
      success: false,
      error: error.message || 'Something went wrong uploading that document. Want to try again?'
    };
  }
};

/**
 * Upload a file to Supabase Storage and save metadata to database
 */
export const uploadFile = async (
  file: File,
  userId: string,
  title?: string,
  tags: string[] = []
): Promise<FileUploadResult> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having a moment. Could you try again shortly?'
      };
    }

    // Check file size limit (2GB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const fileSizeGB = (file.size / (1024 * 1024 * 1024)).toFixed(2);
      return {
        success: false,
        error: `That file is ${fileSizeGB}GB, which exceeds our 2GB limit. Try a smaller file or compress it first?`
      };
    }

    // Check user's current storage usage
    const storageResult = await getUserStorageUsed(userId);
    if (!storageResult.success) {
      return {
        success: false,
        error: storageResult.error || 'I couldn\'t check your storage usage. Try again?'
      };
    }

    const currentUsageBytes = storageResult.bytesUsed || 0;
    const newTotalUsage = currentUsageBytes + file.size;

    // Check if adding this file would exceed the storage limit
    if (newTotalUsage > MAX_USER_STORAGE_BYTES) {
      const currentUsageGB = (currentUsageBytes / (1024 * 1024 * 1024)).toFixed(2);
      const fileSizeGB = (file.size / (1024 * 1024 * 1024)).toFixed(2);
      const maxStorageGB = (MAX_USER_STORAGE_BYTES / (1024 * 1024 * 1024)).toFixed(1);
      
      return {
        success: false,
        error: `You're using ${currentUsageGB}GB of your ${maxStorageGB}GB storage limit. This ${fileSizeGB}GB file would put you over the limit. Try deleting some files first or consider upgrading for more storage.`
      };
    }

    // Generate unique file path
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || '';
    const fileName = `${userId}/${timestamp}-${file.name}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`I couldn't upload that file. ${uploadError.message}`);
    }

    // Extract content preview for indexing
    let contentPreview = '';
    try {
      contentPreview = await parseDocumentContent(file);
      // Limit preview to 5000 characters for database efficiency
      if (contentPreview.length > 5000) {
        contentPreview = contentPreview.substring(0, 5000) + '...[truncated]';
      }
    } catch (error) {
      console.warn('Failed to extract content preview:', error);
      contentPreview = `[${file.type}] I couldn't read the content of this file. It might be corrupted or a format I don't recognize yet.`;
    }

    // Save file metadata to database
    const fileRecord = {
      user_id: userId,
      title: title || file.name,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      content_preview: contentPreview,
      storage_path: fileName,
      tags: tags,
      metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null
      }
    };

    const { data: insertData, error: insertError } = await supabase
      .from('user_files')
      .insert(fileRecord)
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      console.error('Attempted to insert:', fileRecord);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from(STORAGE_BUCKET).remove([fileName]);
      throw new Error(`I saved your file but couldn't record the details. ${insertError.message}`);
    }

    console.log('File uploaded successfully:', insertData);

    return {
      success: true,
      file: insertData as UserFile
    };
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error.message || 'Something went sideways with that upload. Mind trying again?'
    };
  }
};

/**
 * Search user files with filters and text search (optimized - excludes content_preview)
 */
export const searchFiles = async (
  userId: string,
  query?: string,
  fileType?: string,
  tags?: string[],
  limit: number = 50,
  offset: number = 0
): Promise<FileSearchResult> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having technical difficulties. Give me a sec?'
      };
    }

    let queryBuilder = supabase
      .from('user_files')
      .select('id, user_id, title, file_name, file_type, file_size, storage_path, tags, metadata, created_at, updated_at', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null);

    // Add text search if query provided (excluding content_preview for performance)
    if (query && query.trim()) {
      // Use ilike for simple text search across title and file_name only
      const searchPattern = `%${query}%`;
      queryBuilder = queryBuilder.or(`title.ilike.${searchPattern},file_name.ilike.${searchPattern}`);
    }

    // Add file type filter
    if (fileType) {
      queryBuilder = queryBuilder.eq('file_type', fileType);
    }

    // Add tags filter
    if (tags && tags.length > 0) {
      queryBuilder = queryBuilder.contains('tags', tags);
    }

    // Add ordering and pagination
    queryBuilder = queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await queryBuilder;

    if (error) {
      console.error('Search query error:', error);
      throw new Error(`I couldn't search through your files. ${error.message}`);
    }

    console.log(`Found ${data?.length || 0} files for user ${userId}`);
    if (data && data.length > 0) {
      console.log('Sample file data:', data[0]);
    }

    // Cast without content_preview for performance
    return {
      success: true,
      files: (data as UserFile[]).map(file => ({
        ...file,
        content_preview: undefined // Excluded for performance
      })),
      totalCount: count || 0
    };
  } catch (error: any) {
    console.error('Error searching files:', error);
    return {
      success: false,
      error: error.message || 'File search isn\'t working right now. Want to try again?'
    };
  }
};

/**
 * Get file metadata with content preview (when needed for search/indexing)
 */
export const getFileWithPreview = async (
  fileId: string,
  userId: string
): Promise<{ success: boolean; file?: UserFile; error?: string }> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having issues right now. Try again in a moment?'
      };
    }

    const { data, error } = await supabase
      .from('user_files')
      .select('id, user_id, title, file_name, file_type, file_size, storage_path, tags, metadata, created_at, updated_at, content_preview')
      .eq('id', fileId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error) {
      throw new Error(`I couldn't find that file. ${error.message}`);
    }

    return {
      success: true,
      file: data as UserFile
    };
  } catch (error: any) {
    console.error('Error getting file with preview:', error);
    return {
      success: false,
      error: error.message || 'I couldn\'t get that file. Try again?'
    };
  }
};

/**
 * Get file content from Supabase Storage
 */
export const getFileContent = async (
  storagePath: string
): Promise<{ success: boolean; content?: string; error?: string }> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having issues right now. Try again in a moment?'
      };
    }

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);

    if (error) {
      throw new Error(`I couldn't grab that file for you. ${error.message}`);
    }

    const content = await data.text();
    return {
      success: true,
      content
    };
  } catch (error: any) {
    console.error('Error getting file content:', error);
    return {
      success: false,
      error: error.message || 'I couldn\'t get the content from that file. Try again?'
    };
  }
};

/**
 * Delete a user file
 */
export const deleteFile = async (
  fileId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Something\'s up on my end. Give me a moment?'
      };
    }

    // First get the file to find storage path
    const { data: fileData, error: fetchError } = await supabase
      .from('user_files')
      .select('storage_path')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !fileData) {
      throw new Error('I can\'t find that file, or maybe you don\'t have access to it?');
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([fileData.storage_path]);

    if (storageError) {
      console.warn('Failed to delete file from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('user_files')
      .delete()
      .eq('id', fileId)
      .eq('user_id', userId);

    if (dbError) {
      throw new Error(`I deleted the file but couldn't clean up the records. ${dbError.message}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return {
      success: false,
      error: error.message || 'I couldn\'t delete that file. Want to try again?'
    };
  }
};

/**
 * Update file metadata (title, tags)
 */
export const updateFile = async (
  fileId: string,
  userId: string,
  updates: Partial<Pick<UserFile, 'title' | 'tags'>>
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having a moment. Try again shortly?'
      };
    }

    const { error } = await supabase
      .from('user_files')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`I couldn't update that file. ${error.message}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating file:', error);
    return {
      success: false,
      error: error.message || 'File update isn\'t working right now. Try again?'
    };
  }
};

/**
 * Get file download URL
 */
export const getFileDownloadUrl = async (
  storagePath: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having technical troubles. Give me a sec?'
      };
    }

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error) {
      throw new Error(`I couldn't create a download link for that file. ${error.message}`);
    }

    return {
      success: true,
      url: data.signedUrl
    };
  } catch (error: any) {
    console.error('Error getting download URL:', error);
    return {
      success: false,
      error: error.message || 'Download link creation is acting up. Try again?'
    };
  }
};

/**
 * Create a new Focus Set
 */
export const createFocusSet = async (
  userId: string,
  name: string,
  description: string = ''
): Promise<{ success: boolean; focusSet?: FocusSet; error?: string }> => {
  try {
    if (!supabase) {
      return { success: false, error: 'I\'m having trouble right now. Mind trying again later?' };
    }

    const { data, error } = await supabase
      .from('focus_sets')
      .insert({ user_id: userId, name, description })
      .select()
      .single();

    if (error) throw error;

    return { success: true, focusSet: data as FocusSet };
  } catch (error: any) {
    console.error('Error creating focus set:', error);
    return { success: false, error: error.message || 'I couldn\'t create that Focus Set. Want to try again?' };
  }
};

/**
 * Get all Focus Sets for a user
 */
export const getUsersFocusSets = async (
  userId: string
): Promise<{ success: boolean; focusSets?: FocusSet[]; error?: string }> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Something\'s not working right. Try again in a bit?' };
    }

    const { data, error } = await supabase
      .from('focus_sets')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return { success: true, focusSets: data as FocusSet[] };
  } catch (error: any) {
    console.error('Error fetching focus sets:', error);
    return { success: false, error: error.message || 'I couldn\'t load your Focus Sets. Try again?' };
  }
};

/**
 * Update a Focus Set
 */
export const updateFocusSet = async (
  focusSetId: string,
  userId: string,
  updates: Partial<Pick<FocusSet, 'name' | 'description'>>
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!supabase) {
      return { success: false, error: 'I\'m having issues. Give me a moment and try again?' };
    }

    const { error } = await supabase
      .from('focus_sets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', focusSetId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error updating focus set:', error);
    return { success: false, error: error.message || 'Focus Set update isn\'t working. Want to try again?' };
  }
};

/**
 * Delete a Focus Set
 */
export const deleteFocusSet = async (
  focusSetId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Something\'s acting up. Try again shortly?' };
    }

    const { error } = await supabase
      .from('focus_sets')
      .delete()
      .eq('id', focusSetId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting focus set:', error);
    return { success: false, error: error.message || 'I couldn\'t delete that Focus Set. Try again?' };
  }
};

/**
 * Add files to a Focus Set
 */
export const addFilesToFocusSet = async (
  focusSetId: string,
  fileIds: string[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!supabase) {
      return { success: false, error: 'I\'m having technical difficulties. Give me a moment?' };
    }

    const records = fileIds.map(fileId => ({ focus_set_id: focusSetId, file_id: fileId }));
    const { error } = await supabase
      .from('focus_set_files')
      .insert(records)
      .select();

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error adding files to focus set:', error);
    return { success: false, error: error.message || 'I couldn\'t add those files to the Focus Set. Try again?' };
  }
};

/**
 * Remove files from a Focus Set
 */
export const removeFilesFromFocusSet = async (
  focusSetId: string,
  fileIds: string[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!supabase) {
      return { success: false, error: 'Something\'s not right. Mind trying again?' };
    }

    const { error } = await supabase
      .from('focus_set_files')
      .delete()
      .eq('focus_set_id', focusSetId)
      .in('file_id', fileIds);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error removing files from focus set:', error);
    return { success: false, error: error.message || 'I couldn\'t remove those files from the Focus Set. Try again?' };
  }
};

/**
 * Get files within a specific Focus Set
 */
export const getFilesInFocusSet = async (
  focusSetId: string
): Promise<{ success: boolean; files?: UserFile[]; error?: string }> => {
  try {
    if (!supabase) {
      return { success: false, error: 'I\'m having trouble. Give me a moment and try again?' };
    }

    const { data, error } = await supabase
      .from('focus_set_files')
      .select('file_id, user_files(id, user_id, title, file_name, file_type, file_size, storage_path, tags, metadata, created_at, updated_at)')
      .eq('focus_set_id', focusSetId);

    if (error) throw error;

    // Extract the user_files objects from the nested structure
    const files = data ? data.map((item: any) => item.user_files) : [];

    return { success: true, files: files as UserFile[] };
  } catch (error: any) {
    console.error('Error fetching files in focus set:', error);
    return { success: false, error: error.message || 'I couldn\'t load the files in that Focus Set. Try again?' };
  }
};