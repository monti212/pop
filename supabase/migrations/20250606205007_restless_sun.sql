/*
  # Fix Users Table Permissions

  This migration grants the necessary permissions to the authenticated role for the users table.
  The users table is referenced by user_profiles through foreign key constraints, so authenticated 
  users need SELECT permission on users table for PostgreSQL to validate foreign key constraints.

  ## Changes
  1. Grant SELECT permission on users table to authenticated role
  2. Ensure RLS policies are properly configured for both tables
*/

-- Grant SELECT permission on users table to authenticated role
-- This is needed for foreign key constraint validation
GRANT SELECT ON users TO authenticated;

-- Ensure the users table has proper RLS policies
-- The existing policies should already be in place, but let's verify them

-- Policy for users to read their own data (should already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Users can read own data'
        AND cmd = 'SELECT'
    ) THEN
        CREATE POLICY "Users can read own data"
            ON users
            FOR SELECT
            TO authenticated
            USING (uid() = id);
    END IF;
END $$;

-- Policy for users to insert their own data (should already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Users can insert own data'
        AND cmd = 'INSERT'
    ) THEN
        CREATE POLICY "Users can insert own data"
            ON users
            FOR INSERT
            TO authenticated
            WITH CHECK (uid() = id);
    END IF;
END $$;

-- Ensure user_profiles table has proper permissions as well
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;

-- Verify user_profiles policies exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can view own profile'
        AND cmd = 'SELECT'
    ) THEN
        CREATE POLICY "Users can view own profile"
            ON user_profiles
            FOR SELECT
            TO authenticated
            USING (uid() = id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can insert own profile'
        AND cmd = 'INSERT'
    ) THEN
        CREATE POLICY "Users can insert own profile"
            ON user_profiles
            FOR INSERT
            TO authenticated
            WITH CHECK (uid() = id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can update own profile'
        AND cmd = 'UPDATE'
    ) THEN
        CREATE POLICY "Users can update own profile"
            ON user_profiles
            FOR UPDATE
            TO authenticated
            USING (uid() = id)
            WITH CHECK (uid() = id);
    END IF;
END $$;