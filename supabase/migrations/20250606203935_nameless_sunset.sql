/*
  # Fix Users Table RLS Policies

  1. Security Updates
    - Enable RLS on users table if it exists
    - Add policies for users table to allow user_profiles policies to work
    - Ensure proper access control for auth.users integration

  2. Changes
    - Enable RLS on users table
    - Add policy for authenticated users to read their own data
    - Add policy for admins to read all user data
*/

-- Enable RLS on users table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create users table if it doesn't exist (referencing auth.users)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    CREATE TABLE users (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
    
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist to recreate them
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can read own data" ON users;
  DROP POLICY IF EXISTS "Admins can read all users" ON users;
  DROP POLICY IF EXISTS "Users can insert own data" ON users;
EXCEPTION
  WHEN undefined_object THEN
    NULL; -- Ignore if policies don't exist
END $$;

-- Allow users to read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow admins to read all user data
CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@orionx.xyz'
    )
  );

-- Allow users to insert their own data
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Update user_profiles policies to ensure they work correctly
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;

-- Recreate user_profiles policies with proper references
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@orionx.xyz'
    )
  );

-- Ensure the users table is populated with data from auth.users if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    INSERT INTO users (id, email, created_at)
    SELECT 
      id, 
      email, 
      created_at
    FROM auth.users
    WHERE NOT EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.users.id
    );
  END IF;
END $$;