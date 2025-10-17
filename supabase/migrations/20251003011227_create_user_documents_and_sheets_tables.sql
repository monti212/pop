/*
  # Create User Documents and Sheets Tables

  ## Purpose
  Replace localStorage-based storage with proper database persistence for Uhuru Office 
  documents and Uhuru Sheets. This enables cross-device synchronization, data recovery, 
  version history, and future collaboration features.

  ## New Tables

  ### `user_documents`
  Stores rich text documents created in Uhuru Office with version history support.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique document identifier
  - `user_id` (uuid, references auth.users) - Document owner
  - `title` (text, required) - Document title
  - `content` (text) - Document content (HTML/rich text)
  - `document_type` (text) - Type: 'office', 'sheet', 'block' for future extensibility
  - `is_auto_saved` (boolean) - Whether document was auto-saved from chat
  - `source` (text) - Optional source identifier (e.g., 'chat', 'manual')
  - `metadata` (jsonb) - Flexible metadata storage for formatting, settings, etc.
  - `version` (integer) - Version number for tracking changes
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  - `deleted_at` (timestamptz) - Soft delete timestamp

  ### `user_sheets`
  Stores spreadsheet data created in Uhuru Sheets with formula and cell metadata.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique sheet identifier
  - `user_id` (uuid, references auth.users) - Sheet owner
  - `title` (text, required) - Sheet title
  - `sheet_data` (jsonb, required) - Complete sheet data structure (cells, formulas, formatting)
  - `column_headers` (text array) - Column header names
  - `row_count` (integer) - Number of rows
  - `column_count` (integer) - Number of columns
  - `metadata` (jsonb) - Sheet settings, formatting rules, etc.
  - `version` (integer) - Version number for tracking changes
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  - `deleted_at` (timestamptz) - Soft delete timestamp

  ### `document_versions`
  Stores version history for documents and sheets to enable rollback and audit trail.
  
  **Columns:**
  - `id` (uuid, primary key) - Version identifier
  - `document_id` (uuid) - References user_documents or user_sheets
  - `document_type` (text) - 'document' or 'sheet'
  - `version_number` (integer) - Sequential version number
  - `content_snapshot` (jsonb) - Complete snapshot of document/sheet at this version
  - `change_summary` (text) - Optional description of changes
  - `created_by` (uuid, references auth.users) - User who created this version
  - `created_at` (timestamptz) - When version was created

  ## Security
  - Enable RLS on all tables
  - Users can only access their own documents and sheets
  - Admins can view all documents for support purposes
  - Version history follows same access rules as parent document

  ## Indexes
  - Index on user_id for efficient user-specific queries
  - Index on updated_at for recent documents listing
  - Index on document_type for filtering by type
  - Full-text search index on document title and content
  - Index on deleted_at for soft-delete filtering

  ## Notes
  - Soft delete pattern allows data recovery
  - Version history supports future undo/redo functionality
  - JSONB columns support flexible schema evolution
  - Prepared for future collaboration features
*/

-- Create user_documents table
CREATE TABLE IF NOT EXISTS user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Document',
  content text DEFAULT '',
  document_type text DEFAULT 'office' CHECK (document_type IN ('office', 'sheet', 'block')),
  is_auto_saved boolean DEFAULT false,
  source text,
  metadata jsonb DEFAULT '{}',
  version integer DEFAULT 1 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Create user_sheets table
CREATE TABLE IF NOT EXISTS user_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Sheet',
  sheet_data jsonb NOT NULL DEFAULT '{"cells": {}, "formulas": {}}',
  column_headers text[] DEFAULT ARRAY['A']::text[],
  row_count integer DEFAULT 10 NOT NULL,
  column_count integer DEFAULT 10 NOT NULL,
  metadata jsonb DEFAULT '{}',
  version integer DEFAULT 1 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Create document_versions table for version history
CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('document', 'sheet')),
  version_number integer NOT NULL,
  content_snapshot jsonb NOT NULL,
  change_summary text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(document_id, document_type, version_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS user_documents_user_id_idx ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS user_documents_updated_at_idx ON user_documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS user_documents_type_idx ON user_documents(document_type);
CREATE INDEX IF NOT EXISTS user_documents_deleted_at_idx ON user_documents(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS user_sheets_user_id_idx ON user_sheets(user_id);
CREATE INDEX IF NOT EXISTS user_sheets_updated_at_idx ON user_sheets(updated_at DESC);
CREATE INDEX IF NOT EXISTS user_sheets_deleted_at_idx ON user_sheets(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS document_versions_document_idx ON document_versions(document_id, document_type);
CREATE INDEX IF NOT EXISTS document_versions_created_at_idx ON document_versions(created_at DESC);

-- Full-text search index for documents
CREATE INDEX IF NOT EXISTS user_documents_search_idx ON user_documents 
  USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '')))
  WHERE deleted_at IS NULL;

-- Enable Row Level Security
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_documents

CREATE POLICY "Users can view their own documents"
  ON user_documents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can create their own documents"
  ON user_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own documents"
  ON user_documents
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can soft-delete their own documents"
  ON user_documents
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin policy for documents (optimus_prime and prime can view all)
CREATE POLICY "Admins can view all documents"
  ON user_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- RLS Policies for user_sheets

CREATE POLICY "Users can view their own sheets"
  ON user_sheets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can create their own sheets"
  ON user_sheets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sheets"
  ON user_sheets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can soft-delete their own sheets"
  ON user_sheets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin policy for sheets
CREATE POLICY "Admins can view all sheets"
  ON user_sheets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- RLS Policies for document_versions

CREATE POLICY "Users can view versions of their documents"
  ON document_versions
  FOR SELECT
  TO authenticated
  USING (
    (document_type = 'document' AND EXISTS (
      SELECT 1 FROM user_documents 
      WHERE user_documents.id = document_versions.document_id 
      AND user_documents.user_id = auth.uid()
    ))
    OR
    (document_type = 'sheet' AND EXISTS (
      SELECT 1 FROM user_sheets 
      WHERE user_sheets.id = document_versions.document_id 
      AND user_sheets.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create versions for their documents"
  ON document_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Admin policy for versions
CREATE POLICY "Admins can view all versions"
  ON document_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_documents_updated_at
  BEFORE UPDATE ON user_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

CREATE TRIGGER update_user_sheets_updated_at
  BEFORE UPDATE ON user_sheets
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- Function to create version snapshot automatically
CREATE OR REPLACE FUNCTION create_document_version_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create snapshot if content actually changed
  IF (TG_OP = 'UPDATE' AND (OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title)) THEN
    INSERT INTO document_versions (document_id, document_type, version_number, content_snapshot, created_by)
    VALUES (
      OLD.id,
      'document',
      OLD.version,
      jsonb_build_object(
        'id', OLD.id,
        'title', OLD.title,
        'content', OLD.content,
        'metadata', OLD.metadata,
        'version', OLD.version,
        'updated_at', OLD.updated_at
      ),
      auth.uid()
    );
    
    -- Increment version number
    NEW.version = OLD.version + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_sheet_version_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create snapshot if sheet_data actually changed
  IF (TG_OP = 'UPDATE' AND (OLD.sheet_data IS DISTINCT FROM NEW.sheet_data OR OLD.title IS DISTINCT FROM NEW.title)) THEN
    INSERT INTO document_versions (document_id, document_type, version_number, content_snapshot, created_by)
    VALUES (
      OLD.id,
      'sheet',
      OLD.version,
      jsonb_build_object(
        'id', OLD.id,
        'title', OLD.title,
        'sheet_data', OLD.sheet_data,
        'column_headers', OLD.column_headers,
        'row_count', OLD.row_count,
        'column_count', OLD.column_count,
        'metadata', OLD.metadata,
        'version', OLD.version,
        'updated_at', OLD.updated_at
      ),
      auth.uid()
    );
    
    -- Increment version number
    NEW.version = OLD.version + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic versioning
CREATE TRIGGER create_user_document_version
  BEFORE UPDATE ON user_documents
  FOR EACH ROW
  EXECUTE FUNCTION create_document_version_snapshot();

CREATE TRIGGER create_user_sheet_version
  BEFORE UPDATE ON user_sheets
  FOR EACH ROW
  EXECUTE FUNCTION create_sheet_version_snapshot();