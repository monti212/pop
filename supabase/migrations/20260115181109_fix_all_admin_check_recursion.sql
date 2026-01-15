/*
  # Fix Admin Check Recursion Across All Tables

  1. Problem
    - Many policies check admin status by querying user_profiles
    - This creates recursion since user_profiles policies also check admin status

  2. Solution
    - Create a helper function that checks admin status from JWT
    - Use this function instead of querying user_profiles
    - Prevents recursion and improves performance
*/

-- Create helper function to check if user is admin without querying user_profiles
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'team_role'),
    (auth.jwt() -> 'app_metadata' ->> 'team_role'),
    ''
  ) IN ('supa_admin', 'admin');
$$;

-- Create helper function to check if user is supa_admin
CREATE OR REPLACE FUNCTION is_supa_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'team_role'),
    (auth.jwt() -> 'app_metadata' ->> 'team_role'),
    ''
  ) = 'supa_admin';
$$;

-- Update conversations policies
DROP POLICY IF EXISTS "Admins can view all conversations" ON conversations;
CREATE POLICY "Admins can view all conversations" ON conversations
  FOR SELECT TO authenticated
  USING (is_admin() OR user_id = (select auth.uid()));

-- Update messages policies
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
CREATE POLICY "Admins can view all messages" ON messages
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = (select auth.uid())
    )
  );

-- Update classes policies
DROP POLICY IF EXISTS "Admins can view all classes" ON classes;
CREATE POLICY "Admins can view all classes" ON classes
  FOR SELECT TO authenticated
  USING (is_admin() OR teacher_id = (select auth.uid()));

-- Update students policies
DROP POLICY IF EXISTS "Admins can view all students" ON students;
CREATE POLICY "Admins can view all students" ON students
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = students.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

-- Update attendance_records policies
DROP POLICY IF EXISTS "Admins can view all attendance records" ON attendance_records;
CREATE POLICY "Admins can view all attendance records" ON attendance_records
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = attendance_records.student_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

-- Update user_documents policies
DROP POLICY IF EXISTS "Admins view all documents" ON user_documents;
CREATE POLICY "Admins view all documents" ON user_documents
  FOR SELECT TO authenticated
  USING (is_admin() OR user_id = (select auth.uid()));

-- Update file_folders policies
DROP POLICY IF EXISTS "Admins can view all folders" ON file_folders;
CREATE POLICY "Admins can view all folders" ON file_folders
  FOR SELECT TO authenticated
  USING (is_admin() OR user_id = (select auth.uid()));

-- Update focus_sets policies
DROP POLICY IF EXISTS "Admins can view all focus sets" ON focus_sets;
CREATE POLICY "Admins can view all focus sets" ON focus_sets
  FOR SELECT TO authenticated
  USING (is_admin() OR user_id = (select auth.uid()));

-- Update class_folders policies
DROP POLICY IF EXISTS "Admins can view all class folders" ON class_folders;
CREATE POLICY "Admins can view all class folders" ON class_folders
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_folders.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

-- Update class_documents policies
DROP POLICY IF EXISTS "Admins can view all class documents" ON class_documents;
CREATE POLICY "Admins can view all class documents" ON class_documents
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_documents.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

-- Update conversation_summaries policies
DROP POLICY IF EXISTS "Admins can view all conversation summaries" ON conversation_summaries;
CREATE POLICY "Admins can view all conversation summaries" ON conversation_summaries
  FOR SELECT TO authenticated
  USING (is_admin() OR user_id = (select auth.uid()));

-- Update usage_metrics policies
DROP POLICY IF EXISTS "Admins can view all usage metrics" ON usage_metrics;
CREATE POLICY "Admins can view all usage metrics" ON usage_metrics
  FOR SELECT TO authenticated
  USING (is_admin() OR user_id = (select auth.uid()));

-- Update usage_events policies
DROP POLICY IF EXISTS "Admins can view all usage events" ON usage_events;
CREATE POLICY "Admins can view all usage events" ON usage_events
  FOR SELECT TO authenticated
  USING (is_admin() OR user_id = (select auth.uid()));

-- Update model_usage_logs policies
DROP POLICY IF EXISTS "Admins can view all usage logs" ON model_usage_logs;
CREATE POLICY "Admins can view all usage logs" ON model_usage_logs
  FOR SELECT TO authenticated
  USING (is_admin() OR user_id = (select auth.uid()));

-- Update model_usage_daily_summary policies
DROP POLICY IF EXISTS "Admins can view daily summary" ON model_usage_daily_summary;
CREATE POLICY "Admins can view daily summary" ON model_usage_daily_summary
  FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert daily summary" ON model_usage_daily_summary;
CREATE POLICY "Admins can insert daily summary" ON model_usage_daily_summary
  FOR INSERT TO authenticated
  WITH CHECK (is_supa_admin());

DROP POLICY IF EXISTS "Admins can update daily summary" ON model_usage_daily_summary;
CREATE POLICY "Admins can update daily summary" ON model_usage_daily_summary
  FOR UPDATE TO authenticated
  USING (is_supa_admin())
  WITH CHECK (is_supa_admin());

-- Update impact_metrics policies
DROP POLICY IF EXISTS "Admins manage impact metrics" ON impact_metrics;
CREATE POLICY "Admins manage impact metrics" ON impact_metrics
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Update knowledge_base_summaries policies
DROP POLICY IF EXISTS "Admins and prime can view summaries" ON knowledge_base_summaries;
CREATE POLICY "Admins and prime can view summaries" ON knowledge_base_summaries
  FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can update summaries" ON knowledge_base_summaries;
CREATE POLICY "Admins can update summaries" ON knowledge_base_summaries
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete summaries" ON knowledge_base_summaries;
CREATE POLICY "Admins can delete summaries" ON knowledge_base_summaries
  FOR DELETE TO authenticated
  USING (is_admin());

-- Update knowledge_base_audit_log policies
DROP POLICY IF EXISTS "Admins and prime can view audit logs" ON knowledge_base_audit_log;
CREATE POLICY "Admins and prime can view audit logs" ON knowledge_base_audit_log
  FOR SELECT TO authenticated
  USING (is_admin());

-- Update knowledge_base_categories policies
DROP POLICY IF EXISTS "Superadmins can view all categories" ON knowledge_base_categories;
CREATE POLICY "Superadmins can view all categories" ON knowledge_base_categories
  FOR SELECT TO authenticated
  USING (is_supa_admin());

DROP POLICY IF EXISTS "Superadmins can insert categories" ON knowledge_base_categories;
CREATE POLICY "Superadmins can insert categories" ON knowledge_base_categories
  FOR INSERT TO authenticated
  WITH CHECK (is_supa_admin());

DROP POLICY IF EXISTS "Superadmins can update categories" ON knowledge_base_categories;
CREATE POLICY "Superadmins can update categories" ON knowledge_base_categories
  FOR UPDATE TO authenticated
  USING (is_supa_admin())
  WITH CHECK (is_supa_admin());

DROP POLICY IF EXISTS "Superadmins can delete categories" ON knowledge_base_categories;
CREATE POLICY "Superadmins can delete categories" ON knowledge_base_categories
  FOR DELETE TO authenticated
  USING (is_supa_admin());

-- Update knowledge_base_documents policies
DROP POLICY IF EXISTS "Superadmins can view all documents" ON knowledge_base_documents;
CREATE POLICY "Superadmins can view all documents" ON knowledge_base_documents
  FOR SELECT TO authenticated
  USING (is_supa_admin());

DROP POLICY IF EXISTS "Superadmins can insert documents" ON knowledge_base_documents;
CREATE POLICY "Superadmins can insert documents" ON knowledge_base_documents
  FOR INSERT TO authenticated
  WITH CHECK (is_supa_admin());

DROP POLICY IF EXISTS "Superadmins can update documents" ON knowledge_base_documents;
CREATE POLICY "Superadmins can update documents" ON knowledge_base_documents
  FOR UPDATE TO authenticated
  USING (is_supa_admin())
  WITH CHECK (is_supa_admin());

DROP POLICY IF EXISTS "Superadmins can delete documents" ON knowledge_base_documents;
CREATE POLICY "Superadmins can delete documents" ON knowledge_base_documents
  FOR DELETE TO authenticated
  USING (is_supa_admin());

-- Update knowledge_base_chunks policies
DROP POLICY IF EXISTS "Superadmins can view all chunks" ON knowledge_base_chunks;
CREATE POLICY "Superadmins can view all chunks" ON knowledge_base_chunks
  FOR SELECT TO authenticated
  USING (is_supa_admin());

DROP POLICY IF EXISTS "Superadmins can delete chunks" ON knowledge_base_chunks;
CREATE POLICY "Superadmins can delete chunks" ON knowledge_base_chunks
  FOR DELETE TO authenticated
  USING (is_supa_admin());

-- Update knowledge_base_embeddings policies
DROP POLICY IF EXISTS "Superadmins can delete embeddings" ON knowledge_base_embeddings;
CREATE POLICY "Superadmins can delete embeddings" ON knowledge_base_embeddings
  FOR DELETE TO authenticated
  USING (is_supa_admin());

-- Update knowledge_base_retrievals policies
DROP POLICY IF EXISTS "Superadmins can view all retrievals" ON knowledge_base_retrievals;
CREATE POLICY "Superadmins can view all retrievals" ON knowledge_base_retrievals
  FOR SELECT TO authenticated
  USING (is_supa_admin() OR user_id = (select auth.uid()));

-- Update knowledge_base_training_jobs policies
DROP POLICY IF EXISTS "Superadmins can view all training jobs" ON knowledge_base_training_jobs;
CREATE POLICY "Superadmins can view all training jobs" ON knowledge_base_training_jobs
  FOR SELECT TO authenticated
  USING (is_supa_admin());

-- Update user_activity_metrics policies
DROP POLICY IF EXISTS "Only supa admin can view user activity metrics" ON user_activity_metrics;
CREATE POLICY "Only supa admin can view user activity metrics" ON user_activity_metrics
  FOR SELECT TO authenticated
  USING (is_supa_admin());

DROP POLICY IF EXISTS "Only supa admin can insert user activity metrics" ON user_activity_metrics;
CREATE POLICY "Only supa admin can insert user activity metrics" ON user_activity_metrics
  FOR INSERT TO authenticated
  WITH CHECK (is_supa_admin());

-- Update token_usage_metrics policies
DROP POLICY IF EXISTS "Only supa admin can view token metrics" ON token_usage_metrics;
CREATE POLICY "Only supa admin can view token metrics" ON token_usage_metrics
  FOR SELECT TO authenticated
  USING (is_supa_admin());

DROP POLICY IF EXISTS "Only supa admin can insert token metrics" ON token_usage_metrics;
CREATE POLICY "Only supa admin can insert token metrics" ON token_usage_metrics
  FOR INSERT TO authenticated
  WITH CHECK (is_supa_admin());

-- Update organization_metrics policies
DROP POLICY IF EXISTS "Only supa admin can view organization metrics" ON organization_metrics;
CREATE POLICY "Only supa admin can view organization metrics" ON organization_metrics
  FOR SELECT TO authenticated
  USING (is_supa_admin());

DROP POLICY IF EXISTS "Only supa admin can manage organization metrics" ON organization_metrics;
CREATE POLICY "Only supa admin can manage organization metrics" ON organization_metrics
  FOR ALL TO authenticated
  USING (is_supa_admin())
  WITH CHECK (is_supa_admin());

-- Update organization_token_balances policies
DROP POLICY IF EXISTS "Admins can view organization token balances" ON organization_token_balances;
CREATE POLICY "Admins can view organization token balances" ON organization_token_balances
  FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Supa admin can manage organization token balances" ON organization_token_balances;
CREATE POLICY "Supa admin can manage organization token balances" ON organization_token_balances
  FOR ALL TO authenticated
  USING (is_supa_admin())
  WITH CHECK (is_supa_admin());

-- Update token_refills policies
DROP POLICY IF EXISTS "Admins can view token refills" ON token_refills;
CREATE POLICY "Admins can view token refills" ON token_refills
  FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Supa admin can manage token refills" ON token_refills;
CREATE POLICY "Supa admin can manage token refills" ON token_refills
  FOR ALL TO authenticated
  USING (is_supa_admin())
  WITH CHECK (is_supa_admin());

-- Update user_token_usage policies
DROP POLICY IF EXISTS "Admins can view all user token usage" ON user_token_usage;
CREATE POLICY "Admins can view all user token usage" ON user_token_usage
  FOR SELECT TO authenticated
  USING (is_admin() OR user_id = (select auth.uid()));

-- Update image_generation_log policies
DROP POLICY IF EXISTS "Admins can view all image generation logs" ON image_generation_log;
CREATE POLICY "Admins can view all image generation logs" ON image_generation_log
  FOR SELECT TO authenticated
  USING (is_admin() OR user_id = (select auth.uid()));

-- Update token_cap_audit_log policies
DROP POLICY IF EXISTS "Admins can view token cap audit log" ON token_cap_audit_log;
CREATE POLICY "Admins can view token cap audit log" ON token_cap_audit_log
  FOR SELECT TO authenticated
  USING (is_admin());

-- Update admin_knowledge_documents policies
DROP POLICY IF EXISTS "Admins and prime can view knowledge documents" ON admin_knowledge_documents;
CREATE POLICY "Admins and prime can view knowledge documents" ON admin_knowledge_documents
  FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins and prime can upload knowledge documents" ON admin_knowledge_documents;
CREATE POLICY "Admins and prime can upload knowledge documents" ON admin_knowledge_documents
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update knowledge documents" ON admin_knowledge_documents;
CREATE POLICY "Admins can update knowledge documents" ON admin_knowledge_documents
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete knowledge documents" ON admin_knowledge_documents;
CREATE POLICY "Admins can delete knowledge documents" ON admin_knowledge_documents
  FOR DELETE TO authenticated
  USING (is_admin());

-- Update system_metrics policies
DROP POLICY IF EXISTS "Only supa_admin can view system metrics" ON system_metrics;
CREATE POLICY "Only supa_admin can view system metrics" ON system_metrics
  FOR SELECT TO authenticated
  USING (is_supa_admin());

DROP POLICY IF EXISTS "Only supa_admin can insert system metrics" ON system_metrics;
CREATE POLICY "Only supa_admin can insert system metrics" ON system_metrics
  FOR INSERT TO authenticated
  WITH CHECK (is_supa_admin());

-- Update active_sessions_log policies
DROP POLICY IF EXISTS "Only supa_admin can view active sessions" ON active_sessions_log;
CREATE POLICY "Only supa_admin can view active sessions" ON active_sessions_log
  FOR SELECT TO authenticated
  USING (is_supa_admin());

DROP POLICY IF EXISTS "Only supa_admin can insert session logs" ON active_sessions_log;
CREATE POLICY "Only supa_admin can insert session logs" ON active_sessions_log
  FOR INSERT TO authenticated
  WITH CHECK (is_supa_admin());

DROP POLICY IF EXISTS "Only supa_admin can update session logs" ON active_sessions_log;
CREATE POLICY "Only supa_admin can update session logs" ON active_sessions_log
  FOR UPDATE TO authenticated
  USING (is_supa_admin())
  WITH CHECK (is_supa_admin());

-- Update api_performance_log policies
DROP POLICY IF EXISTS "Only supa_admin can view API performance" ON api_performance_log;
CREATE POLICY "Only supa_admin can view API performance" ON api_performance_log
  FOR SELECT TO authenticated
  USING (is_supa_admin());

DROP POLICY IF EXISTS "Only supa_admin can insert API performance" ON api_performance_log;
CREATE POLICY "Only supa_admin can insert API performance" ON api_performance_log
  FOR INSERT TO authenticated
  WITH CHECK (is_supa_admin());

-- Update error_log policies
DROP POLICY IF EXISTS "Only supa_admin can view error logs" ON error_log;
CREATE POLICY "Only supa_admin can view error logs" ON error_log
  FOR SELECT TO authenticated
  USING (is_supa_admin());

DROP POLICY IF EXISTS "Only supa_admin can insert error logs" ON error_log;
CREATE POLICY "Only supa_admin can insert error logs" ON error_log
  FOR INSERT TO authenticated
  WITH CHECK (is_supa_admin());

DROP POLICY IF EXISTS "Only supa_admin can update error logs" ON error_log;
CREATE POLICY "Only supa_admin can update error logs" ON error_log
  FOR UPDATE TO authenticated
  USING (is_supa_admin())
  WITH CHECK (is_supa_admin());

-- Update alert_history policies
DROP POLICY IF EXISTS "Only supa_admin can view alert history" ON alert_history;
CREATE POLICY "Only supa_admin can view alert history" ON alert_history
  FOR SELECT TO authenticated
  USING (is_supa_admin());

DROP POLICY IF EXISTS "Only supa_admin can insert alerts" ON alert_history;
CREATE POLICY "Only supa_admin can insert alerts" ON alert_history
  FOR INSERT TO authenticated
  WITH CHECK (is_supa_admin());

DROP POLICY IF EXISTS "Only supa_admin can update alerts" ON alert_history;
CREATE POLICY "Only supa_admin can update alerts" ON alert_history
  FOR UPDATE TO authenticated
  USING (is_supa_admin())
  WITH CHECK (is_supa_admin());

-- Update database_metrics policies
DROP POLICY IF EXISTS "Only supa_admin can view database metrics" ON database_metrics;
CREATE POLICY "Only supa_admin can view database metrics" ON database_metrics
  FOR SELECT TO authenticated
  USING (is_supa_admin());

DROP POLICY IF EXISTS "Only supa_admin can insert database metrics" ON database_metrics;
CREATE POLICY "Only supa_admin can insert database metrics" ON database_metrics
  FOR INSERT TO authenticated
  WITH CHECK (is_supa_admin());