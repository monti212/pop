/*
  # Fix user_files Schema Mismatch

  ## Summary
  Resolves schema conflicts where the application code expects columns that don't exist
  in the database. The main issue is that migration 20251009165045 recreated the 
  user_files table without the `title` column that the application requires.

  ## Changes Made

  1. **Add Missing Columns**
     - `title` - User-friendly display name for files (defaults to file_name if not provided)
     - Ensure `file_size` column exists (may have been named `file_size_bytes`)

  2. **Column Reconciliation**
     - Ensure column names match what the application code expects
     - The enhance_u_files_system migration already handles file_size_bytes -> file_size rename
     - Add title column if it doesn't exist

  3. **Data Migration**
     - Populate title from file_name for existing records where title is null
     - Ensure data integrity for all existing files

  4. **Focus Sets Table**
     - Create focus_sets table as an alias/view or separate table
     - Create focus_set_files junction table for many-to-many relationships
     - These are separate from file_focus_sets which uses array storage

  ## Security
  - Maintains existing RLS policies
  - No changes to access control
*/

-- ============================================================================
-- 1. Add missing title column to user_files
-- ============================================================================

-- Add title column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_files' AND column_name = 'title'
  ) THEN
    ALTER TABLE user_files ADD COLUMN title text;
    
    -- Populate title from file_name for existing records
    UPDATE user_files SET title = file_name WHERE title IS NULL;
    
    -- Make title NOT NULL after populating
    ALTER TABLE user_files ALTER COLUMN title SET NOT NULL;
  END IF;
END $$;

-- Set default value for title to file_name
ALTER TABLE user_files ALTER COLUMN title SET DEFAULT 'Untitled File';

-- ============================================================================
-- 2. Ensure file_size column exists (enhance migration should handle this)
-- ============================================================================

-- The 20251014021603_enhance_u_files_system migration already handles
-- renaming file_size_bytes to file_size, so we just verify it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_files' AND column_name = 'file_size'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_files' AND column_name = 'file_size_bytes'
  ) THEN
    ALTER TABLE user_files RENAME COLUMN file_size_bytes TO file_size;
  END IF;
END $$;

-- ============================================================================
-- 3. Create focus_sets table (separate from file_focus_sets)
-- ============================================================================

-- Create focus_sets table for user-defined file collections
CREATE TABLE IF NOT EXISTS focus_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS focus_set_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_set_id uuid REFERENCES focus_sets(id) ON DELETE CASCADE NOT NULL,
  file_id uuid REFERENCES user_files(id) ON DELETE CASCADE NOT NULL,
  added_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(focus_set_id, file_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS focus_sets_user_id_idx ON focus_sets(user_id);
CREATE INDEX IF NOT EXISTS focus_set_files_focus_set_id_idx ON focus_set_files(focus_set_id);
CREATE INDEX IF NOT EXISTS focus_set_files_file_id_idx ON focus_set_files(file_id);

-- Enable RLS
ALTER TABLE focus_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_set_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for focus_sets
DROP POLICY IF EXISTS "Users can manage their own focus sets" ON focus_sets;
CREATE POLICY "Users can manage their own focus sets"
  ON focus_sets FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all focus sets" ON focus_sets;
CREATE POLICY "Admins can view all focus sets"
  ON focus_sets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- RLS Policies for focus_set_files
DROP POLICY IF EXISTS "Users can manage their focus set files" ON focus_set_files;
CREATE POLICY "Users can manage their focus set files"
  ON focus_set_files FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM focus_sets
      WHERE focus_sets.id = focus_set_files.focus_set_id
      AND focus_sets.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM focus_sets
      WHERE focus_sets.id = focus_set_files.focus_set_id
      AND focus_sets.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. Update triggers for new tables
-- ============================================================================

-- Create or replace update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for focus_sets
DROP TRIGGER IF EXISTS update_focus_sets_updated_at ON focus_sets;
CREATE TRIGGER update_focus_sets_updated_at
  BEFORE UPDATE ON focus_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Update search index to include title
-- ============================================================================

-- Drop and recreate the search index to include title
DROP INDEX IF EXISTS user_files_search_idx;
CREATE INDEX user_files_search_idx ON user_files 
  USING GIN(to_tsvector('english', 
    COALESCE(title, '') || ' ' || 
    COALESCE(file_name, '') || ' ' || 
    COALESCE(display_name, '') || ' ' || 
    COALESCE(description, '') || ' ' ||
    COALESCE(content_preview, '') || ' ' ||
    COALESCE(extracted_content, '')
  ))
  WHERE deleted_at IS NULL;
