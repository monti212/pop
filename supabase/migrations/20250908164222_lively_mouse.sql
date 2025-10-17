/*
  # Create user files table for Uhuru Files

  1. New Tables
    - `user_files`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text, user-friendly file name)
      - `file_name` (text, original filename)
      - `file_type` (text, MIME type)
      - `file_size` (bigint, file size in bytes)
      - `content_preview` (text, extracted text content for search)
      - `storage_path` (text, path in Supabase Storage)
      - `tags` (text array, for categorization)
      - `metadata` (jsonb, additional file metadata)
      - `created_at` (timestamp with timezone)
      - `updated_at` (timestamp with timezone)

  2. Security
    - Enable RLS on `user_files` table
    - Add policies for users to manage their own files
    - Add admin policy for full access

  3. Indexes
    - Add indexes for efficient searching and filtering
*/

-- Create user_files table
CREATE TABLE IF NOT EXISTS user_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  content_preview text,
  storage_path text NOT NULL,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own files"
  ON user_files
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Admin policy for full access
CREATE POLICY "Admins can access all files"
  ON user_files
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@orionx.xyz'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_files_user_id_idx ON user_files(user_id);
CREATE INDEX IF NOT EXISTS user_files_created_at_idx ON user_files(created_at DESC);
CREATE INDEX IF NOT EXISTS user_files_file_type_idx ON user_files(file_type);
CREATE INDEX IF NOT EXISTS user_files_tags_idx ON user_files USING GIN(tags);

-- Full text search index on content_preview and title
CREATE INDEX IF NOT EXISTS user_files_content_search_idx ON user_files 
  USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content_preview, '')));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_files_updated_at 
  BEFORE UPDATE ON user_files 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();