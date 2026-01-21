/*
  # Critical RLS Security and Performance Fixes
  
  1. Security Fixes
    - Fix user_profiles admin policy that checks user_metadata (CRITICAL - user can edit this!)
    - Use team_role column from database instead
  
  2. Performance Fixes
    - Wrap auth.uid() calls in SELECT for caching
    - Fixes performance degradation at scale
*/

-- CRITICAL SECURITY FIX: user_profiles admin policy
-- The old policy checked user_metadata which users can edit themselves!
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
      AND up.team_role IN ('admin', 'supa_admin')
    )
  );

-- Performance optimization - wrap auth.uid() in SELECT
-- teaching_tips
DROP POLICY IF EXISTS "Teachers view approved tips" ON teaching_tips;
CREATE POLICY "Teachers view approved tips"
  ON teaching_tips FOR SELECT TO authenticated
  USING (approved = true OR author_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Teachers create tips" ON teaching_tips;
CREATE POLICY "Teachers create tips"
  ON teaching_tips FOR INSERT TO authenticated
  WITH CHECK (author_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Teachers edit own tips" ON teaching_tips;
CREATE POLICY "Teachers edit own tips"
  ON teaching_tips FOR UPDATE TO authenticated
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

-- teaching_preferences
DROP POLICY IF EXISTS "Teachers manage own preferences" ON teaching_preferences;
CREATE POLICY "Teachers manage own preferences"
  ON teaching_preferences FOR ALL TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- lesson_plans
DROP POLICY IF EXISTS "Teachers manage own lesson plans" ON lesson_plans;
CREATE POLICY "Teachers manage own lesson plans"
  ON lesson_plans FOR ALL TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- teaching_resources
DROP POLICY IF EXISTS "Teachers manage own resources" ON teaching_resources;
CREATE POLICY "Teachers manage own resources"
  ON teaching_resources FOR ALL TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- assessments
DROP POLICY IF EXISTS "Teachers manage own assessments" ON assessments;
CREATE POLICY "Teachers manage own assessments"
  ON assessments FOR ALL TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- grading_rubrics
DROP POLICY IF EXISTS "Teachers manage own rubrics" ON grading_rubrics;
CREATE POLICY "Teachers manage own rubrics"
  ON grading_rubrics FOR ALL TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- user_sheets
DROP POLICY IF EXISTS "Teachers manage own sheets" ON user_sheets;
CREATE POLICY "Teachers manage own sheets"
  ON user_sheets FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- file_focus_sets
DROP POLICY IF EXISTS "Teachers manage own focus sets" ON file_focus_sets;
CREATE POLICY "Teachers manage own focus sets"
  ON file_focus_sets FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- teacher_calendar
DROP POLICY IF EXISTS "Teachers manage own calendar" ON teacher_calendar;
CREATE POLICY "Teachers manage own calendar"
  ON teacher_calendar FOR ALL TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- task_lists
DROP POLICY IF EXISTS "Teachers manage own tasks" ON task_lists;
CREATE POLICY "Teachers manage own tasks"
  ON task_lists FOR ALL TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- teaching_analytics
DROP POLICY IF EXISTS "Teachers view own analytics" ON teaching_analytics;
CREATE POLICY "Teachers view own analytics"
  ON teaching_analytics FOR SELECT TO authenticated
  USING (teacher_id = (SELECT auth.uid()));

-- activity_logs
DROP POLICY IF EXISTS "Teachers view own activity logs" ON activity_logs;
CREATE POLICY "Teachers view own activity logs"
  ON activity_logs FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- file_folders
DROP POLICY IF EXISTS "Users can view their own folders" ON file_folders;
DROP POLICY IF EXISTS "Users can create their own folders" ON file_folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON file_folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON file_folders;

CREATE POLICY "Users can view their own folders"
  ON file_folders FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create their own folders"
  ON file_folders FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own folders"
  ON file_folders FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own folders"
  ON file_folders FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- file_shares
DROP POLICY IF EXISTS "Users can view shares for their files" ON file_shares;
DROP POLICY IF EXISTS "Users can create shares for their files" ON file_shares;
DROP POLICY IF EXISTS "Users can update shares they created" ON file_shares;
DROP POLICY IF EXISTS "Users can delete shares they created" ON file_shares;

CREATE POLICY "Users can view shares for their files"
  ON file_shares FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_files
      WHERE user_files.id = file_shares.file_id
      AND user_files.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create shares for their files"
  ON file_shares FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_files
      WHERE user_files.id = file_shares.file_id
      AND user_files.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update shares they created"
  ON file_shares FOR UPDATE TO authenticated
  USING (shared_by = (SELECT auth.uid()))
  WITH CHECK (shared_by = (SELECT auth.uid()));

CREATE POLICY "Users can delete shares they created"
  ON file_shares FOR DELETE TO authenticated
  USING (shared_by = (SELECT auth.uid()));

-- focus_sets
DROP POLICY IF EXISTS "Users can manage their own focus sets" ON focus_sets;
CREATE POLICY "Users can manage their own focus sets"
  ON focus_sets FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- focus_set_files
DROP POLICY IF EXISTS "Users can manage their focus set files" ON focus_set_files;
CREATE POLICY "Users can manage their focus set files"
  ON focus_set_files FOR ALL TO authenticated
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
  ON class_assessments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_assessments.class_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teachers can create class assessments"
  ON class_assessments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_assessments.class_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teachers can update their class assessments"
  ON class_assessments FOR UPDATE TO authenticated
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
  ON class_assessments FOR DELETE TO authenticated
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
  ON class_folders FOR ALL TO authenticated
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
  ON class_documents FOR ALL TO authenticated
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
  ON student_personality_traits FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_personality_traits.student_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teachers can insert personality traits for their students"
  ON student_personality_traits FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_personality_traits.student_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teachers can update personality traits for their students"
  ON student_personality_traits FOR UPDATE TO authenticated
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
  ON student_behavior_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_behavior_logs.student_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teachers can insert behavior logs for their class students"
  ON student_behavior_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_behavior_logs.student_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teachers can update behavior logs for their class students"
  ON student_behavior_logs FOR UPDATE TO authenticated
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
  ON student_behavior_logs FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_behavior_logs.student_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

-- lesson_plan_requests (uses teacher_id)
DROP POLICY IF EXISTS "Teachers can view their own lesson plan requests" ON lesson_plan_requests;
DROP POLICY IF EXISTS "Teachers can insert their own lesson plan requests" ON lesson_plan_requests;
DROP POLICY IF EXISTS "Teachers can update their own lesson plan requests" ON lesson_plan_requests;
DROP POLICY IF EXISTS "Teachers can delete their own lesson plan requests" ON lesson_plan_requests;

CREATE POLICY "Teachers can view their own lesson plan requests"
  ON lesson_plan_requests FOR SELECT TO authenticated
  USING (teacher_id = (SELECT auth.uid()));

CREATE POLICY "Teachers can insert their own lesson plan requests"
  ON lesson_plan_requests FOR INSERT TO authenticated
  WITH CHECK (teacher_id = (SELECT auth.uid()));

CREATE POLICY "Teachers can update their own lesson plan requests"
  ON lesson_plan_requests FOR UPDATE TO authenticated
  USING (teacher_id = (SELECT auth.uid()))
  WITH CHECK (teacher_id = (SELECT auth.uid()));

CREATE POLICY "Teachers can delete their own lesson plan requests"
  ON lesson_plan_requests FOR DELETE TO authenticated
  USING (teacher_id = (SELECT auth.uid()));