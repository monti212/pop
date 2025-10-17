/*
  # Fix User Profiles RLS Policies

  1. Policy Updates
    - Drop and recreate the SELECT policy for users to view their own profile with 'authenticated' role
    - Drop and recreate the UPDATE policy for users to update their own profile with 'authenticated' role
    - Ensure all policies use the correct role assignments

  2. Security
    - Maintain RLS on user_profiles table
    - Ensure authenticated users can only access their own data
    - Keep admin policies intact
*/

-- Drop existing policies that have incorrect role assignments
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Recreate the SELECT policy with authenticated role
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Recreate the UPDATE policy with authenticated role
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);