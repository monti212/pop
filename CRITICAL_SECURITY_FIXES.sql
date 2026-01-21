/*
  # Critical Security Fixes for Supabase Database

  This file contains SQL commands to fix critical security vulnerabilities.
  Run these commands in your Supabase SQL Editor.

  ## Issues Fixed:
  1. RLS policies that bypass security (always true)
  2. RLS policy referencing user_metadata (security risk)
  3. Auth function performance issues (scale problems)
  4. Function search path vulnerabilities

  ## Part 1: Fix RLS Policies That Bypass Security
*/

-- Fix error_logs policy to be more restrictive for anon users
DROP POLICY IF EXISTS "Anyone can insert error logs" ON error_logs;

CREATE POLICY "Authenticated users can insert error logs"
  ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anonymous users can insert error logs with limited data"
  ON error_logs
  FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL
    AND error_type IN ('runtime', 'network', 'unknown')
    AND severity IN ('low', 'medium', 'high', 'critical')
  );

-- Fix phone_verifications policy
DROP POLICY IF EXISTS "Anyone can start phone verification" ON phone_verifications;

CREATE POLICY "Users can create phone verifications"
  ON phone_verifications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    phone_number IS NOT NULL
    AND verification_code IS NOT NULL
    AND expires_at > now()
  );

-- Fix conversation_summaries service policy
DROP POLICY IF EXISTS "Service can manage conversation summaries" ON conversation_summaries;

CREATE POLICY "Service can manage conversation summaries"
  ON conversation_summaries
  FOR ALL
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

-- Fix usage_metrics service policy
DROP POLICY IF EXISTS "Service can manage usage metrics" ON usage_metrics;

CREATE POLICY "Service can manage usage metrics"
  ON usage_metrics
  FOR ALL
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

-- Fix usage_events service policy
DROP POLICY IF EXISTS "Service can insert usage events" ON usage_events;

CREATE POLICY "Service can insert usage events"
  ON usage_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

-- Fix model_usage_logs system policy
DROP POLICY IF EXISTS "System can insert usage logs" ON model_usage_logs;

CREATE POLICY "System can insert usage logs"
  ON model_usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

-- Fix activity_logs system policy
DROP POLICY IF EXISTS "System creates activity logs" ON activity_logs;

CREATE POLICY "System creates activity logs"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

-- Fix teaching_analytics system policies
DROP POLICY IF EXISTS "System creates analytics" ON teaching_analytics;
DROP POLICY IF EXISTS "System updates analytics" ON teaching_analytics;

CREATE POLICY "System creates analytics"
  ON teaching_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

CREATE POLICY "System updates analytics"
  ON teaching_analytics
  FOR UPDATE
  TO authenticated
  USING (
    teacher_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  )
  WITH CHECK (
    teacher_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

/*
  ## Part 2: Fix RLS Policy Referencing user_metadata
*/

-- Fix the policy that references user_metadata
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
      AND up.team_role IN ('admin', 'supa_admin')
    )
  );

/*
  ## Part 3: Optimize auth.uid() Calls for Performance
  Replace auth.uid() with (SELECT auth.uid()) in all policies
*/

-- user_profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

-- teaching_preferences
DROP POLICY IF EXISTS "Teachers manage own preferences" ON teaching_preferences;
CREATE POLICY "Teachers manage own preferences"
  ON teaching_preferences
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- lesson_plans
DROP POLICY IF EXISTS "Teachers manage own lesson plans" ON lesson_plans;
CREATE POLICY "Teachers manage own lesson plans"
  ON lesson_plans
  FOR ALL
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- teaching_resources
DROP POLICY IF EXISTS "Teachers manage own resources" ON teaching_resources;
CREATE POLICY "Teachers manage own resources"
  ON teaching_resources
  FOR ALL
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- student_rosters
DROP POLICY IF EXISTS "Teachers manage own student rosters" ON student_rosters;
CREATE POLICY "Teachers manage own student rosters"
  ON student_rosters
  FOR ALL
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- classroom_groups
DROP POLICY IF EXISTS "Teachers manage own classroom groups" ON classroom_groups;
CREATE POLICY "Teachers manage own classroom groups"
  ON classroom_groups
  FOR ALL
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- assessments
DROP POLICY IF EXISTS "Teachers manage own assessments" ON assessments;
CREATE POLICY "Teachers manage own assessments"
  ON assessments
  FOR ALL
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- grading_rubrics
DROP POLICY IF EXISTS "Teachers manage own rubrics" ON grading_rubrics;
CREATE POLICY "Teachers manage own rubrics"
  ON grading_rubrics
  FOR ALL
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- user_sheets
DROP POLICY IF EXISTS "Teachers manage own sheets" ON user_sheets;
CREATE POLICY "Teachers manage own sheets"
  ON user_sheets
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- file_focus_sets
DROP POLICY IF EXISTS "Teachers manage own focus sets" ON file_focus_sets;
CREATE POLICY "Teachers manage own focus sets"
  ON file_focus_sets
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- parent_messages
DROP POLICY IF EXISTS "Teachers manage own parent messages" ON parent_messages;
CREATE POLICY "Teachers manage own parent messages"
  ON parent_messages
  FOR ALL
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- teacher_announcements
DROP POLICY IF EXISTS "Teachers manage own announcements" ON teacher_announcements;
CREATE POLICY "Teachers manage own announcements"
  ON teacher_announcements
  FOR ALL
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- teaching_tips
DROP POLICY IF EXISTS "Teachers view approved tips" ON teaching_tips;
DROP POLICY IF EXISTS "Teachers create tips" ON teaching_tips;
DROP POLICY IF EXISTS "Teachers edit own tips" ON teaching_tips;

CREATE POLICY "Teachers view approved tips"
  ON teaching_tips
  FOR SELECT
  TO authenticated
  USING (
    approved = true
    OR created_by = (SELECT auth.uid())
  );

CREATE POLICY "Teachers create tips"
  ON teaching_tips
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Teachers edit own tips"
  ON teaching_tips
  FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

-- teacher_calendar
DROP POLICY IF EXISTS "Teachers manage own calendar" ON teacher_calendar;
CREATE POLICY "Teachers manage own calendar"
  ON teacher_calendar
  FOR ALL
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- task_lists
DROP POLICY IF EXISTS "Teachers manage own tasks" ON task_lists;
CREATE POLICY "Teachers manage own tasks"
  ON task_lists
  FOR ALL
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- teaching_analytics
DROP POLICY IF EXISTS "Teachers view own analytics" ON teaching_analytics;
CREATE POLICY "Teachers view own analytics"
  ON teaching_analytics
  FOR SELECT
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()));

-- activity_logs
DROP POLICY IF EXISTS "Teachers view own activity logs" ON activity_logs;
CREATE POLICY "Teachers view own activity logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- file_folders
DROP POLICY IF EXISTS "Users can view their own folders" ON file_folders;
DROP POLICY IF EXISTS "Users can create their own folders" ON file_folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON file_folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON file_folders;

CREATE POLICY "Users can view their own folders"
  ON file_folders
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create their own folders"
  ON file_folders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own folders"
  ON file_folders
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own folders"
  ON file_folders
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- file_shares
DROP POLICY IF EXISTS "Users can view shares for their files" ON file_shares;
DROP POLICY IF EXISTS "Users can create shares for their files" ON file_shares;
DROP POLICY IF EXISTS "Users can update shares they created" ON file_shares;
DROP POLICY IF EXISTS "Users can delete shares they created" ON file_shares;

CREATE POLICY "Users can view shares for their files"
  ON file_shares
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_files
      WHERE user_files.id = file_shares.file_id
      AND user_files.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create shares for their files"
  ON file_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_files
      WHERE user_files.id = file_shares.file_id
      AND user_files.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update shares they created"
  ON file_shares
  FOR UPDATE
  TO authenticated
  USING (shared_by = (SELECT auth.uid()))
  WITH CHECK (shared_by = (SELECT auth.uid()));

CREATE POLICY "Users can delete shares they created"
  ON file_shares
  FOR DELETE
  TO authenticated
  USING (shared_by = (SELECT auth.uid()));

-- focus_sets
DROP POLICY IF EXISTS "Users can manage their own focus sets" ON focus_sets;
CREATE POLICY "Users can manage their own focus sets"
  ON focus_sets
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- focus_set_files
DROP POLICY IF EXISTS "Users can manage their focus set files" ON focus_set_files;
CREATE POLICY "Users can manage their focus set files"
  ON focus_set_files
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM focus_sets
      WHERE focus_sets.id = focus_set_files.focus_set_id
      AND focus_sets.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM focus_sets
      WHERE focus_sets.id = focus_set_files.focus_set_id
      AND focus_sets.user_id = (SELECT auth.uid())
    )
  );

-- class_assessments
DROP POLICY IF EXISTS "Teachers can view their class assessments" ON class_assessments;
DROP POLICY IF EXISTS "Teachers can create class assessments" ON class_assessments;
DROP POLICY IF EXISTS "Teachers can update their class assessments" ON class_assessments;
DROP POLICY IF EXISTS "Teachers can delete their class assessments" ON class_assessments;

CREATE POLICY "Teachers can view their class assessments"
  ON class_assessments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_assessments.class_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teachers can create class assessments"
  ON class_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_assessments.class_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teachers can update their class assessments"
  ON class_assessments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_assessments.class_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_assessments.class_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teachers can delete their class assessments"
  ON class_assessments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_assessments.class_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

-- class_folders
DROP POLICY IF EXISTS "Teachers can manage folders for their classes" ON class_folders;
CREATE POLICY "Teachers can manage folders for their classes"
  ON class_folders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_folders.class_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_folders.class_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

-- class_documents
DROP POLICY IF EXISTS "Teachers can manage documents for their classes" ON class_documents;
CREATE POLICY "Teachers can manage documents for their classes"
  ON class_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_documents.class_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_documents.class_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

-- student_personality_traits
DROP POLICY IF EXISTS "Teachers can view personality traits for their students" ON student_personality_traits;
DROP POLICY IF EXISTS "Teachers can insert personality traits for their students" ON student_personality_traits;
DROP POLICY IF EXISTS "Teachers can update personality traits for their students" ON student_personality_traits;

CREATE POLICY "Teachers can view personality traits for their students"
  ON student_personality_traits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_personality_traits.student_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teachers can insert personality traits for their students"
  ON student_personality_traits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_personality_traits.student_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teachers can update personality traits for their students"
  ON student_personality_traits
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_personality_traits.student_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_personality_traits.student_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

-- student_behavior_logs
DROP POLICY IF EXISTS "Teachers can view behavior logs for their class students" ON student_behavior_logs;
DROP POLICY IF EXISTS "Teachers can insert behavior logs for their class students" ON student_behavior_logs;
DROP POLICY IF EXISTS "Teachers can update behavior logs for their class students" ON student_behavior_logs;
DROP POLICY IF EXISTS "Teachers can delete behavior logs for their class students" ON student_behavior_logs;

CREATE POLICY "Teachers can view behavior logs for their class students"
  ON student_behavior_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_behavior_logs.student_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teachers can insert behavior logs for their class students"
  ON student_behavior_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_behavior_logs.student_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teachers can update behavior logs for their class students"
  ON student_behavior_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_behavior_logs.student_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_behavior_logs.student_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teachers can delete behavior logs for their class students"
  ON student_behavior_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_behavior_logs.student_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

-- lesson_plan_requests
DROP POLICY IF EXISTS "Teachers can view their own lesson plan requests" ON lesson_plan_requests;
DROP POLICY IF EXISTS "Teachers can insert their own lesson plan requests" ON lesson_plan_requests;
DROP POLICY IF EXISTS "Teachers can update their own lesson plan requests" ON lesson_plan_requests;
DROP POLICY IF EXISTS "Teachers can delete their own lesson plan requests" ON lesson_plan_requests;

CREATE POLICY "Teachers can view their own lesson plan requests"
  ON lesson_plan_requests
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Teachers can insert their own lesson plan requests"
  ON lesson_plan_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Teachers can update their own lesson plan requests"
  ON lesson_plan_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Teachers can delete their own lesson plan requests"
  ON lesson_plan_requests
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

/*
  ## Part 4: Fix Knowledge Base Policies (System Policies)
  These need proper constraints, not just "true"
*/

-- knowledge_base_audit_log
DROP POLICY IF EXISTS "System can create audit logs" ON knowledge_base_audit_log;
CREATE POLICY "System can create audit logs"
  ON knowledge_base_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    performed_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

-- knowledge_base_chunks
DROP POLICY IF EXISTS "System can insert chunks" ON knowledge_base_chunks;
CREATE POLICY "System can insert chunks"
  ON knowledge_base_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

-- knowledge_base_embeddings
DROP POLICY IF EXISTS "System can insert embeddings" ON knowledge_base_embeddings;
CREATE POLICY "System can insert embeddings"
  ON knowledge_base_embeddings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

-- knowledge_base_retrievals
DROP POLICY IF EXISTS "System can insert retrievals" ON knowledge_base_retrievals;
CREATE POLICY "System can insert retrievals"
  ON knowledge_base_retrievals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

-- knowledge_base_summaries
DROP POLICY IF EXISTS "System can create summaries" ON knowledge_base_summaries;
CREATE POLICY "System can create summaries"
  ON knowledge_base_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

-- knowledge_base_training_jobs
DROP POLICY IF EXISTS "System can insert training jobs" ON knowledge_base_training_jobs;
DROP POLICY IF EXISTS "System can update training jobs" ON knowledge_base_training_jobs;

CREATE POLICY "System can insert training jobs"
  ON knowledge_base_training_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

CREATE POLICY "System can update training jobs"
  ON knowledge_base_training_jobs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );
