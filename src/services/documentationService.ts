import { supabase } from './authService';

export interface DocumentationPage {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category_id: string | null;
  parent_page_id: string | null;
  order_index: number;
  slug: string;
  icon: string;
  color: string;
  is_published: boolean;
  is_template: boolean;
  view_count: number;
  metadata: {
    tags?: string[];
    custom_fields?: Record<string, any>;
  };
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DocumentationCategory {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  order_index: number;
  parent_category_id: string | null;
  is_expanded: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  page_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  context_snapshot: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
}

export interface DocumentationActivity {
  id: string;
  page_id: string;
  user_id: string;
  action_type: 'view' | 'edit' | 'create' | 'delete' | 'share' | 'favorite' | 'comment';
  action_details: Record<string, any>;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  page_id: string;
  created_at: string;
}

export const getCategories = async (userId: string): Promise<DocumentationCategory[]> => {
  const { data, error } = await supabase
    .from('documentation_categories')
    .select('*')
    .eq('user_id', userId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const createCategory = async (category: Partial<DocumentationCategory>): Promise<DocumentationCategory> => {
  const { data, error } = await supabase
    .from('documentation_categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateCategory = async (id: string, updates: Partial<DocumentationCategory>): Promise<DocumentationCategory> => {
  const { data, error } = await supabase
    .from('documentation_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('documentation_categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const getPages = async (userId: string): Promise<DocumentationPage[]> => {
  const { data, error } = await supabase
    .from('documentation_pages')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getPageById = async (pageId: string): Promise<DocumentationPage | null> => {
  const { data, error } = await supabase
    .from('documentation_pages')
    .select('*')
    .eq('id', pageId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const getPageBySlug = async (slug: string): Promise<DocumentationPage | null> => {
  const { data, error } = await supabase
    .from('documentation_pages')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const createPage = async (page: Partial<DocumentationPage>): Promise<DocumentationPage> => {
  const { data, error } = await supabase
    .from('documentation_pages')
    .insert(page)
    .select()
    .single();

  if (error) throw error;

  if (data && page.user_id) {
    await logActivity(data.id, page.user_id, 'create', { title: data.title });
  }

  return data;
};

export const updatePage = async (id: string, updates: Partial<DocumentationPage>): Promise<DocumentationPage> => {
  const { data, error } = await supabase
    .from('documentation_pages')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (data) {
    await logActivity(id, data.user_id, 'edit', {
      title: data.title,
      fields_updated: Object.keys(updates)
    });
  }

  return data;
};

export const softDeletePage = async (id: string): Promise<void> => {
  const { data, error } = await supabase
    .from('documentation_pages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (data) {
    await logActivity(id, data.user_id, 'delete', { title: data.title });
  }
};

export const incrementViewCount = async (pageId: string): Promise<void> => {
  const { error } = await supabase.rpc('increment_page_view_count', {
    page_uuid: pageId
  });

  if (error) console.error('Error incrementing view count:', error);
};

export const searchPages = async (userId: string, query: string): Promise<DocumentationPage[]> => {
  const { data, error } = await supabase
    .from('documentation_pages')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order('view_count', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
};

export const getChatMessages = async (pageId: string): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from('documentation_chat_messages')
    .select('*')
    .eq('page_id', pageId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const createChatMessage = async (message: Partial<ChatMessage>): Promise<ChatMessage> => {
  const { data, error } = await supabase
    .from('documentation_chat_messages')
    .insert(message)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteChatMessage = async (messageId: string): Promise<void> => {
  const { error } = await supabase
    .from('documentation_chat_messages')
    .delete()
    .eq('id', messageId);

  if (error) throw error;
};

export const getRecentActivity = async (pageId: string, limit: number = 10): Promise<DocumentationActivity[]> => {
  const { data, error } = await supabase
    .from('documentation_activity')
    .select('*')
    .eq('page_id', pageId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

export const logActivity = async (
  pageId: string,
  userId: string,
  actionType: DocumentationActivity['action_type'],
  actionDetails: Record<string, any> = {}
): Promise<void> => {
  const { error } = await supabase.rpc('log_documentation_activity', {
    p_page_id: pageId,
    p_user_id: userId,
    p_action_type: actionType,
    p_action_details: actionDetails
  });

  if (error) console.error('Error logging activity:', error);
};

export const getFavorites = async (userId: string): Promise<DocumentationPage[]> => {
  const { data, error } = await supabase
    .from('documentation_favorites')
    .select(`
      page_id,
      documentation_pages (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data?.map((f: any) => (f as any).documentation_pages).filter(Boolean) || [];
};

export const addFavorite = async (userId: string, pageId: string): Promise<void> => {
  const { error } = await supabase
    .from('documentation_favorites')
    .insert({ user_id: userId, page_id: pageId });

  if (error) throw error;

  await logActivity(pageId, userId, 'favorite', {});
};

export const removeFavorite = async (userId: string, pageId: string): Promise<void> => {
  const { error } = await supabase
    .from('documentation_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('page_id', pageId);

  if (error) throw error;
};

export const getRecentPages = async (userId: string, limit: number = 5): Promise<DocumentationPage[]> => {
  const { data: activityData, error: activityError } = await supabase
    .from('documentation_activity')
    .select('page_id')
    .eq('user_id', userId)
    .eq('action_type', 'view')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (activityError) throw activityError;

  if (!activityData || activityData.length === 0) return [];

  const pageIds = [...new Set(activityData.map((a: any) => a.page_id))];

  const { data, error } = await supabase
    .from('documentation_pages')
    .select('*')
    .in('id', pageIds)
    .is('deleted_at', null);

  if (error) throw error;

  const pageMap = new Map(data?.map((p: any) => [p.id, p]) || []);
  return pageIds.map(id => pageMap.get(id)).filter(Boolean) as DocumentationPage[];
};

export const getPagesByUserId = async (userId: string): Promise<DocumentationPage[]> => {
  return getPages(userId);
};

export const getChatHistory = async (pageId: string): Promise<ChatMessage[]> => {
  return getChatMessages(pageId);
};

export const sendChatMessage = async (
  pageId: string,
  userId: string,
  content: string,
  contextSnapshot: Record<string, any>
): Promise<ChatMessage> => {
  await createChatMessage({
    page_id: pageId,
    user_id: userId,
    role: 'user',
    content,
    context_snapshot: contextSnapshot,
    metadata: {}
  });

  const assistantResponse = await createChatMessage({
    page_id: pageId,
    user_id: userId,
    role: 'assistant',
    content: 'I understand your question. This is a placeholder response. Integration with AI service is needed.',
    context_snapshot: contextSnapshot,
    metadata: {}
  });

  return assistantResponse;
};
