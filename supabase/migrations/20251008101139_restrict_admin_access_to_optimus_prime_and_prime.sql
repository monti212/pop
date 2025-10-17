/*
  # Restrict Admin Access to Optimus Prime and Prime Only

  ## Purpose
  Remove autobot role from all admin access policies and functions. The autobot role
  should provide Uhuru Plus features but NOT administrative dashboard access.

  ## Access Model
  - **optimus_prime**: Full admin access (monti@orionx.xyz only)
  - **prime**: Admin dashboard access
  - **autobot**: Uhuru Plus features (NO admin access)
  - **free**: Basic features

  ## Changes

  ### 1. Update is_admin() Function
  Remove autobot from the admin role check. Only optimus_prime and prime should
  be considered admin users.

  ### 2. Update WhatsApp Tables RLS Policies
  Update all admin policies on whatsapp_messages, whatsapp_sessions, whatsapp_users,
  whatsapp_usage, and whatsapp_user_context tables to only allow optimus_prime and 
  prime access.

  ### 3. Update WhatsApp Settings RLS Policies
  Update all admin policies on whatsapp_settings table to only allow optimus_prime
  and prime access.

  ## Security Impact
  - Autobot users will no longer have access to admin dashboard
  - Autobot users will no longer have access to WhatsApp admin features
  - Autobot users will retain Uhuru Plus features (to be defined separately)
  - Only optimus_prime and prime users can access admin functions
*/

-- ============================================================================
-- 1. UPDATE is_admin() FUNCTION
-- ============================================================================

-- Drop and recreate is_admin function with correct role check
DROP FUNCTION IF EXISTS is_admin(uuid);

CREATE OR REPLACE FUNCTION is_admin(check_user_id uuid DEFAULT NULL)
RETURNS boolean AS $$
DECLARE
  user_role team_role_enum;
  target_id uuid;
BEGIN
  target_id := COALESCE(check_user_id, auth.uid());
  
  SELECT team_role INTO user_role
  FROM user_profiles
  WHERE id = target_id;
  
  -- ONLY optimus_prime and prime have admin access
  -- autobot is excluded from admin access
  RETURN user_role IN ('optimus_prime', 'prime');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;

-- ============================================================================
-- 2. UPDATE WHATSAPP MESSAGES RLS POLICIES
-- ============================================================================

-- Drop existing autobot-inclusive policies for whatsapp_messages
DROP POLICY IF EXISTS "Admins can view all messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON whatsapp_messages;

-- Recreate policies with optimus_prime and prime only
CREATE POLICY "Admins can view all messages"
  ON whatsapp_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

CREATE POLICY "Admins can insert messages"
  ON whatsapp_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

CREATE POLICY "Admins can update messages"
  ON whatsapp_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

CREATE POLICY "Admins can delete messages"
  ON whatsapp_messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- ============================================================================
-- 3. UPDATE WHATSAPP SESSIONS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all sessions" ON whatsapp_sessions;
DROP POLICY IF EXISTS "Admins can update sessions" ON whatsapp_sessions;
DROP POLICY IF EXISTS "Admins can delete sessions" ON whatsapp_sessions;

CREATE POLICY "Admins can view all sessions"
  ON whatsapp_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

CREATE POLICY "Admins can update sessions"
  ON whatsapp_sessions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

CREATE POLICY "Admins can delete sessions"
  ON whatsapp_sessions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- ============================================================================
-- 4. UPDATE WHATSAPP USERS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all whatsapp users" ON whatsapp_users;
DROP POLICY IF EXISTS "Admins can update whatsapp users" ON whatsapp_users;
DROP POLICY IF EXISTS "Admins can delete whatsapp users" ON whatsapp_users;

CREATE POLICY "Admins can view all whatsapp users"
  ON whatsapp_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

CREATE POLICY "Admins can update whatsapp users"
  ON whatsapp_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

CREATE POLICY "Admins can delete whatsapp users"
  ON whatsapp_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- ============================================================================
-- 5. UPDATE WHATSAPP USAGE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all usage" ON whatsapp_usage;

CREATE POLICY "Admins can view all usage"
  ON whatsapp_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- ============================================================================
-- 6. UPDATE WHATSAPP USER CONTEXT RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all user context" ON whatsapp_user_context;
DROP POLICY IF EXISTS "Admins can update user context" ON whatsapp_user_context;
DROP POLICY IF EXISTS "Admins can delete user context" ON whatsapp_user_context;

CREATE POLICY "Admins can view all user context"
  ON whatsapp_user_context
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

CREATE POLICY "Admins can update user context"
  ON whatsapp_user_context
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

CREATE POLICY "Admins can delete user context"
  ON whatsapp_user_context
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- ============================================================================
-- 7. UPDATE WHATSAPP SETTINGS RLS POLICIES
-- ============================================================================

-- Drop existing autobot-inclusive policies for whatsapp_settings
DROP POLICY IF EXISTS "Admins can view settings" ON whatsapp_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON whatsapp_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON whatsapp_settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON whatsapp_settings;
DROP POLICY IF EXISTS "System can manage settings" ON whatsapp_settings;

-- Recreate policies with optimus_prime and prime only
CREATE POLICY "Admins can view settings"
  ON whatsapp_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

CREATE POLICY "Admins can insert settings"
  ON whatsapp_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

CREATE POLICY "Admins can update settings"
  ON whatsapp_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

CREATE POLICY "Admins can delete settings"
  ON whatsapp_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- System can manage settings (for edge functions using service role)
CREATE POLICY "System can manage settings"
  ON whatsapp_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
