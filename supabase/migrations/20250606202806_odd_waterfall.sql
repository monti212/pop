/*
  # Fix User Profiles Permissions

  1. Changes
    - Drops existing policies for user_profiles table
    - Creates new policies with correct permissions
    - Ensures users can view and update their own profiles
    - Allows authenticated users to insert their own profiles
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;

-- Recreate policies with correct configuration
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles
  FOR SELECT
  TO public
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles
  FOR UPDATE
  TO public
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);