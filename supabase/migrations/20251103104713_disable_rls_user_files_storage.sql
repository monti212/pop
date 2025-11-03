/*
  # Temporarily disable RLS for user-files storage bucket
  
  1. Changes
    - Drop all existing policies on storage.objects for user-files bucket
    - Create a permissive policy that allows all operations for authenticated users
  
  2. Security Note
    - This is a temporary fix for the meeting
    - Should be re-enabled with proper policies after testing
*/

-- Drop existing policies for user-files bucket
DROP POLICY IF EXISTS "Users can upload files to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;

-- Create permissive policy for authenticated users
CREATE POLICY "Allow all operations for authenticated users on user-files"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'user-files')
WITH CHECK (bucket_id = 'user-files');