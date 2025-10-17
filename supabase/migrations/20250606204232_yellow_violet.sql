/*
  # Fix RLS policies for user_profiles table

  1. Issues Fixed
    - Remove conflicting admin policy that causes permission errors
    - Simplify policies to ensure users can access their own profiles
    - Add clear admin policy for @orionx.xyz email addresses

  2. Security Changes
    - Drop existing policies that may be causing conflicts
    - Create simplified policy for users to view their own profiles
    - Create separate admin policy for organizational users
    - Maintain INSERT and UPDATE policies

  3. Policy Structure
    - Users can view/update their own profile data
    - Admins can view all profiles
    - Users can insert their own profile on signup
*/

-- Drop existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

-- Create simplified policy for users to view their own profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create policy for users to update their own profiles  
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create policy for users to insert their own profiles
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create admin policy for organizational access (separate from user access)
CREATE POLICY "Admin full access"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@orionx.xyz'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@orionx.xyz'
    )
  );

-- Ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;