/*
  # Create user_files Table with Complete Schema

  ## Summary
  Creates the user_files table with all required columns for file storage and management.
  This table stores uploaded files with metadata, search capabilities, and organization features.

  ## Table: user_files

  ### Core File Information
  - `id` - Unique file identifier
  - `user_id` - File owner (references auth.users)
  - `file_name` - Original filename
  - `file_size` - File size in bytes
  - `file_type` - File category (document, image, pdf, etc.)
  - `mime_type` - MIME type of the file

  ### Storage
  - `file_url` - Deprecated public URL (kept for compatibility)
  - `storage_path` - Path in Supabase Storage bucket
  - `storage_bucket` - Storage bucket name (default: 'user-files')

  ### Display and Organization
  - `title` - User-friendly display name
  - `display_name` - Alternative display name
  - `description` - File description
  - `tags` - Array of tags for categorization
  - `file_extension` - File extension (.pdf, .docx, etc.)

  ### Content and Search
  - `content_preview` - Text preview for search
  - `extracted_content` - Full extracted text content
  - `thumbnail_url` - URL to file thumbnail

  ### Relationships
  - `folder_id` - Link to file_folders for organization

  ### Metadata
  - `metadata` - Flexible JSONB for additional properties
  - `subject` - Subject/topic classification
  - `grade_level` - Grade level classification

  ### Teacher-Specific Features
  - `document_category` - Category: attendance, lesson_plan, other
  - `academic_year` - Academic year
  - `semester` - Semester/term
  - `week_number` - Week number in semester
  - `classroom_group_id` - Link to classroom groups
  - `student_ids` - Array of student IDs (for attendance)
  - `lesson_plan_structure` - Structured lesson plan data
  - `attendance_date` - Date for attendance records

  ### Sharing
  - `is_shared` - Whether file is shared
  - `share_token` - Unique token for sharing
  - `download_count` - Number of downloads

  ### Timestamps
  - `created_at` - Creation timestamp
  - `updated_at` - Last update timestamp
  - `last_accessed_at` - Last access timestamp
  - `deleted_at` - Soft delete timestamp

  ## Security
  - RLS enabled
  - Users can only access their own files
  - Admins can view all files for support

  ## Indexes
  - User ID for efficient user queries
  - File type and category for filtering
  - Tags for search
  - Full-text search on content
  - Soft delete filtering
*/

-- Create user_files table
CREATE TABLE IF NOT EXISTS user_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Core File Info
  file_name text NOT NULL,
  title text NOT NULL DEFAULT 'Untitled File',
  display_name text,
  file_size bigint DEFAULT 0,
  file_type text CHECK (file_type IN (
    'document', 'image', 'video', 'audio', 'spreadsheet', 'presentation', 'pdf', 'other'
  )),
  mime_type text,
  file_extension text,
  
  -- Storage
  file_url text, -- Deprecated but kept for compatibility
  storage_path text,
  storage_bucket text DEFAULT 'user-files',
  
  -- Organization
  folder_id uuid, -- Will add FK constraint after file_folders exists
  description text,
  tags text[] DEFAULT ARRAY[]::text[],
  subject text,
  grade_level text,
  
  -- Content and Search
  content_preview text,
  extracted_content text,
  thumbnail_url text,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  
  -- Sharing
  is_shared boolean DEFAULT false,
  share_token text,
  download_count integer DEFAULT 0,
  
  -- Teacher-Specific
  document_category text DEFAULT 'other' CHECK (document_category IN ('attendance', 'lesson_plan', 'other')),
  academic_year text,
  semester text,
  week_number integer,
  classroom_group_id uuid,
  student_ids uuid[] DEFAULT ARRAY[]::uuid[],
  lesson_plan_structure jsonb DEFAULT '{}',
  attendance_date date,
  
  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  last_accessed_at timestamptz,
  deleted_at timestamptz
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS user_files_user_id_idx ON user_files(user_id);
CREATE INDEX IF NOT EXISTS user_files_file_type_idx ON user_files(file_type);
CREATE INDEX IF NOT EXISTS user_files_document_category_idx ON user_files(document_category);
CREATE INDEX IF NOT EXISTS user_files_folder_id_idx ON user_files(folder_id);
CREATE INDEX IF NOT EXISTS user_files_tags_idx ON user_files USING GIN(tags);
CREATE INDEX IF NOT EXISTS user_files_created_at_idx ON user_files(created_at DESC);
CREATE INDEX IF NOT EXISTS user_files_deleted_at_idx ON user_files(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS user_files_share_token_idx ON user_files(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_files_academic_idx ON user_files(user_id, academic_year, semester);
CREATE INDEX IF NOT EXISTS user_files_classroom_idx ON user_files(classroom_group_id) WHERE classroom_group_id IS NOT NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS user_files_search_idx ON user_files 
  USING GIN(to_tsvector('english', 
    COALESCE(title, '') || ' ' || 
    COALESCE(file_name, '') || ' ' || 
    COALESCE(display_name, '') || ' ' || 
    COALESCE(description, '') || ' ' ||
    COALESCE(content_preview, '') || ' ' ||
    COALESCE(extracted_content, '')
  ))
  WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage their own files" ON user_files;
CREATE POLICY "Users can manage their own files"
  ON user_files FOR ALL TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all files" ON user_files;
CREATE POLICY "Admins can view all files"
  ON user_files FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_files_updated_at_trigger ON user_files;
CREATE TRIGGER update_user_files_updated_at_trigger
  BEFORE UPDATE ON user_files
  FOR EACH ROW
  EXECUTE FUNCTION update_user_files_updated_at();

-- Comments
COMMENT ON TABLE user_files IS 'User-uploaded files with metadata, organization, and search capabilities';
COMMENT ON COLUMN user_files.document_category IS 'File category: attendance, lesson_plan, or other';
COMMENT ON COLUMN user_files.storage_path IS 'Path in Supabase Storage bucket';
COMMENT ON COLUMN user_files.file_url IS 'Deprecated - use storage_path instead';
COMMENT ON COLUMN user_files.extracted_content IS 'Full text content extracted from file for search';
COMMENT ON COLUMN user_files.classroom_group_id IS 'Link to classroom group for class-specific files';