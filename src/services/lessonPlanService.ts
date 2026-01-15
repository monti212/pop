import { supabase } from './authService';
import { detectLessonPlan, generateLessonPlanFilename, LessonPlanData } from '../utils/lessonPlanDetection';

export interface LessonPlanSaveResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

const getLessonPlansFolderId = async (classId: string): Promise<string | null> => {
  try {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('class_folders')
      .select('id')
      .eq('class_id', classId)
      .eq('folder_type', 'lesson_plans')
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('Error finding lesson plans folder:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error in getLessonPlansFolderId:', error);
    return null;
  }
};

export const autoSaveLessonPlan = async (
  content: string,
  userId: string,
  classId: string,
  conversationId?: string,
  messageId?: string
): Promise<LessonPlanSaveResult> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Database connection unavailable'
      };
    }

    if (!classId) {
      return {
        success: false,
        error: 'Class ID is required to save lesson plan'
      };
    }

    const lessonPlan: LessonPlanData = detectLessonPlan(content);

    if (!lessonPlan.isLessonPlan || lessonPlan.confidence < 0.5) {
      return {
        success: false,
        error: 'Content does not appear to be a lesson plan'
      };
    }

    const filename = generateLessonPlanFilename(lessonPlan);
    const timestamp = Date.now();
    const storagePath = `${userId}/class-documents/${classId}/${timestamp}-${filename}`;

    const folderId = await getLessonPlansFolderId(classId);

    const metadata = {
      subject: lessonPlan.subject,
      gradeLevel: lessonPlan.gradeLevel,
      sections: lessonPlan.sections,
      detectionConfidence: lessonPlan.confidence,
      autoSaved: true,
      savedAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('class_documents')
      .insert({
        class_id: classId,
        folder_id: folderId,
        user_id: userId,
        title: lessonPlan.title,
        document_type: 'lesson_plan',
        content: lessonPlan.formattedContent,
        storage_path: storagePath,
        file_size: lessonPlan.formattedContent.length,
        metadata: metadata,
        tags: ['lesson-plan', 'auto-saved', 'ai-generated'],
        is_lesson_plan: true,
        lesson_plan_confidence: lessonPlan.confidence,
        lesson_plan_metadata: metadata,
        conversation_id: conversationId || null,
        message_id: messageId || null,
        auto_saved: true
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving lesson plan to database:', error);
      throw new Error(`Failed to save lesson plan: ${error.message}`);
    }

    const contentBlob = new Blob([lessonPlan.formattedContent], { type: 'text/markdown' });

    const { error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(storagePath, contentBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'text/markdown'
      });

    if (uploadError) {
      console.error('Error uploading lesson plan to storage:', uploadError);
      await supabase
        .from('class_documents')
        .delete()
        .eq('id', data.id);

      throw new Error(`Failed to upload lesson plan: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('user-files')
      .getPublicUrl(storagePath);

    await supabase
      .from('class_documents')
      .update({ file_url: publicUrl })
      .eq('id', data.id);

    return {
      success: true,
      documentId: data.id
    };
  } catch (error: any) {
    console.error('Error in autoSaveLessonPlan:', error);
    return {
      success: false,
      error: error.message || 'Failed to save lesson plan'
    };
  }
};

export const getClassLessonPlans = async (
  classId: string,
  limit?: number
): Promise<{ success: boolean; lessonPlans?: any[]; error?: string }> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Database connection unavailable'
      };
    }

    let query = supabase
      .from('class_documents')
      .select('*')
      .eq('class_id', classId)
      .eq('is_lesson_plan', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch lesson plans: ${error.message}`);
    }

    return {
      success: true,
      lessonPlans: data
    };
  } catch (error: any) {
    console.error('Error fetching lesson plans:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch lesson plans'
    };
  }
};

export const getUserLessonPlans = async (
  userId: string,
  limit?: number
): Promise<{ success: boolean; lessonPlans?: any[]; error?: string }> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Database connection unavailable'
      };
    }

    let query = supabase
      .from('class_documents')
      .select('*')
      .eq('user_id', userId)
      .eq('is_lesson_plan', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch lesson plans: ${error.message}`);
    }

    return {
      success: true,
      lessonPlans: data
    };
  } catch (error: any) {
    console.error('Error fetching lesson plans:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch lesson plans'
    };
  }
};

export const getLessonPlansByDate = async (
  userId: string
): Promise<{ success: boolean; groupedLessonPlans?: Record<string, any[]>; error?: string }> => {
  try {
    const result = await getUserLessonPlans(userId);

    if (!result.success || !result.lessonPlans) {
      return result;
    }

    const grouped: Record<string, any[]> = {};

    for (const plan of result.lessonPlans) {
      const dateKey = new Date(plan.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(plan);
    }

    return {
      success: true,
      groupedLessonPlans: grouped
    };
  } catch (error: any) {
    console.error('Error grouping lesson plans by date:', error);
    return {
      success: false,
      error: error.message || 'Failed to group lesson plans'
    };
  }
};

export const downloadLessonPlan = async (
  documentId: string,
  userId: string
): Promise<{ success: boolean; content?: string; filename?: string; error?: string }> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Database connection unavailable'
      };
    }

    const { data: doc, error: docError } = await supabase
      .from('class_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (docError || !doc) {
      throw new Error('Lesson plan not found');
    }

    if (doc.storage_path) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('user-files')
        .download(doc.storage_path);

      if (!downloadError && fileData) {
        const content = await fileData.text();
        return {
          success: true,
          content,
          filename: `${doc.title}.md`
        };
      }
    }

    if (doc.content) {
      return {
        success: true,
        content: doc.content,
        filename: `${doc.title}.md`
      };
    }

    throw new Error('No content available for this lesson plan');
  } catch (error: any) {
    console.error('Error downloading lesson plan:', error);
    return {
      success: false,
      error: error.message || 'Failed to download lesson plan'
    };
  }
};
