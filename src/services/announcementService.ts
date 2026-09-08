import { supabase } from './authService';

export type TeacherAnnouncementStatus = 'draft' | 'published' | 'archived';
export type TeacherAnnouncementPriority = 'normal' | 'high';

export interface TeacherAnnouncement {
  id: string;
  title: string;
  body: string;
  status: TeacherAnnouncementStatus;
  priority: TeacherAnnouncementPriority;
  published_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherAnnouncementInput {
  title: string;
  body: string;
  status: TeacherAnnouncementStatus;
  priority: TeacherAnnouncementPriority;
  expires_at?: string | null;
}

const isSchemaMismatch = (error: any) => {
  const message = String(error?.message || error?.details || error?.hint || '');
  return error?.code === 'PGRST204'
    || /schema cache|column .* does not exist|could not find .* column/i.test(message);
};

const normalizeAnnouncement = (row: any): TeacherAnnouncement => ({
  id: row.id,
  title: row.title || '',
  body: row.body || row.content || '',
  status: row.status === 'scheduled' ? 'draft' : (row.status || 'draft'),
  priority: row.priority || (row.announcement_type === 'urgent' ? 'high' : 'normal'),
  published_at: row.published_at || row.published_date || null,
  expires_at: row.expires_at || null,
  created_by: row.created_by || row.teacher_id || null,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const getCurrentUserId = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
};

const isAnnouncementVisible = (announcement: TeacherAnnouncement) => {
  if (announcement.status !== 'published') return false;

  const now = Date.now();
  if (announcement.published_at && new Date(announcement.published_at).getTime() > now) {
    return false;
  }
  if (announcement.expires_at && new Date(announcement.expires_at).getTime() < now) {
    return false;
  }

  return true;
};

export const getPublishedTeacherAnnouncements = async (): Promise<{
  success: boolean;
  announcements?: TeacherAnnouncement[];
  error?: string;
}> => {
  try {
    let { data, error } = await supabase
      .from('teacher_announcements')
      .select('*')
      .eq('status', 'published')
      .order('priority', { ascending: true })
      .order('published_at', { ascending: false });

    if (error && isSchemaMismatch(error)) {
      const fallback = await supabase
        .from('teacher_announcements')
        .select('*')
        .eq('status', 'published')
        .order('published_date', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

    return {
      success: true,
      announcements: (data || []).map(normalizeAnnouncement).filter(isAnnouncementVisible),
    };
  } catch (error: any) {
    console.error('Error fetching teacher announcements:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch teacher announcements',
    };
  }
};

export const getAdminTeacherAnnouncements = async (): Promise<{
  success: boolean;
  announcements?: TeacherAnnouncement[];
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('teacher_announcements')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      announcements: (data || []).map(normalizeAnnouncement),
    };
  } catch (error: any) {
    console.error('Error fetching admin teacher announcements:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch teacher announcements',
    };
  }
};

export const createTeacherAnnouncement = async (
  input: TeacherAnnouncementInput
): Promise<{ success: boolean; announcement?: TeacherAnnouncement; error?: string }> => {
  try {
    const publishedAt = input.status === 'published' ? new Date().toISOString() : null;
    let { data, error } = await supabase
      .from('teacher_announcements')
      .insert({
        ...input,
        expires_at: input.expires_at || null,
        published_at: publishedAt,
      })
      .select()
      .single();

    if (error && isSchemaMismatch(error)) {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Please sign in again before creating announcements.');

      const fallback = await supabase
        .from('teacher_announcements')
        .insert({
          teacher_id: userId,
          title: input.title,
          content: input.body,
          announcement_type: input.priority === 'high' ? 'urgent' : 'general',
          target_audience: 'school',
          status: input.status,
          published_date: publishedAt,
        })
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

    return { success: true, announcement: normalizeAnnouncement(data) };
  } catch (error: any) {
    console.error('Error creating teacher announcement:', error);
    return {
      success: false,
      error: error.message || 'Failed to create teacher announcement',
    };
  }
};

export const updateTeacherAnnouncement = async (
  id: string,
  input: Partial<TeacherAnnouncementInput>
): Promise<{ success: boolean; announcement?: TeacherAnnouncement; error?: string }> => {
  try {
    const updates: Record<string, any> = { ...input };
    if (input.expires_at === '') updates.expires_at = null;
    if (input.status === 'published') updates.published_at = new Date().toISOString();
    if (input.status && input.status !== 'published') updates.published_at = null;

    let { data, error } = await supabase
      .from('teacher_announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error && isSchemaMismatch(error)) {
      const legacyUpdates: Record<string, any> = {};
      if (input.title !== undefined) legacyUpdates.title = input.title;
      if (input.body !== undefined) legacyUpdates.content = input.body;
      if (input.priority !== undefined) legacyUpdates.announcement_type = input.priority === 'high' ? 'urgent' : 'general';
      if (input.status !== undefined) legacyUpdates.status = input.status;
      if (input.status === 'published') legacyUpdates.published_date = updates.published_at;
      if (input.status && input.status !== 'published') legacyUpdates.published_date = null;

      const fallback = await supabase
        .from('teacher_announcements')
        .update(legacyUpdates)
        .eq('id', id)
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

    return { success: true, announcement: normalizeAnnouncement(data) };
  } catch (error: any) {
    console.error('Error updating teacher announcement:', error);
    return {
      success: false,
      error: error.message || 'Failed to update teacher announcement',
    };
  }
};

export const deleteTeacherAnnouncement = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('teacher_announcements')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting teacher announcement:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete teacher announcement',
    };
  }
};
