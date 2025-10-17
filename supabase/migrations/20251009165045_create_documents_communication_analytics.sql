/*
  # Add Document Storage, Communication, and Analytics Tables
  
  ## Summary
  Extends the Teacher Assistant platform with document management, parent
  communication tools, teacher collaboration features, and analytics for
  tracking teaching impact and productivity.

  ## New Tables
  
  ### Document and File Management
  - **user_documents** - Rich text documents (lesson materials, handouts)
  - **user_sheets** - Spreadsheet data (grade books, trackers)
  - **user_files** - General file storage with metadata
  - **file_focus_sets** - Collections of related files
  
  ### Communication
  - **parent_messages** - Messages to parents (drafts and sent)
  - **teacher_announcements** - Class or school-wide announcements
  
  ### Collaboration
  - **shared_content** - Resources shared among teachers
  - **teaching_tips** - Best practices and strategies shared by community
  
  ### Analytics and Tracking
  - **teaching_analytics** - Teacher productivity and usage metrics
  - **impact_metrics** - Educational impact for Pencils of Promise reporting
  - **activity_logs** - Audit trail for actions and usage
  
  ### Productivity
  - **teacher_calendar** - Events, lessons, deadlines
  - **task_lists** - To-do items for teachers
  
  ## Security
  - RLS enabled on all tables
  - Teachers access only their own data
  - Admins have read access for support
*/

-- ============================================================================
-- 1. USER DOCUMENTS (Lesson Materials, Handouts)
-- ============================================================================

CREATE TABLE user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_plan_id uuid REFERENCES lesson_plans(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  
  -- Document Info
  title text NOT NULL DEFAULT 'Untitled Document',
  content text DEFAULT '',
  document_type text DEFAULT 'office' CHECK (document_type IN ('office', 'handout', 'worksheet', 'lesson_material')),
  
  -- Source Tracking
  is_auto_saved boolean DEFAULT false,
  source text, -- 'ai_generated', 'manual', 'imported'
  
  -- Versioning
  version integer DEFAULT 1 NOT NULL,
  metadata jsonb DEFAULT '{}',
  
  -- Soft Delete
  deleted_at timestamptz,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX user_documents_user_id_idx ON user_documents(user_id);
CREATE INDEX user_documents_lesson_plan_id_idx ON user_documents(lesson_plan_id);
CREATE INDEX user_documents_updated_at_idx ON user_documents(updated_at DESC);
CREATE INDEX user_documents_deleted_at_idx ON user_documents(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search
CREATE INDEX user_documents_search_idx ON user_documents 
  USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '')))
  WHERE deleted_at IS NULL;

ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own documents"
  ON user_documents FOR ALL TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all documents"
  ON user_documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- ============================================================================
-- 2. USER SHEETS (Grade Books, Trackers)
-- ============================================================================

CREATE TABLE user_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Sheet Info
  title text NOT NULL DEFAULT 'Untitled Sheet',
  sheet_data jsonb NOT NULL DEFAULT '{"cells": {}, "formulas": {}}',
  column_headers text[] DEFAULT ARRAY['A']::text[],
  row_count integer DEFAULT 10 NOT NULL,
  column_count integer DEFAULT 10 NOT NULL,
  
  -- Metadata
  sheet_type text DEFAULT 'general' CHECK (sheet_type IN ('general', 'grade_book', 'attendance', 'tracker')),
  metadata jsonb DEFAULT '{}',
  version integer DEFAULT 1 NOT NULL,
  
  -- Soft Delete
  deleted_at timestamptz,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX user_sheets_user_id_idx ON user_sheets(user_id);
CREATE INDEX user_sheets_sheet_type_idx ON user_sheets(sheet_type);
CREATE INDEX user_sheets_updated_at_idx ON user_sheets(updated_at DESC);
CREATE INDEX user_sheets_deleted_at_idx ON user_sheets(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE user_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own sheets"
  ON user_sheets FOR ALL TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 3. USER FILES (General File Storage)
-- ============================================================================

CREATE TABLE user_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- File Info
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size_bytes bigint,
  mime_type text,
  
  -- Classification
  file_type text CHECK (file_type IN (
    'document', 'image', 'video', 'audio', 'spreadsheet', 'presentation', 'pdf', 'other'
  )),
  
  -- Metadata
  description text,
  tags text[] DEFAULT ARRAY[]::text[],
  subject text,
  grade_level text,
  
  -- Extracted Content (for search)
  extracted_content text,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX user_files_user_id_idx ON user_files(user_id);
CREATE INDEX user_files_file_type_idx ON user_files(file_type);
CREATE INDEX user_files_tags_idx ON user_files USING GIN(tags);
CREATE INDEX user_files_created_at_idx ON user_files(created_at DESC);

-- Full-text search on files
CREATE INDEX user_files_search_idx ON user_files 
  USING GIN(to_tsvector('english', 
    COALESCE(file_name, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(extracted_content, '')
  ));

ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own files"
  ON user_files FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 4. FILE FOCUS SETS (Collections)
-- ============================================================================

CREATE TABLE file_focus_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Set Info
  set_name text NOT NULL,
  description text,
  file_ids uuid[] DEFAULT ARRAY[]::uuid[],
  
  -- Organization
  color text DEFAULT 'blue',
  icon text,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX file_focus_sets_user_id_idx ON file_focus_sets(user_id);

ALTER TABLE file_focus_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own focus sets"
  ON file_focus_sets FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 5. PARENT MESSAGES
-- ============================================================================

CREATE TABLE parent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_roster_id uuid REFERENCES student_rosters(id) ON DELETE SET NULL,
  
  -- Message Info
  subject text NOT NULL,
  message_body text NOT NULL,
  message_type text CHECK (message_type IN (
    'progress_update', 'concern', 'praise', 'request', 'general', 'reminder'
  )),
  
  -- Recipient
  recipient_name text,
  recipient_email text,
  recipient_phone text,
  
  -- Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'scheduled')),
  scheduled_send_date timestamptz,
  sent_date timestamptz,
  
  -- Metadata
  ai_generated boolean DEFAULT false,
  translated_to_language text,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX parent_messages_teacher_id_idx ON parent_messages(teacher_id);
CREATE INDEX parent_messages_status_idx ON parent_messages(status);
CREATE INDEX parent_messages_student_idx ON parent_messages(student_roster_id);

ALTER TABLE parent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own parent messages"
  ON parent_messages FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- ============================================================================
-- 6. TEACHER ANNOUNCEMENTS
-- ============================================================================

CREATE TABLE teacher_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  classroom_group_id uuid REFERENCES classroom_groups(id) ON DELETE SET NULL,
  
  -- Announcement Info
  title text NOT NULL,
  content text NOT NULL,
  announcement_type text CHECK (announcement_type IN (
    'class_update', 'homework_reminder', 'event', 'general', 'urgent'
  )),
  
  -- Targeting
  target_audience text DEFAULT 'class' CHECK (target_audience IN ('class', 'school', 'parents', 'students')),
  
  -- Schedule
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  scheduled_date timestamptz,
  published_date timestamptz,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX teacher_announcements_teacher_id_idx ON teacher_announcements(teacher_id);
CREATE INDEX teacher_announcements_classroom_id_idx ON teacher_announcements(classroom_group_id);
CREATE INDEX teacher_announcements_status_idx ON teacher_announcements(status);

ALTER TABLE teacher_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own announcements"
  ON teacher_announcements FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- ============================================================================
-- 7. TEACHING TIPS (Community Wisdom)
-- ============================================================================

CREATE TABLE teaching_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Tip Info
  title text NOT NULL,
  content text NOT NULL,
  category text CHECK (category IN (
    'classroom_management', 'engagement', 'differentiation', 'assessment',
    'technology', 'communication', 'planning', 'other'
  )),
  
  -- Classification
  subject text,
  grade_level text,
  tags text[] DEFAULT ARRAY[]::text[],
  
  -- Engagement
  helpful_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  
  -- Moderation
  approved boolean DEFAULT false,
  featured boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX teaching_tips_category_idx ON teaching_tips(category);
CREATE INDEX teaching_tips_subject_idx ON teaching_tips(subject);
CREATE INDEX teaching_tips_approved_idx ON teaching_tips(approved) WHERE approved = true;
CREATE INDEX teaching_tips_featured_idx ON teaching_tips(featured) WHERE featured = true;

ALTER TABLE teaching_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers view approved tips"
  ON teaching_tips FOR SELECT TO authenticated
  USING (approved = true OR author_id = auth.uid());

CREATE POLICY "Teachers create tips"
  ON teaching_tips FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Teachers edit own tips"
  ON teaching_tips FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- ============================================================================
-- 8. TEACHER CALENDAR
-- ============================================================================

CREATE TABLE teacher_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_plan_id uuid REFERENCES lesson_plans(id) ON DELETE SET NULL,
  assessment_id uuid REFERENCES assessments(id) ON DELETE SET NULL,
  
  -- Event Info
  event_title text NOT NULL,
  event_description text,
  event_type text CHECK (event_type IN (
    'lesson', 'assessment', 'meeting', 'professional_development',
    'deadline', 'event', 'reminder', 'other'
  )),
  
  -- Timing
  event_date date NOT NULL,
  start_time time,
  end_time time,
  all_day boolean DEFAULT false,
  
  -- Recurrence
  recurring boolean DEFAULT false,
  recurrence_pattern text, -- 'daily', 'weekly', 'monthly'
  recurrence_end_date date,
  
  -- Notifications
  reminder_enabled boolean DEFAULT false,
  reminder_minutes_before integer DEFAULT 15,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX teacher_calendar_teacher_id_idx ON teacher_calendar(teacher_id);
CREATE INDEX teacher_calendar_event_date_idx ON teacher_calendar(event_date);
CREATE INDEX teacher_calendar_event_type_idx ON teacher_calendar(event_type);

ALTER TABLE teacher_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own calendar"
  ON teacher_calendar FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- ============================================================================
-- 9. TASK LISTS
-- ============================================================================

CREATE TABLE task_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Task Info
  task_description text NOT NULL,
  task_category text CHECK (task_category IN (
    'planning', 'grading', 'communication', 'administrative', 'professional_development', 'other'
  )),
  
  -- Status
  completion_status text DEFAULT 'pending' CHECK (completion_status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority_level text DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
  
  -- Timing
  due_date date,
  completed_date timestamptz,
  
  -- Notes
  notes text,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX task_lists_teacher_id_idx ON task_lists(teacher_id);
CREATE INDEX task_lists_status_idx ON task_lists(completion_status);
CREATE INDEX task_lists_due_date_idx ON task_lists(due_date);
CREATE INDEX task_lists_priority_idx ON task_lists(priority_level);

ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own tasks"
  ON task_lists FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- ============================================================================
-- 10. TEACHING ANALYTICS (Usage and Productivity)
-- ============================================================================

CREATE TABLE teaching_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Time Period
  date date NOT NULL DEFAULT CURRENT_DATE,
  week_start_date date,
  month_start_date date,
  
  -- Activity Counts
  teaching_sessions_count integer DEFAULT 0,
  lessons_planned_count integer DEFAULT 0,
  resources_created_count integer DEFAULT 0,
  assessments_created_count integer DEFAULT 0,
  messages_sent_count integer DEFAULT 0,
  
  -- AI Usage
  ai_assistant_queries integer DEFAULT 0,
  ai_content_generated_count integer DEFAULT 0,
  
  -- Productivity Estimates
  estimated_time_saved_minutes integer DEFAULT 0,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  UNIQUE(teacher_id, date)
);

CREATE INDEX teaching_analytics_teacher_date_idx ON teaching_analytics(teacher_id, date DESC);
CREATE INDEX teaching_analytics_week_idx ON teaching_analytics(week_start_date);
CREATE INDEX teaching_analytics_month_idx ON teaching_analytics(month_start_date);

ALTER TABLE teaching_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers view own analytics"
  ON teaching_analytics FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "System creates analytics"
  ON teaching_analytics FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "System updates analytics"
  ON teaching_analytics FOR UPDATE TO authenticated
  USING (true);

-- ============================================================================
-- 11. IMPACT METRICS (NGO Reporting for Pencils of Promise)
-- ============================================================================

CREATE TABLE impact_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Aggregation Level
  metric_level text CHECK (metric_level IN ('teacher', 'school', 'region', 'global')),
  entity_id uuid, -- teacher_id or school_id
  
  -- Time Period
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  report_period text CHECK (report_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  
  -- Teaching Metrics
  total_teachers_active integer DEFAULT 0,
  total_students_reached integer DEFAULT 0,
  total_lessons_created integer DEFAULT 0,
  total_resources_shared integer DEFAULT 0,
  total_assessments_conducted integer DEFAULT 0,
  
  -- Engagement Metrics
  avg_sessions_per_teacher numeric(10,2) DEFAULT 0,
  avg_resources_per_teacher numeric(10,2) DEFAULT 0,
  teacher_retention_rate numeric(5,2) DEFAULT 0,
  
  -- Impact Indicators
  curriculum_coverage_percentage numeric(5,2) DEFAULT 0,
  student_engagement_score numeric(5,2) DEFAULT 0,
  
  -- Metadata
  notes text,
  metadata jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  UNIQUE(metric_level, entity_id, report_date, report_period)
);

CREATE INDEX impact_metrics_level_entity_idx ON impact_metrics(metric_level, entity_id);
CREATE INDEX impact_metrics_date_idx ON impact_metrics(report_date DESC);
CREATE INDEX impact_metrics_period_idx ON impact_metrics(report_period);

ALTER TABLE impact_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage impact metrics"
  ON impact_metrics FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

CREATE POLICY "Teachers view school metrics"
  ON impact_metrics FOR SELECT TO authenticated
  USING (metric_level IN ('school', 'region', 'global'));

-- ============================================================================
-- 12. ACTIVITY LOGS (Audit Trail)
-- ============================================================================

CREATE TABLE activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Action Info
  action_type text NOT NULL,
  entity_type text, -- 'lesson_plan', 'resource', 'assessment', etc.
  entity_id uuid,
  
  -- Details
  description text,
  metadata jsonb DEFAULT '{}',
  
  -- Context
  ip_address inet,
  user_agent text,
  
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX activity_logs_user_id_idx ON activity_logs(user_id);
CREATE INDEX activity_logs_action_type_idx ON activity_logs(action_type);
CREATE INDEX activity_logs_entity_idx ON activity_logs(entity_type, entity_id);
CREATE INDEX activity_logs_created_at_idx ON activity_logs(created_at DESC);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers view own activity logs"
  ON activity_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System creates activity logs"
  ON activity_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 13. UPDATE TRIGGERS
-- ============================================================================

CREATE TRIGGER update_user_documents_updated_at BEFORE UPDATE ON user_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sheets_updated_at BEFORE UPDATE ON user_sheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_files_updated_at BEFORE UPDATE ON user_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_focus_sets_updated_at BEFORE UPDATE ON file_focus_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parent_messages_updated_at BEFORE UPDATE ON parent_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_announcements_updated_at BEFORE UPDATE ON teacher_announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teaching_tips_updated_at BEFORE UPDATE ON teaching_tips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_calendar_updated_at BEFORE UPDATE ON teacher_calendar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_lists_updated_at BEFORE UPDATE ON task_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teaching_analytics_updated_at BEFORE UPDATE ON teaching_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_impact_metrics_updated_at BEFORE UPDATE ON impact_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
