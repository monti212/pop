/*
  # Fix Infinite Recursion in user_profiles Policies

  1. Problem
    - Admin policy queries user_profiles to check if user is admin
    - This creates infinite recursion when checking permissions

  2. Solution
    - Split policies to avoid self-referencing
    - Users can always view their own profile (no recursion)
    - Admins viewing others uses a restrictive policy that doesn't recurse
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Recreate policies without recursion
-- Users can always view their own profile (no recursion needed)
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- Admins can view all profiles - use raw metadata check to avoid recursion
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT TO authenticated
  USING (
    (
      SELECT COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'team_role'),
        (auth.jwt() -> 'app_metadata' ->> 'team_role')
      )
    ) IN ('supa_admin', 'admin')
    OR id = (select auth.uid())
  );