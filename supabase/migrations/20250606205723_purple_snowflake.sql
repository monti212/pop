/*
  # Fix RLS permissions for users table

  1. Security Updates
    - Ensure users can read their own data from users table
    - Fix any potential issues with existing RLS policies
    - Add proper SELECT policy for authenticated users

  2. Changes
    - Drop and recreate the user SELECT policy to ensure it works correctly
    - Ensure the policy uses the correct authentication check
*/

-- Drop existing policy and recreate to ensure it's working correctly
DROP POLICY IF EXISTS "Users can read own data" ON users;

-- Create a new policy for users to read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Ensure RLS is enabled on the users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;