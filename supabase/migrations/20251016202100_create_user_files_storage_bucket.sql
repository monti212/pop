/*
  # Create user-files Storage Bucket

  1. Creates Storage Bucket
    - Creates 'user-files' bucket for user file uploads
    - Configures as public bucket for direct URL access
    - Sets file size limits and allowed mime types

  2. Storage Policies
    - Authenticated users can upload to their own folders
    - Users can read their own files
    - Users can update/delete their own files
    - Admin users (optimus_prime, prime) can access all files
    - Public access for reading files (needed for chat attachments)

  3. Folder Structure
    - {user_id}/chat-images/ - Images attached to chat messages
    - {user_id}/chat-documents/ - Documents attached to chat messages
    - {user_id}/generated-images/ - AI-generated images
    - {user_id}/ - Regular file uploads

  4. Security
    - Path-based access control ensures users can only access their folders
    - Admins have oversight capability for moderation
    - Public bucket allows sharing file URLs in chat
*/

-- Create the user-files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-files',
  'user-files',
  true,  -- Public bucket for direct URL access
  2147483648,  -- 2GB file size limit
  NULL  -- Allow all mime types
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to read their own files
CREATE POLICY "Users can read their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow public read access (needed for chat attachments and sharing)
CREATE POLICY "Public can read files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-files');

-- Policy: Allow users to update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow admins to read all files
CREATE POLICY "Admins can read all files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.team_role IN ('optimus_prime', 'prime')
  )
);

-- Policy: Allow admins to delete any file (for moderation)
CREATE POLICY "Admins can delete any file"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.team_role IN ('optimus_prime', 'prime')
  )
);

-- Create function to clean up storage when user_files records are deleted
CREATE OR REPLACE FUNCTION cleanup_user_file_storage()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the file from storage when the database record is deleted
  IF OLD.storage_path IS NOT NULL THEN
    -- Use storage.objects to delete the file
    DELETE FROM storage.objects
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

-- Add comment explaining the bucket structure
COMMENT ON TABLE storage.buckets IS 'Storage buckets for file uploads. user-files bucket structure: {user_id}/chat-images/, {user_id}/chat-documents/, {user_id}/generated-images/, {user_id}/';
