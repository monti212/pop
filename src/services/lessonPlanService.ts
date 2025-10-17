import { supabase } from './authService';
import { detectLessonPlan, generateLessonPlanFilename, getDateFolderPath, LessonPlanData } from '../utils/lessonPlanDetection';

export interface LessonPlanSaveResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

/**
 * Auto-save a lesson plan to U Files
 * Creates date-based folder structure and saves with proper metadata
 */
export const autoSaveLessonPlan = async (
  content: string,
  userId: string,
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

    // Detect and analyze lesson plan
    const lessonPlan: LessonPlanData = detectLessonPlan(content);

    // Only save if confidence is high enough
    if (!lessonPlan.isLessonPlan || lessonPlan.confidence < 0.5) {
      return {
        success: false,
        error: 'Content does not appear to be a lesson plan'
      };
    }

    // Get date folder path
    const dateFolderPath = getDateFolderPath();

    // Generate filename
    const filename = generateLessonPlanFilename(lessonPlan);

    // Prepare metadata
    const metadata = {
      subject: lessonPlan.subject,
      gradeLevel: lessonPlan.gradeLevel,
      sections: lessonPlan.sections,
      detectionConfidence: lessonPlan.confidence,
      autoSaved: true,
      savedAt: new Date().toISOString()
    };

    // Save to user_documents table
    const { data, error } = await supabase
      .from('user_documents')
      .insert({
        user_id: userId,
        title: lessonPlan.title,
        file_name: filename,
        file_type: 'text/markdown',
        file_size: lessonPlan.formattedContent.length,
        content_preview: lessonPlan.formattedContent.substring(0, 500),
        storage_path: `${userId}/lesson-plans/${dateFolderPath}/${filename}`,
        tags: ['lesson-plan', 'auto-saved'],
        metadata: metadata,
        is_lesson_plan: true,
        lesson_plan_confidence: lessonPlan.confidence,
        lesson_plan_metadata: metadata,
        conversation_id: conversationId || null,
        message_id: messageId || null,
        auto_saved: true,
        date_folder: dateFolderPath
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving lesson plan to database:', error);
      throw new Error(`Failed to save lesson plan: ${error.message}`);
    }

    // Save the actual content to Supabase Storage
    const contentBlob = new Blob([lessonPlan.formattedContent], { type: 'text/markdown' });
    const storagePath = `${userId}/lesson-plans/${dateFolderPath}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(storagePath, contentBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'text/markdown'
      });

    if (uploadError) {
      console.error('Error uploading lesson plan to storage:', uploadError);
      // Delete the database record if upload fails
      await supabase
        .from('user_documents')
        .delete()
        .eq('id', data.id);

      throw new Error(`Failed to upload lesson plan: ${uploadError.message}`);
    }

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

/**
 * Get lesson plans for a user, organized by date
 */
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
      .from('user_documents')
      .select('*')
      .eq('user_id', userId)
      .eq('is_lesson_plan', true)
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

/**
 * Get lesson plans grouped by date folder
 */
export const getLessonPlansByDate = async (
  userId: string
): Promise<{ success: boolean; groupedLessonPlans?: Record<string, any[]>; error?: string }> => {
  try {
    const result = await getUserLessonPlans(userId);

    if (!result.success || !result.lessonPlans) {
      return result;
    }

    // Group by date folder
    const grouped: Record<string, any[]> = {};

    for (const plan of result.lessonPlans) {
      const dateFolder = plan.date_folder || 'Other';
      if (!grouped[dateFolder]) {
        grouped[dateFolder] = [];
      }
      grouped[dateFolder].push(plan);
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

/**
 * Download a lesson plan as markdown file
 */
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

    // Get document metadata
    const { data: doc, error: docError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (docError || !doc) {
      throw new Error('Lesson plan not found');
    }

    // Download content from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('user-files')
      .download(doc.storage_path);

    if (downloadError) {
      throw new Error(`Failed to download lesson plan: ${downloadError.message}`);
    }

    // Convert blob to text
    const content = await fileData.text();

    return {
      success: true,
      content,
      filename: doc.file_name
    };
  } catch (error: any) {
    console.error('Error downloading lesson plan:', error);
    return {
      success: false,
      error: error.message || 'Failed to download lesson plan'
    };
  }
};
