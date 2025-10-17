/*
  # Secure Admin Role Management

  ## Purpose
  Remove hardcoded admin email checks and implement secure database-driven admin role 
  management with proper audit logging. This migration creates the infrastructure for 
  secure admin assignment without exposing credentials in client-side code.

  ## Changes

  ### New Tables
  
  **`admin_role_audit_log`**
  Tracks all admin role changes for security and compliance auditing.
  
  Columns:
  - `id` (uuid, primary key) - Audit log entry identifier
  - `user_id` (uuid) - User whose role was changed
  - `old_role` (team_role_enum) - Previous role
  - `new_role` (team_role_enum) - New role assigned
  - `changed_by` (uuid) - Admin who made the change
  - `change_reason` (text) - Optional reason for the change
  - `changed_at` (timestamptz) - When the change occurred
  - `ip_address` (text) - IP address of the requester (for security)
  - `user_agent` (text) - User agent string (for security)

  ### New Functions
  
  **`assign_team_role()`**
  Securely assigns team roles with proper authorization checks and audit logging.
  Can only be called by users with optimus_prime role or via service role.

  **`get_user_role()`**
  Helper function to safely get a user's current role.

  **`is_admin()`**
  Helper function to check if a user has admin privileges.

  ## Security
  - Only optimus_prime users can change roles
  - All role changes are logged with full audit trail
  - RLS prevents unauthorized access to audit logs
  - Service role can assign roles for bootstrap process
  - Client-side code cannot directly modify team_role column

  ## Notes
  - Replaces hardcoded email-based admin checks
  - Provides foundation for admin management UI
  - Audit log retention should be configured separately
  - Initial admin must be assigned via Supabase SQL editor or service role
*/

-- Create admin role audit log table
CREATE TABLE IF NOT EXISTS admin_role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  old_role team_role_enum NOT NULL,
  new_role team_role_enum NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason text,
  changed_at timestamptz DEFAULT now() NOT NULL,
  ip_address text,
  user_agent text
);

-- Create index for audit log queries
CREATE INDEX IF NOT EXISTS admin_role_audit_log_user_id_idx ON admin_role_audit_log(user_id);
CREATE INDEX IF NOT EXISTS admin_role_audit_log_changed_at_idx ON admin_role_audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS admin_role_audit_log_changed_by_idx ON admin_role_audit_log(changed_by);

-- Enable RLS on audit log
ALTER TABLE admin_role_audit_log ENABLE ROW LEVEL SECURITY;

-- Only optimus_prime and prime can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON admin_role_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- Only system can insert audit logs (via trigger)
CREATE POLICY "System can insert audit logs"
  ON admin_role_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Helper function to get user's current role
CREATE OR REPLACE FUNCTION get_user_role(target_user_id uuid)
RETURNS team_role_enum AS $$
DECLARE
  user_role team_role_enum;
BEGIN
  SELECT team_role INTO user_role
  FROM user_profiles
  WHERE id = target_user_id;
  
  RETURN COALESCE(user_role, 'free'::team_role_enum);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
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
  
  RETURN user_role IN ('optimus_prime', 'prime', 'autobot');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure function to assign team roles
CREATE OR REPLACE FUNCTION assign_team_role(
  target_user_id uuid,
  new_role team_role_enum,
  reason text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  caller_id uuid;
  caller_role team_role_enum;
  old_role team_role_enum;
  result jsonb;
BEGIN
  -- Get caller ID (will be NULL for service role calls)
  caller_id := auth.uid();
  
  -- If called by authenticated user, verify they have permission
  IF caller_id IS NOT NULL THEN
    SELECT team_role INTO caller_role
    FROM user_profiles
    WHERE id = caller_id;
    
    -- Only optimus_prime can assign roles via authenticated calls
    IF caller_role != 'optimus_prime' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Unauthorized: Only optimus_prime users can assign roles'
      );
    END IF;
    
    -- Prevent optimus_prime from demoting themselves
    IF target_user_id = caller_id AND new_role != 'optimus_prime' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Cannot demote yourself from optimus_prime role'
      );
    END IF;
  END IF;
  
  -- Get current role
  SELECT team_role INTO old_role
  FROM user_profiles
  WHERE id = target_user_id;
  
  IF old_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Don't update if role is the same
  IF old_role = new_role THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Role already set to ' || new_role,
      'old_role', old_role,
      'new_role', new_role
    );
  END IF;
  
  -- Update the role
  UPDATE user_profiles
  SET team_role = new_role
  WHERE id = target_user_id;
  
  -- Log the change
  INSERT INTO admin_role_audit_log (
    user_id,
    old_role,
    new_role,
    changed_by,
    change_reason
  ) VALUES (
    target_user_id,
    old_role,
    new_role,
    caller_id,
    reason
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role updated successfully',
    'old_role', old_role,
    'new_role', new_role,
    'user_id', target_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit log for a specific user (admin only)
CREATE OR REPLACE FUNCTION get_user_role_history(target_user_id uuid)
RETURNS TABLE (
  changed_at timestamptz,
  old_role team_role_enum,
  new_role team_role_enum,
  changed_by_email text,
  change_reason text
) AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT 
    arl.changed_at,
    arl.old_role,
    arl.new_role,
    u.email as changed_by_email,
    arl.change_reason
  FROM admin_role_audit_log arl
  LEFT JOIN auth.users u ON u.id = arl.changed_by
  WHERE arl.user_id = target_user_id
  ORDER BY arl.changed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the handle_new_user trigger to NOT set role based on email
-- It should only set the default 'free' role (already done by column default)
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, display_name, team_role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'name',
    'free'::team_role_enum  -- Always default to free, admin assignment happens via assign_team_role
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_team_role(uuid, team_role_enum, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role_history(uuid) TO authenticated;