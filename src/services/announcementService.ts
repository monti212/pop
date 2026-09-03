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
    const { data, error } = await supabase
      .from('teacher_announcements')
      .select('*')
      .eq('status', 'published')
      .order('priority', { ascending: true })
      .order('published_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      announcements: (data || []).filter(isAnnouncementVisible),
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
      announcements: data || [],
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
    const { data, error } = await supabase
      .from('teacher_announcements')
      .insert({
        ...input,
        expires_at: input.expires_at || null,
        published_at: input.status === 'published' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, announcement: data };
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

    const { data, error } = await supabase
      .from('teacher_announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, announcement: data };
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
