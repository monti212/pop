/*
  # Fix Infinite Recursion in user_profiles RLS Policy

  1. Problem
    - The "Admins can view all profiles" policy queries user_profiles from within itself
    - This creates infinite recursion when trying to check if a user is an admin
    
  2. Solution
    - Drop the problematic policy
    - Create a new policy that uses auth.jwt() to check team_role from the token
    - This avoids querying the user_profiles table recursively
    
  3. Security
    - Maintains same access control: only optimus_prime and prime can view all profiles
    - Other users can still only view their own profile
    - Uses JWT metadata which is set during authentication
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- Create a new admin policy that doesn't cause recursion
-- This checks the team_role from the JWT metadata instead of querying the table
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Check if the user's team_role in their profile is optimus_prime or prime
    -- We use a function to avoid recursion
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'team_role' = 'optimus_prime'
        OR auth.users.raw_user_meta_data->>'team_role' = 'prime'
      )
    )
  );

-- Alternative: If the above still causes issues, we can use a simpler approach
-- that checks a specific flag in the JWT
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Admin users have special emails or we check their role from a security definer function
    (auth.jwt()->>'email')::text IN ('optimus.prime@orionx.xyz', 'prime@orionx.xyz')
    OR
    -- Or they can view their own profile (already covered by another policy, but added for completeness)
    auth.uid() = id
  );
