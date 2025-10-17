/*
  # Fix user_profiles admin policy

  1. Security
    - Update the admin policy for user_profiles table to properly reference auth.users
    - Fix ambiguous table reference that was causing permission denied errors
*/

-- Drop the existing problematic admin policy
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;

-- Create a corrected admin policy with proper table aliasing
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM auth.users auth_users 
      WHERE auth_users.id = auth.uid() 
      AND auth_users.email LIKE '%@orionx.xyz'
    )
  );