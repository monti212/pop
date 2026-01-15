/*
  # Optimize Admin & Monitoring RLS Policies

  1. Performance Improvements
    - Optimize usage_metrics, usage_events, model_usage_logs
    - Optimize conversation_summaries
    - Optimize impact_metrics
    - Optimize knowledge base policies
    - Optimize token and organization policies
    - Optimize monitoring system policies

  2. Security
    - Maintain admin-only access where required
*/

-- conversation_summaries policies
DROP POLICY IF EXISTS "Users can view own conversation summaries" ON conversation_summaries;
CREATE POLICY "Users can view own conversation summaries" ON conversation_summaries
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all conversation summaries" ON conversation_summaries;
CREATE POLICY "Admins can view all conversation summaries" ON conversation_summaries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- usage_metrics policies
DROP POLICY IF EXISTS "Users can view own usage metrics" ON usage_metrics;
CREATE POLICY "Users can view own usage metrics" ON usage_metrics
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all usage metrics" ON usage_metrics;
CREATE POLICY "Admins can view all usage metrics" ON usage_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- usage_events policies
DROP POLICY IF EXISTS "Users can view own usage events" ON usage_events;
CREATE POLICY "Users can view own usage events" ON usage_events
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all usage events" ON usage_events;
CREATE POLICY "Admins can view all usage events" ON usage_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- model_usage_logs policies
DROP POLICY IF EXISTS "Users can view own usage logs" ON model_usage_logs;
CREATE POLICY "Users can view own usage logs" ON model_usage_logs
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all usage logs" ON model_usage_logs;
CREATE POLICY "Admins can view all usage logs" ON model_usage_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- model_usage_daily_summary policies
DROP POLICY IF EXISTS "Admins can view daily summary" ON model_usage_daily_summary;
CREATE POLICY "Admins can view daily summary" ON model_usage_daily_summary
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can insert daily summary" ON model_usage_daily_summary;
CREATE POLICY "Admins can insert daily summary" ON model_usage_daily_summary
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update daily summary" ON model_usage_daily_summary;
CREATE POLICY "Admins can update daily summary" ON model_usage_daily_summary
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- impact_metrics policies
DROP POLICY IF EXISTS "Admins manage impact metrics" ON impact_metrics;
CREATE POLICY "Admins manage impact metrics" ON impact_metrics
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- knowledge_base_summaries policies
DROP POLICY IF EXISTS "Admins and prime can view summaries" ON knowledge_base_summaries;
CREATE POLICY "Admins and prime can view summaries" ON knowledge_base_summaries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update summaries" ON knowledge_base_summaries;
CREATE POLICY "Admins can update summaries" ON knowledge_base_summaries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete summaries" ON knowledge_base_summaries;
CREATE POLICY "Admins can delete summaries" ON knowledge_base_summaries
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- knowledge_base_audit_log policies
DROP POLICY IF EXISTS "Admins and prime can view audit logs" ON knowledge_base_audit_log;
CREATE POLICY "Admins and prime can view audit logs" ON knowledge_base_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- knowledge_base_categories policies
DROP POLICY IF EXISTS "Superadmins can view all categories" ON knowledge_base_categories;
CREATE POLICY "Superadmins can view all categories" ON knowledge_base_categories
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Superadmins can insert categories" ON knowledge_base_categories;
CREATE POLICY "Superadmins can insert categories" ON knowledge_base_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Superadmins can update categories" ON knowledge_base_categories;
CREATE POLICY "Superadmins can update categories" ON knowledge_base_categories
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Superadmins can delete categories" ON knowledge_base_categories;
CREATE POLICY "Superadmins can delete categories" ON knowledge_base_categories
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- knowledge_base_documents policies
DROP POLICY IF EXISTS "Superadmins can view all documents" ON knowledge_base_documents;
CREATE POLICY "Superadmins can view all documents" ON knowledge_base_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Superadmins can insert documents" ON knowledge_base_documents;
CREATE POLICY "Superadmins can insert documents" ON knowledge_base_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Superadmins can update documents" ON knowledge_base_documents;
CREATE POLICY "Superadmins can update documents" ON knowledge_base_documents
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Superadmins can delete documents" ON knowledge_base_documents;
CREATE POLICY "Superadmins can delete documents" ON knowledge_base_documents
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- knowledge_base_chunks policies
DROP POLICY IF EXISTS "Superadmins can view all chunks" ON knowledge_base_chunks;
CREATE POLICY "Superadmins can view all chunks" ON knowledge_base_chunks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Superadmins can delete chunks" ON knowledge_base_chunks;
CREATE POLICY "Superadmins can delete chunks" ON knowledge_base_chunks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- knowledge_base_embeddings policies
DROP POLICY IF EXISTS "Superadmins can delete embeddings" ON knowledge_base_embeddings;
CREATE POLICY "Superadmins can delete embeddings" ON knowledge_base_embeddings
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- knowledge_base_retrievals policies
DROP POLICY IF EXISTS "Superadmins can view all retrievals" ON knowledge_base_retrievals;
CREATE POLICY "Superadmins can view all retrievals" ON knowledge_base_retrievals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own retrievals" ON knowledge_base_retrievals;
CREATE POLICY "Users can view own retrievals" ON knowledge_base_retrievals
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- knowledge_base_training_jobs policies
DROP POLICY IF EXISTS "Superadmins can view all training jobs" ON knowledge_base_training_jobs;
CREATE POLICY "Superadmins can view all training jobs" ON knowledge_base_training_jobs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- user_activity_metrics policies
DROP POLICY IF EXISTS "Only supa admin can view user activity metrics" ON user_activity_metrics;
CREATE POLICY "Only supa admin can view user activity metrics" ON user_activity_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Only supa admin can insert user activity metrics" ON user_activity_metrics;
CREATE POLICY "Only supa admin can insert user activity metrics" ON user_activity_metrics
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- token_usage_metrics policies
DROP POLICY IF EXISTS "Only supa admin can view token metrics" ON token_usage_metrics;
CREATE POLICY "Only supa admin can view token metrics" ON token_usage_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Only supa admin can insert token metrics" ON token_usage_metrics;
CREATE POLICY "Only supa admin can insert token metrics" ON token_usage_metrics
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- organization_metrics policies
DROP POLICY IF EXISTS "Only supa admin can view organization metrics" ON organization_metrics;
CREATE POLICY "Only supa admin can view organization metrics" ON organization_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Only supa admin can manage organization metrics" ON organization_metrics;
CREATE POLICY "Only supa admin can manage organization metrics" ON organization_metrics
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- organization_token_balances policies
DROP POLICY IF EXISTS "Admins can view organization token balances" ON organization_token_balances;
CREATE POLICY "Admins can view organization token balances" ON organization_token_balances
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Supa admin can manage organization token balances" ON organization_token_balances;
CREATE POLICY "Supa admin can manage organization token balances" ON organization_token_balances
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- token_refills policies
DROP POLICY IF EXISTS "Admins can view token refills" ON token_refills;
CREATE POLICY "Admins can view token refills" ON token_refills
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Supa admin can manage token refills" ON token_refills;
CREATE POLICY "Supa admin can manage token refills" ON token_refills
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- user_token_usage policies
DROP POLICY IF EXISTS "Users can view their own token usage" ON user_token_usage;
CREATE POLICY "Users can view their own token usage" ON user_token_usage
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all user token usage" ON user_token_usage;
CREATE POLICY "Admins can view all user token usage" ON user_token_usage
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- image_generation_log policies
DROP POLICY IF EXISTS "Users can view their own image generation log" ON image_generation_log;
CREATE POLICY "Users can view their own image generation log" ON image_generation_log
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all image generation logs" ON image_generation_log;
CREATE POLICY "Admins can view all image generation logs" ON image_generation_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- token_cap_audit_log policies
DROP POLICY IF EXISTS "Admins can view token cap audit log" ON token_cap_audit_log;
CREATE POLICY "Admins can view token cap audit log" ON token_cap_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- admin_knowledge_documents policies
DROP POLICY IF EXISTS "Admins and prime can view knowledge documents" ON admin_knowledge_documents;
CREATE POLICY "Admins and prime can view knowledge documents" ON admin_knowledge_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins and prime can upload knowledge documents" ON admin_knowledge_documents;
CREATE POLICY "Admins and prime can upload knowledge documents" ON admin_knowledge_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update knowledge documents" ON admin_knowledge_documents;
CREATE POLICY "Admins can update knowledge documents" ON admin_knowledge_documents
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete knowledge documents" ON admin_knowledge_documents;
CREATE POLICY "Admins can delete knowledge documents" ON admin_knowledge_documents
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );