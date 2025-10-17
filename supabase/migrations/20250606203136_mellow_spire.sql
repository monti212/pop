/*
  # Fix user_profiles RLS policy

  1. Policy Updates
    - Update "Admins can view all user profiles" policy to reference `auth.users` instead of `users`
    - This resolves the "permission denied for table users" error

  2. Security
    - Maintains the same security logic but uses the correct Supabase auth table
    - Only affects admin access policy for viewing all user profiles
*/

-- Drop the existing admin policy that references the incorrect users table
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;

-- Recreate the admin policy with correct reference to auth.users
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@orionx.xyz'
    )
  );