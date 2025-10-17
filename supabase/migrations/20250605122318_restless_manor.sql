/*
  # Add insert policy for user profiles

  1. Security
    - Add policy for authenticated users to insert their own profile data
    - This policy allows users to create their profile during signup
*/

-- Add the INSERT policy for user_profiles table
CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);