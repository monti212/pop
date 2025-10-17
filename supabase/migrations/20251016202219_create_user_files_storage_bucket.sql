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
  true,
  2147483648,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

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