/*
  # Fix RLS Policies That Bypass Security
  
  1. Security Fixes
    - Fix policies that allow unrestricted access
    - Add proper ownership and admin validation
*/

-- phone_verifications
DROP POLICY IF EXISTS "Anyone can start phone verification" ON phone_verifications;

CREATE POLICY "Users can create phone verifications"
  ON phone_verifications FOR INSERT TO anon, authenticated
  WITH CHECK (
    phone_number IS NOT NULL
    AND verification_code IS NOT NULL
    AND expires_at > now()
  );

-- conversation_summaries
DROP POLICY IF EXISTS "Service can manage conversation summaries" ON conversation_summaries;

CREATE POLICY "Service can manage conversation summaries"
  ON conversation_summaries FOR ALL TO authenticated
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

-- usage_metrics
DROP POLICY IF EXISTS "Service can manage usage metrics" ON usage_metrics;

CREATE POLICY "Service can manage usage metrics"
  ON usage_metrics FOR ALL TO authenticated
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

-- usage_events
DROP POLICY IF EXISTS "Service can insert usage events" ON usage_events;

CREATE POLICY "Service can insert usage events"
  ON usage_events FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

-- model_usage_logs
DROP POLICY IF EXISTS "System can insert usage logs" ON model_usage_logs;

CREATE POLICY "System can insert usage logs"
  ON model_usage_logs FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

-- activity_logs
DROP POLICY IF EXISTS "System creates activity logs" ON activity_logs;

CREATE POLICY "System creates activity logs"
  ON activity_logs FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

-- teaching_analytics
DROP POLICY IF EXISTS "System creates analytics" ON teaching_analytics;
DROP POLICY IF EXISTS "System updates analytics" ON teaching_analytics;

CREATE POLICY "System creates analytics"
  ON teaching_analytics FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

CREATE POLICY "System updates analytics"
  ON teaching_analytics FOR UPDATE TO authenticated
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

-- knowledge_base tables - require admin role
DROP POLICY IF EXISTS "System can create audit logs" ON knowledge_base_audit_log;
CREATE POLICY "System can create audit logs"
  ON knowledge_base_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

DROP POLICY IF EXISTS "System can insert chunks" ON knowledge_base_chunks;
CREATE POLICY "System can insert chunks"
  ON knowledge_base_chunks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

DROP POLICY IF EXISTS "System can insert embeddings" ON knowledge_base_embeddings;
CREATE POLICY "System can insert embeddings"
  ON knowledge_base_embeddings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

DROP POLICY IF EXISTS "System can insert retrievals" ON knowledge_base_retrievals;
CREATE POLICY "System can insert retrievals"
  ON knowledge_base_retrievals FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

DROP POLICY IF EXISTS "System can create summaries" ON knowledge_base_summaries;
CREATE POLICY "System can create summaries"
  ON knowledge_base_summaries FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

DROP POLICY IF EXISTS "System can insert training jobs" ON knowledge_base_training_jobs;
DROP POLICY IF EXISTS "System can update training jobs" ON knowledge_base_training_jobs;

CREATE POLICY "System can insert training jobs"
  ON knowledge_base_training_jobs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('admin', 'supa_admin')
    )
  );

CREATE POLICY "System can update training jobs"
  ON knowledge_base_training_jobs FOR UPDATE TO authenticated
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