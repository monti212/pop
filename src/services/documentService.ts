import { supabase } from './authService';

export interface UserDocument {
  id: string;
  user_id: string;
  title: string;
  content: string;
  document_type: 'office' | 'sheet' | 'block';
  is_auto_saved: boolean;
  source?: string;
  metadata: Record<string, any>;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  document_type: 'document' | 'sheet';
  version_number: number;
  content_snapshot: Record<string, any>;
  change_summary?: string;
  created_by?: string;
  created_at: string;
}

export interface DocumentResult {
  success: boolean;
  document?: UserDocument;
  error?: string;
}

export interface DocumentListResult {
  success: boolean;
  documents?: UserDocument[];
  totalCount?: number;
  error?: string;
}

export interface DocumentVersionResult {
  success: boolean;
  versions?: DocumentVersion[];
  error?: string;
}

export const createDocument = async (
  userId: string,
  title: string,
  content: string = '',
  options?: {
    documentType?: 'office' | 'sheet' | 'block';
    isAutoSaved?: boolean;
    source?: string;
    metadata?: Record<string, any>;
  }
): Promise<DocumentResult> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having technical difficulties. Give me a moment?'
      };
    }

    const { data, error } = await supabase
      .from('user_documents')
      .insert({
        user_id: userId,
        title: title || 'Untitled Document',
        content: content,
        document_type: options?.documentType || 'office',
        is_auto_saved: options?.isAutoSaved || false,
        source: options?.source,
        metadata: options?.metadata || {}
      })
      .select()
      .single();

    if (error) {
      throw new Error(`I couldn't create that document. ${error.message}`);
    }

    return {
      success: true,
      document: data as UserDocument
    };
  } catch (error: any) {
    console.error('Error creating document:', error);
    return {
      success: false,
      error: error.message || 'Document creation isn\'t working right now. Try again?'
    };
  }
};

export const getDocument = async (
  documentId: string,
  userId: string
): Promise<DocumentResult> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having issues right now. Try again in a moment?'
      };
    }

    const { data, error } = await supabase
      .from('user_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error) {
      throw new Error(`I couldn't find that document. ${error.message}`);
    }

    return {
      success: true,
      document: data as UserDocument
    };
  } catch (error: any) {
    console.error('Error getting document:', error);
    return {
      success: false,
      error: error.message || 'I couldn\'t load that document. Try again?'
    };
  }
};

export const getUserDocuments = async (
  userId: string,
  options?: {
    documentType?: 'office' | 'sheet' | 'block';
    isAutoSaved?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<DocumentListResult> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Something\'s up on my end. Give me a moment?'
      };
    }

    let query = supabase
      .from('user_documents')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (options?.documentType) {
      query = query.eq('document_type', options.documentType);
    }

    if (options?.isAutoSaved !== undefined) {
      query = query.eq('is_auto_saved', options.isAutoSaved);
    }

    query = query.order('updated_at', { ascending: false });

    if (options?.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`I couldn't load your documents. ${error.message}`);
    }

    return {
      success: true,
      documents: data as UserDocument[],
      totalCount: count || 0
    };
  } catch (error: any) {
    console.error('Error getting user documents:', error);
    return {
      success: false,
      error: error.message || 'Document list isn\'t loading. Try again?'
    };
  }
};

export const updateDocument = async (
  documentId: string,
  userId: string,
  updates: {
    title?: string;
    content?: string;
    metadata?: Record<string, any>;
  }
): Promise<DocumentResult> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having a moment. Try again shortly?'
      };
    }

    const { data, error } = await supabase
      .from('user_documents')
      .update(updates)
      .eq('id', documentId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      throw new Error(`I couldn't update that document. ${error.message}`);
    }

    return {
      success: true,
      document: data as UserDocument
    };
  } catch (error: any) {
    console.error('Error updating document:', error);
    return {
      success: false,
      error: error.message || 'Document update isn\'t working. Try again?'
    };
  }
};

export const deleteDocument = async (
  documentId: string,
  userId: string,
  hardDelete: boolean = false
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Something\'s not working right. Try again in a bit?'
      };
    }

    if (hardDelete) {
      const { error } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`I couldn't delete that document. ${error.message}`);
      }
    } else {
      const { error } = await supabase
        .from('user_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', documentId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`I couldn't delete that document. ${error.message}`);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return {
      success: false,
      error: error.message || 'Document deletion isn\'t working. Try again?'
    };
  }
};

export const searchDocuments = async (
  userId: string,
  searchQuery: string,
  options?: {
    documentType?: 'office' | 'sheet' | 'block';
    limit?: number;
  }
): Promise<DocumentListResult> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having technical troubles. Give me a sec?'
      };
    }

    let query = supabase
      .from('user_documents')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .textSearch('title', searchQuery, {
        type: 'websearch',
        config: 'english'
      });

    if (options?.documentType) {
      query = query.eq('document_type', options.documentType);
    }

    query = query.order('updated_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`I couldn't search your documents. ${error.message}`);
    }

    return {
      success: true,
      documents: data as UserDocument[],
      totalCount: count || 0
    };
  } catch (error: any) {
    console.error('Error searching documents:', error);
    return {
      success: false,
      error: error.message || 'Document search isn\'t working. Try again?'
    };
  }
};

export const getDocumentVersions = async (
  documentId: string,
  userId: string
): Promise<DocumentVersionResult> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Something\'s acting up. Try again shortly?'
      };
    }

    const documentCheck = await supabase
      .from('user_documents')
      .select('id')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (documentCheck.error) {
      throw new Error('You don\'t have access to this document');
    }

    const { data, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .eq('document_type', 'document')
      .order('version_number', { ascending: false });

    if (error) {
      throw new Error(`I couldn't load version history. ${error.message}`);
    }

    return {
      success: true,
      versions: data as DocumentVersion[]
    };
  } catch (error: any) {
    console.error('Error getting document versions:', error);
    return {
      success: false,
      error: error.message || 'Version history isn\'t loading. Try again?'
    };
  }
};

export const restoreDocumentVersion = async (
  documentId: string,
  userId: string,
  versionNumber: number
): Promise<DocumentResult> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having issues. Give me a moment and try again?'
      };
    }

    const versionResult = await supabase
      .from('document_versions')
      .select('content_snapshot')
      .eq('document_id', documentId)
      .eq('document_type', 'document')
      .eq('version_number', versionNumber)
      .single();

    if (versionResult.error) {
      throw new Error(`I couldn't find that version. ${versionResult.error.message}`);
    }

    const snapshot = versionResult.data.content_snapshot;

    const { data, error } = await supabase
      .from('user_documents')
      .update({
        title: snapshot.title,
        content: snapshot.content,
        metadata: snapshot.metadata
      })
      .eq('id', documentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`I couldn't restore that version. ${error.message}`);
    }

    return {
      success: true,
      document: data as UserDocument
    };
  } catch (error: any) {
    console.error('Error restoring document version:', error);
    return {
      success: false,
      error: error.message || 'Version restore isn\'t working. Try again?'
    };
  }
};
