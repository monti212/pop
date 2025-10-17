/*
  # Enhance U Files System

  1. Adds missing columns to existing user_files table:
    - display_name - User-friendly display name
    - storage_path - Path in Supabase Storage
    - storage_bucket - Storage bucket name
    - file_extension - File extension (e.g., 'pdf', 'png')
    - folder_id - Link to file_folders for organization
    - content_preview - Text preview for search
    - thumbnail_url - URL to thumbnail
    - metadata - Flexible JSONB metadata
    - is_shared - Whether file is shared
    - share_token - Unique token for sharing
    - download_count - Track downloads
    - last_accessed_at - Last access timestamp
    - deleted_at - Soft delete support

  2. Creates new tables:
    - file_folders - Hierarchical folder structure
    - file_shares - Sharing permissions and access tracking

  3. Security:
    - Enable RLS on new tables
    - Add policies for user access and admin oversight
*/

-- Add new columns to user_files table
ALTER TABLE user_files ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE user_files ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE user_files ADD COLUMN IF NOT EXISTS storage_bucket text DEFAULT 'user-files';
ALTER TABLE user_files ADD COLUMN IF NOT EXISTS file_extension text;
ALTER TABLE user_files ADD COLUMN IF NOT EXISTS folder_id uuid;
ALTER TABLE user_files ADD COLUMN IF NOT EXISTS content_preview text;
ALTER TABLE user_files ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE user_files ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
ALTER TABLE user_files ADD COLUMN IF NOT EXISTS is_shared boolean DEFAULT false;
ALTER TABLE user_files ADD COLUMN IF NOT EXISTS share_token text;
ALTER TABLE user_files ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0;
ALTER TABLE user_files ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz;
ALTER TABLE user_files ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Rename existing columns to match new schema
DO $$
BEGIN
  -- Rename file_size_bytes to file_size if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_files' AND column_name = 'file_size_bytes'
  ) THEN
    ALTER TABLE user_files RENAME COLUMN file_size_bytes TO file_size;
  END IF;
  
  -- Rename file_url to storage_path and populate storage_path
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_files' AND column_name = 'file_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_files' AND column_name = 'storage_path' AND is_nullable = 'NO'
  ) THEN
    -- Copy file_url to storage_path if storage_path is empty
    UPDATE user_files SET storage_path = file_url WHERE storage_path IS NULL;
  END IF;
END $$;

-- Create file_folders table
CREATE TABLE IF NOT EXISTS file_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  parent_folder_id uuid REFERENCES file_folders(id) ON DELETE CASCADE,
  path text NOT NULL DEFAULT '/',
  color text,
  icon text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz,
  CONSTRAINT valid_folder_name CHECK (length(trim(name)) > 0)
);

-- Add foreign key constraint for folder_id (now that file_folders exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_files_folder_id_fkey'
  ) THEN
    ALTER TABLE user_files 
    ADD CONSTRAINT user_files_folder_id_fkey 
    FOREIGN KEY (folder_id) REFERENCES file_folders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create file_shares table
CREATE TABLE IF NOT EXISTS file_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid REFERENCES user_files(id) ON DELETE CASCADE NOT NULL,
  shared_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_with uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level text NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'download', 'edit')),
  expires_at timestamptz,
  access_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS user_files_folder_id_idx ON user_files(folder_id);
CREATE INDEX IF NOT EXISTS user_files_deleted_at_idx ON user_files(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS user_files_share_token_idx ON user_files(share_token) WHERE share_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS file_folders_user_id_idx ON file_folders(user_id);
CREATE INDEX IF NOT EXISTS file_folders_parent_id_idx ON file_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS file_folders_deleted_at_idx ON file_folders(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS file_shares_file_id_idx ON file_shares(file_id);
CREATE INDEX IF NOT EXISTS file_shares_shared_by_idx ON file_shares(shared_by);
CREATE INDEX IF NOT EXISTS file_shares_shared_with_idx ON file_shares(shared_with);

-- Update full-text search index
DROP INDEX IF EXISTS user_files_search_idx;
CREATE INDEX user_files_search_idx ON user_files 
  USING GIN(to_tsvector('english', 
    COALESCE(file_name, '') || ' ' || 
    COALESCE(display_name, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(content_preview, '') || ' ' ||
    COALESCE(extracted_content, '')
  ))
  WHERE deleted_at IS NULL;

-- Enable RLS on new tables
ALTER TABLE file_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_folders
CREATE POLICY "Users can view their own folders"
  ON file_folders FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can create their own folders"
  ON file_folders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own folders"
  ON file_folders FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own folders"
  ON file_folders FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all folders"
  ON file_folders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- RLS Policies for file_shares
CREATE POLICY "Users can view shares for their files"
  ON file_shares FOR SELECT TO authenticated
  USING (shared_by = auth.uid() OR shared_with = auth.uid());

CREATE POLICY "Users can create shares for their files"
  ON file_shares FOR INSERT TO authenticated
  WITH CHECK (
    shared_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_files
      WHERE user_files.id = file_shares.file_id
      AND user_files.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update shares they created"
  ON file_shares FOR UPDATE TO authenticated
  USING (shared_by = auth.uid())
  WITH CHECK (shared_by = auth.uid());

CREATE POLICY "Users can delete shares they created"
  ON file_shares FOR DELETE TO authenticated
  USING (shared_by = auth.uid());

-- Add policy to allow viewing shared files
DROP POLICY IF EXISTS "Users can view shared files" ON user_files;
CREATE POLICY "Users can view shared files"
  ON user_files FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_shared = true AND EXISTS (
        SELECT 1 FROM file_shares
        WHERE file_shares.file_id = user_files.id
        AND (
          file_shares.shared_with = auth.uid()
          OR file_shares.shared_with IS NULL
        )
        AND (file_shares.expires_at IS NULL OR file_shares.expires_at > now())
      )
    )
  );

-- Triggers and Functions
CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_file_folders_updated_at ON file_folders;
CREATE TRIGGER update_file_folders_updated_at
  BEFORE UPDATE ON file_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_files_updated_at();

-- Trigger to set display_name if not provided
CREATE OR REPLACE FUNCTION set_file_display_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_name IS NULL OR trim(NEW.display_name) = '' THEN
    NEW.display_name = NEW.file_name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_file_display_name ON user_files;
CREATE TRIGGER set_user_file_display_name
  BEFORE INSERT OR UPDATE ON user_files
  FOR EACH ROW
  EXECUTE FUNCTION set_file_display_name();

-- Function to update folder path
CREATE OR REPLACE FUNCTION update_folder_path()
RETURNS TRIGGER AS $$
DECLARE
  parent_path text;
BEGIN
  IF NEW.parent_folder_id IS NULL THEN
    NEW.path = '/' || NEW.name;
  ELSE
    SELECT path INTO parent_path
    FROM file_folders
    WHERE id = NEW.parent_folder_id;
    
    IF parent_path IS NULL THEN
      RAISE EXCEPTION 'Parent folder not found';
    END IF;
    
    NEW.path = parent_path || '/' || NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_file_folder_path ON file_folders;
CREATE TRIGGER update_file_folder_path
  BEFORE INSERT OR UPDATE ON file_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_path();

-- Function to generate share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_shared = true AND NEW.share_token IS NULL THEN
    NEW.share_token = encode(gen_random_bytes(16), 'hex');
  ELSIF NEW.is_shared = false THEN
    NEW.share_token = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_file_share_token ON user_files;
CREATE TRIGGER generate_file_share_token
  BEFORE INSERT OR UPDATE ON user_files
  FOR EACH ROW
  EXECUTE FUNCTION generate_share_token();