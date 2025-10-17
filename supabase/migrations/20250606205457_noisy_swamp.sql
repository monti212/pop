/*
  # Fix user_profiles admin policy

  1. Changes
    - Drop the existing problematic "Admin full access" policy on user_profiles
    - Recreate it with proper table aliases to avoid ambiguous column references
  
  2. Security
    - Maintains the same access control logic for admin users
    - Fixes the table reference issue causing permission errors
*/

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Admin full access" ON user_profiles;

-- Recreate the admin policy with proper table aliases
CREATE POLICY "Admin full access"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users auth_users
      WHERE auth_users.id = auth.uid() 
      AND auth_users.email LIKE '%@orionx.xyz'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM auth.users auth_users
      WHERE auth_users.id = auth.uid() 
      AND auth_users.email LIKE '%@orionx.xyz'
    )
  );