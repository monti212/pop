/*
  # Fix User Profiles RLS Policies

  1. Security Updates
    - Update SELECT policy on `user_profiles` table to use `authenticated` role
    - Ensure proper use of `auth.uid()` function
    - Fix UPDATE policy to also use `authenticated` role for consistency

  2. Changes
    - Drop existing policies that have incorrect role assignments
    - Recreate policies with correct roles and auth functions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Recreate SELECT policy with authenticated role
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Recreate UPDATE policy with authenticated role for consistency
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);