/*
  # Fix Admin Policies - Remove Email-Based Checks

  ## Purpose
  Remove hardcoded email-based admin checks from RLS policies and replace with 
  proper team_role-based checks from user_profiles table. This completes the 
  migration away from hardcoded credentials.

  ## Changes
  - Drop existing email-based admin policy on user_files
  - Create new team_role-based admin policy for user_files
  - Ensures all admin access is controlled via database roles, not hardcoded emails

  ## Security Impact
  - More secure: No hardcoded emails in policies
  - More maintainable: Admin status controlled via user_profiles.team_role
  - More auditable: Role changes are logged in admin_role_audit_log
  - Easier to manage: Admins can be promoted/demoted via assign_team_role function
*/

-- Drop the old email-based admin policy for user_files
DROP POLICY IF EXISTS "Admins can access all files" ON user_files;

-- Create new team_role-based admin policy for user_files
CREATE POLICY "Admins can access all files"
  ON user_files
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );