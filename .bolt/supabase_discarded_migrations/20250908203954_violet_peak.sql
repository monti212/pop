/*
  # Fix RLS policies for user file uploads

  1. Security Updates
    - Drop existing broad policy that may be causing conflicts
    - Create specific policies for different operations (INSERT, SELECT, UPDATE, DELETE)
    - Add storage bucket policies for file uploads
  
  2. New Policies
    - Allow authenticated users to insert their own files
    - Allow authenticated users to view their own files
    - Allow authenticated users to update their own files
    - Allow authenticated users to delete their own files
    - Allow admins full access to all files
    - Allow authenticated users to upload files to storage bucket
*/

-- Drop the existing broad policy that may be causing issues
DROP POLICY IF EXISTS "Users can manage their own files" ON user_files;

-- Create specific policies for each operation
CREATE POLICY "Users can insert their own files"
  ON user_files
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own files"
  ON user_files
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON user_files
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON user_files
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Ensure admin policy still exists (recreate if needed)
CREATE POLICY IF NOT EXISTS "Admins can access all files"
  ON user_files
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@orionx.xyz'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@orionx.xyz'
    )
  );

-- Storage bucket policies for the user-files bucket
-- Allow authenticated users to upload files to their own folder
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-files', 'user-files', true) 
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files (INSERT)
CREATE POLICY IF NOT EXISTS "Users can upload their own files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to view/download their own files (SELECT)
CREATE POLICY IF NOT EXISTS "Users can view their own files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own files (DELETE)
CREATE POLICY IF NOT EXISTS "Users can delete their own files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow admins full access to storage
CREATE POLICY IF NOT EXISTS "Admins can manage all storage files"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'user-files' 
    AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@orionx.xyz'
    )
  )
  WITH CHECK (
    bucket_id = 'user-files' 
    AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@orionx.xyz'
    )
  );