/*
  # Provider Files Mapping Table

  1. New Tables
    - `provider_files`
      - `handle` (text, primary key) - Opaque handle returned to clients
      - `file_id` (text, not null) - Provider's internal file ID
      - `user_id` (uuid, nullable) - User who uploaded the file
      - `filename` (text, nullable) - Original filename
      - `file_size` (bigint, nullable) - File size in bytes
      - `file_type` (text, nullable) - MIME type
      - `created_at` (timestamp) - Upload timestamp

  2. Security
    - Enable RLS on `provider_files` table
    - Add policy for users to read their own file mappings
    - Add policy for service role to manage all files

  3. Indexes
    - Primary key on handle for fast lookups
    - Index on user_id for user file listings
    - Index on created_at for chronological ordering
*/

-- Create provider_files table for mapping opaque handles to provider file IDs
CREATE TABLE IF NOT EXISTS provider_files (
  handle text PRIMARY KEY,
  file_id text NOT NULL,
  user_id uuid,
  filename text,
  file_size bigint,
  file_type text,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint to user_profiles
ALTER TABLE provider_files 
ADD CONSTRAINT provider_files_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE provider_files ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own file mappings
CREATE POLICY "Users can read own file mappings"
  ON provider_files
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to insert their own file mappings
CREATE POLICY "Users can insert own file mappings"
  ON provider_files
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to manage all files (for the uhuru-files function)
CREATE POLICY "Service role can manage all files"
  ON provider_files
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS provider_files_user_id_idx 
  ON provider_files(user_id);

CREATE INDEX IF NOT EXISTS provider_files_created_at_idx 
  ON provider_files(created_at DESC);

CREATE INDEX IF NOT EXISTS provider_files_file_id_idx 
  ON provider_files(file_id);