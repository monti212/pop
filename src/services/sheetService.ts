import { supabase } from './authService';

export interface UserSheet {
  id: string;
  user_id: string;
  title: string;
  sheet_data: {
    cells: Record<string, any>;
    formulas: Record<string, any>;
    [key: string]: any;
  };
  column_headers: string[];
  row_count: number;
  column_count: number;
  metadata: Record<string, any>;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface SheetVersion {
  id: string;
  document_id: string;
  document_type: 'document' | 'sheet';
  version_number: number;
  content_snapshot: Record<string, any>;
  change_summary?: string;
  created_by?: string;
  created_at: string;
}

export interface SheetResult {
  success: boolean;
  sheet?: UserSheet;
  error?: string;
}

export interface SheetListResult {
  success: boolean;
  sheets?: UserSheet[];
  totalCount?: number;
  error?: string;
}

export interface SheetVersionResult {
  success: boolean;
  versions?: SheetVersion[];
  error?: string;
}

export const createSheet = async (
  userId: string,
  title: string,
  options?: {
    sheetData?: Record<string, any>;
    columnHeaders?: string[];
    rowCount?: number;
    columnCount?: number;
    metadata?: Record<string, any>;
  }
): Promise<SheetResult> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having technical difficulties. Give me a moment?'
      };
    }

    const { data, error } = await supabase
      .from('user_sheets')
      .insert({
        user_id: userId,
        title: title || 'Untitled Sheet',
        sheet_data: options?.sheetData || { cells: {}, formulas: {} },
        column_headers: options?.columnHeaders || ['A'],
        row_count: options?.rowCount || 10,
        column_count: options?.columnCount || 10,
        metadata: options?.metadata || {}
      })
      .select()
      .single();

    if (error) {
      throw new Error(`I couldn't create that sheet. ${error.message}`);
    }

    return {
      success: true,
      sheet: data as UserSheet
    };
  } catch (error: any) {
    console.error('Error creating sheet:', error);
    return {
      success: false,
      error: error.message || 'Sheet creation isn\'t working right now. Try again?'
    };
  }
};

export const getSheet = async (
  sheetId: string,
  userId: string
): Promise<SheetResult> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having issues right now. Try again in a moment?'
      };
    }

    const { data, error } = await supabase
      .from('user_sheets')
      .select('*')
      .eq('id', sheetId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error) {
      throw new Error(`I couldn't find that sheet. ${error.message}`);
    }

    return {
      success: true,
      sheet: data as UserSheet
    };
  } catch (error: any) {
    console.error('Error getting sheet:', error);
    return {
      success: false,
      error: error.message || 'I couldn\'t load that sheet. Try again?'
    };
  }
};

export const getUserSheets = async (
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<SheetListResult> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Something\'s up on my end. Give me a moment?'
      };
    }

    let query = supabase
      .from('user_sheets')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (options?.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`I couldn't load your sheets. ${error.message}`);
    }

    return {
      success: true,
      sheets: data as UserSheet[],
      totalCount: count || 0
    };
  } catch (error: any) {
    console.error('Error getting user sheets:', error);
    return {
      success: false,
      error: error.message || 'Sheet list isn\'t loading. Try again?'
    };
  }
};

export const updateSheet = async (
  sheetId: string,
  userId: string,
  updates: {
    title?: string;
    sheet_data?: Record<string, any>;
    column_headers?: string[];
    row_count?: number;
    column_count?: number;
    metadata?: Record<string, any>;
  }
): Promise<SheetResult> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'I\'m having a moment. Try again shortly?'
      };
    }

    const { data, error } = await supabase
      .from('user_sheets')
      .update(updates)
      .eq('id', sheetId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      throw new Error(`I couldn't update that sheet. ${error.message}`);
    }

    return {
      success: true,
      sheet: data as UserSheet
    };
  } catch (error: any) {
    console.error('Error updating sheet:', error);
    return {
      success: false,
      error: error.message || 'Sheet update isn\'t working. Try again?'
    };
  }
};

export const deleteSheet = async (
  sheetId: string,
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
        .from('user_sheets')
        .delete()
        .eq('id', sheetId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`I couldn't delete that sheet. ${error.message}`);
      }
    } else {
      const { error } = await supabase
        .from('user_sheets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', sheetId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`I couldn't delete that sheet. ${error.message}`);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting sheet:', error);
    return {
      success: false,
      error: error.message || 'Sheet deletion isn\'t working. Try again?'
    };
  }
};

export const getSheetVersions = async (
  sheetId: string,
  userId: string
): Promise<SheetVersionResult> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Something\'s acting up. Try again shortly?'
      };
    }

    const sheetCheck = await supabase
      .from('user_sheets')
      .select('id')
      .eq('id', sheetId)
      .eq('user_id', userId)
      .single();

    if (sheetCheck.error) {
      throw new Error('You don\'t have access to this sheet');
    }

    const { data, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', sheetId)
      .eq('document_type', 'sheet')
      .order('version_number', { ascending: false });

    if (error) {
      throw new Error(`I couldn't load version history. ${error.message}`);
    }

    return {
      success: true,
      versions: data as SheetVersion[]
    };
  } catch (error: any) {
    console.error('Error getting sheet versions:', error);
    return {
      success: false,
      error: error.message || 'Version history isn\'t loading. Try again?'
    };
  }
};

export const restoreSheetVersion = async (
  sheetId: string,
  userId: string,
  versionNumber: number
): Promise<SheetResult> => {
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
      .eq('document_id', sheetId)
      .eq('document_type', 'sheet')
      .eq('version_number', versionNumber)
      .single();

    if (versionResult.error) {
      throw new Error(`I couldn't find that version. ${versionResult.error.message}`);
    }

    const snapshot = versionResult.data.content_snapshot;

    const { data, error } = await supabase
      .from('user_sheets')
      .update({
        title: snapshot.title,
        sheet_data: snapshot.sheet_data,
        column_headers: snapshot.column_headers,
        row_count: snapshot.row_count,
        column_count: snapshot.column_count,
        metadata: snapshot.metadata
      })
      .eq('id', sheetId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`I couldn't restore that version. ${error.message}`);
    }

    return {
      success: true,
      sheet: data as UserSheet
    };
  } catch (error: any) {
    console.error('Error restoring sheet version:', error);
    return {
      success: false,
      error: error.message || 'Version restore isn\'t working. Try again?'
    };
  }
};
