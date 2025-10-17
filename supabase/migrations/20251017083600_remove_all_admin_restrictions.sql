/*
  # Remove All Admin Restrictions

  ## Purpose
  Remove all role-based restrictions from admin tables and functions.
  Allow any authenticated user to access admin functionality.

  ## Changes
  1. Update admin_knowledge_documents RLS policies - allow all authenticated users
  2. Update knowledge_base_summaries RLS policies - allow all authenticated users
  3. Update knowledge_base_audit_log RLS policies - allow all authenticated users
  4. Update WhatsApp-related tables - allow all authenticated users
  5. Update is_admin() function - return true for all authenticated users

  ## Security Note
  This removes all access restrictions. Any logged-in user can access admin features.
*/

-- ============================================================================
-- 1. UPDATE is_admin() FUNCTION - Allow all authenticated users
-- ============================================================================

DROP FUNCTION IF EXISTS is_admin(uuid);

CREATE OR REPLACE FUNCTION is_admin(check_user_id uuid DEFAULT NULL)
RETURNS boolean AS $$
BEGIN
  -- Allow all authenticated users to be admin
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;

-- ============================================================================
-- 2. UPDATE admin_knowledge_documents RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Only optimus_prime and prime can view knowledge documents" ON admin_knowledge_documents;
DROP POLICY IF EXISTS "Only optimus_prime can create knowledge documents" ON admin_knowledge_documents;
DROP POLICY IF EXISTS "Only optimus_prime can update knowledge documents" ON admin_knowledge_documents;
DROP POLICY IF EXISTS "Only optimus_prime can delete knowledge documents" ON admin_knowledge_documents;

CREATE POLICY "All authenticated users can view knowledge documents"
  ON admin_knowledge_documents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can create knowledge documents"
  ON admin_knowledge_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update knowledge documents"
  ON admin_knowledge_documents
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can delete knowledge documents"
  ON admin_knowledge_documents
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- 3. UPDATE knowledge_base_summaries RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view summaries" ON knowledge_base_summaries;
DROP POLICY IF EXISTS "System can create summaries" ON knowledge_base_summaries;
DROP POLICY IF EXISTS "Admins can update summaries" ON knowledge_base_summaries;
DROP POLICY IF EXISTS "Admins can delete summaries" ON knowledge_base_summaries;

CREATE POLICY "All authenticated users can view summaries"
  ON knowledge_base_summaries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can create summaries"
  ON knowledge_base_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update summaries"
  ON knowledge_base_summaries
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can delete summaries"
  ON knowledge_base_summaries
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- 4. UPDATE knowledge_base_audit_log RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view audit logs" ON knowledge_base_audit_log;
DROP POLICY IF EXISTS "System can create audit logs" ON knowledge_base_audit_log;

CREATE POLICY "All authenticated users can view audit logs"
  ON knowledge_base_audit_log
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can create audit logs"
  ON knowledge_base_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 5. UPDATE WHATSAPP MESSAGES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON whatsapp_messages;

CREATE POLICY "All authenticated users can view messages"
  ON whatsapp_messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert messages"
  ON whatsapp_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update messages"
  ON whatsapp_messages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can delete messages"
  ON whatsapp_messages
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- 6. UPDATE WHATSAPP SESSIONS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all sessions" ON whatsapp_sessions;
DROP POLICY IF EXISTS "Admins can update sessions" ON whatsapp_sessions;
DROP POLICY IF EXISTS "Admins can delete sessions" ON whatsapp_sessions;

CREATE POLICY "All authenticated users can view sessions"
  ON whatsapp_sessions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can update sessions"
  ON whatsapp_sessions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can delete sessions"
  ON whatsapp_sessions
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- 7. UPDATE WHATSAPP USERS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all whatsapp users" ON whatsapp_users;
DROP POLICY IF EXISTS "Admins can update whatsapp users" ON whatsapp_users;
DROP POLICY IF EXISTS "Admins can delete whatsapp users" ON whatsapp_users;

CREATE POLICY "All authenticated users can view whatsapp users"
  ON whatsapp_users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can update whatsapp users"
  ON whatsapp_users
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can delete whatsapp users"
  ON whatsapp_users
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- 8. UPDATE WHATSAPP USAGE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all usage" ON whatsapp_usage;

CREATE POLICY "All authenticated users can view usage"
  ON whatsapp_usage
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 9. UPDATE WHATSAPP USER CONTEXT RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all user context" ON whatsapp_user_context;
DROP POLICY IF EXISTS "Admins can update user context" ON whatsapp_user_context;
DROP POLICY IF EXISTS "Admins can delete user context" ON whatsapp_user_context;

CREATE POLICY "All authenticated users can view user context"
  ON whatsapp_user_context
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can update user context"
  ON whatsapp_user_context
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can delete user context"
  ON whatsapp_user_context
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- 10. UPDATE WHATSAPP SETTINGS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view settings" ON whatsapp_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON whatsapp_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON whatsapp_settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON whatsapp_settings;
DROP POLICY IF EXISTS "System can manage settings" ON whatsapp_settings;

CREATE POLICY "All authenticated users can view settings"
  ON whatsapp_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert settings"
  ON whatsapp_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update settings"
  ON whatsapp_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can delete settings"
  ON whatsapp_settings
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "System can manage settings"
  ON whatsapp_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
