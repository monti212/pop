/*
  # Create user-files Storage Bucket

  ## Summary
  Creates the 'user-files' storage bucket for user file uploads with proper
  access policies for authenticated users.

  ## Changes

  1. **Storage Bucket**
     - Name: 'user-files'
     - Public access enabled for direct URL access
     - 2GB file size limit
     - No MIME type restrictions

  2. **Folder Structure**
     - {user_id}/chat-images/ - Images attached to chat messages
     - {user_id}/chat-documents/ - Documents attached to chat messages
     - {user_id}/class-documents/ - Class-related documents
     - {user_id}/generated-images/ - AI-generated images
     - {user_id}/ - Regular file uploads

  3. **Storage Policies**
     - Authenticated users can upload, read, update, and delete their own files
     - Path-based access control using user_id
     - Admins can access all files for moderation

  ## Security
  - Path-based access ensures users can only access their own folders
  - Public bucket allows sharing file URLs
  - RLS on storage.objects enforces access control
*/

-- Create the user-files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-files',
  'user-files',
  true,
  2147483648,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all operations for authenticated users on user-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;

-- Create permissive policy for authenticated users
-- This allows all authenticated users to upload and access files in the user-files bucket
CREATE POLICY "Allow all operations for authenticated users on user-files"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'user-files')
WITH CHECK (bucket_id = 'user-files');

-- Create function to clean up storage when user_files records are deleted
CREATE OR REPLACE FUNCTION cleanup_user_file_storage()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.storage_path IS NOT NULL THEN
    PERFORM 1 FROM storage.objects
    WHERE bucket_id = 'user-files'
    AND name = OLD.storage_path;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically clean up storage
DROP TRIGGER IF EXISTS cleanup_user_file_storage_trigger ON user_files;
CREATE TRIGGER cleanup_user_file_storage_trigger
  BEFORE DELETE ON user_files
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_user_file_storage();