/*
  # Create Class Documents Management System

  ## Summary
  Creates a comprehensive document management system for organizing class-related materials.
  Teachers can organize lesson plans, notes, reports, and resources in a hierarchical folder
  structure tied to their classes.

  ## New Tables

  1. **class_folders**
     - Hierarchical folder structure for organizing documents
     - Automatically created default folders (Lesson Plans, Notes, Reports, Resources)
     - Supports nested subfolders
     - Tied to specific classes

  2. **class_documents**
     - Stores all class-related documents (lesson plans, notes, reports)
     - Links to class_folders for organization
     - Supports file uploads and text content
     - Metadata tracking for document properties
     - Version tracking and edit history

  ## Features
  - Auto-create default folders when class is created
  - Teachers can only access their own class documents
  - Admins can view all documents for monitoring
  - Soft delete support for document recovery
  - Document type categorization

  ## Security
  - RLS enabled on all tables
  - Teachers can only manage documents for their classes
  - Admins have read access to all documents
  - Foreign key constraints ensure data integrity
*/

-- ============================================================================
-- 1. CLASS_FOLDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS class_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  
  -- Folder Information
  folder_name text NOT NULL CHECK (length(trim(folder_name)) > 0),
  folder_type text CHECK (folder_type IN ('lesson_plans', 'notes', 'reports', 'resources', 'custom')),
  parent_folder_id uuid REFERENCES class_folders(id) ON DELETE CASCADE,
  
  -- Hierarchy and Path
  folder_path text NOT NULL DEFAULT '/',
  folder_depth integer DEFAULT 0 CHECK (folder_depth >= 0),
  
  -- Display Properties
  color text,
  icon text,
  sort_order integer DEFAULT 0,
  
  -- Document Counts
  document_count integer DEFAULT 0 CHECK (document_count >= 0),
  
  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz,
  
  -- Prevent duplicate folder names within same parent
  UNIQUE(class_id, parent_folder_id, folder_name)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS class_folders_class_id_idx ON class_folders(class_id);
CREATE INDEX IF NOT EXISTS class_folders_parent_idx ON class_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS class_folders_type_idx ON class_folders(folder_type);
CREATE INDEX IF NOT EXISTS class_folders_path_idx ON class_folders(folder_path);

-- Enable RLS
ALTER TABLE class_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for class_folders
DROP POLICY IF EXISTS "Teachers can manage folders for their classes" ON class_folders;
CREATE POLICY "Teachers can manage folders for their classes"
  ON class_folders FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_folders.class_id
      AND classes.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_folders.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all class folders" ON class_folders;
CREATE POLICY "Admins can view all class folders"
  ON class_folders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'admin', 'supa_admin')
    )
  );

-- ============================================================================
-- 2. CLASS_DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS class_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  folder_id uuid REFERENCES class_folders(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Document Information
  title text NOT NULL CHECK (length(trim(title)) > 0),
  document_type text NOT NULL CHECK (document_type IN ('lesson_plan', 'note', 'report', 'resource', 'other')),
  
  -- Content Storage
  content text,
  file_url text,
  storage_path text,
  file_extension text,
  file_size integer,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  tags text[] DEFAULT ARRAY[]::text[],
  
  -- Lesson Plan Specific (from existing system)
  is_lesson_plan boolean DEFAULT false,
  lesson_plan_confidence decimal(3,2) DEFAULT 0.0,
  lesson_plan_metadata jsonb DEFAULT '{}',
  conversation_id uuid,
  message_id uuid,
  auto_saved boolean DEFAULT false,
  
  -- Version Control
  version integer DEFAULT 1,
  parent_version_id uuid REFERENCES class_documents(id) ON DELETE SET NULL,
  
  -- Access Tracking
  view_count integer DEFAULT 0,
  download_count integer DEFAULT 0,
  last_accessed_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS class_documents_class_id_idx ON class_documents(class_id);
CREATE INDEX IF NOT EXISTS class_documents_folder_id_idx ON class_documents(folder_id);
CREATE INDEX IF NOT EXISTS class_documents_user_id_idx ON class_documents(user_id);
CREATE INDEX IF NOT EXISTS class_documents_type_idx ON class_documents(document_type);
CREATE INDEX IF NOT EXISTS class_documents_lesson_plan_idx ON class_documents(is_lesson_plan) WHERE is_lesson_plan = true;
CREATE INDEX IF NOT EXISTS class_documents_created_at_idx ON class_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS class_documents_tags_idx ON class_documents USING gin(tags);

-- Enable RLS
ALTER TABLE class_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for class_documents
DROP POLICY IF EXISTS "Teachers can manage documents for their classes" ON class_documents;
CREATE POLICY "Teachers can manage documents for their classes"
  ON class_documents FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_documents.class_id
      AND classes.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_documents.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all class documents" ON class_documents;
CREATE POLICY "Admins can view all class documents"
  ON class_documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'admin', 'supa_admin')
    )
  );

-- ============================================================================
-- 3. TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to auto-create default folders when a class is created
CREATE OR REPLACE FUNCTION create_default_class_folders()
RETURNS TRIGGER AS $$
BEGIN
  -- Create Lesson Plans folder
  INSERT INTO class_folders (class_id, folder_name, folder_type, folder_path, icon, color, sort_order)
  VALUES (NEW.id, 'Lesson Plans', 'lesson_plans', '/Lesson Plans', '📚', '#10B981', 1);
  
  -- Create Notes folder
  INSERT INTO class_folders (class_id, folder_name, folder_type, folder_path, icon, color, sort_order)
  VALUES (NEW.id, 'Notes', 'notes', '/Notes', '📝', '#3B82F6', 2);
  
  -- Create Reports folder
  INSERT INTO class_folders (class_id, folder_name, folder_type, folder_path, icon, color, sort_order)
  VALUES (NEW.id, 'Reports', 'reports', '/Reports', '📊', '#8B5CF6', 3);
  
  -- Create Resources folder
  INSERT INTO class_folders (class_id, folder_name, folder_type, folder_path, icon, color, sort_order)
  VALUES (NEW.id, 'Resources', 'resources', '/Resources', '🗂️', '#F59E0B', 4);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_class_folders_trigger ON classes;
CREATE TRIGGER create_class_folders_trigger
  AFTER INSERT ON classes
  FOR EACH ROW
  EXECUTE FUNCTION create_default_class_folders();

-- Function to update folder document count
CREATE OR REPLACE FUNCTION update_folder_document_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.folder_id IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE class_folders
      SET document_count = document_count + 1
      WHERE id = NEW.folder_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Document moved to different folder
    IF OLD.folder_id IS DISTINCT FROM NEW.folder_id THEN
      IF OLD.folder_id IS NOT NULL THEN
        UPDATE class_folders
        SET document_count = document_count - 1
        WHERE id = OLD.folder_id AND document_count > 0;
      END IF;
      IF NEW.folder_id IS NOT NULL AND NEW.deleted_at IS NULL THEN
        UPDATE class_folders
        SET document_count = document_count + 1
        WHERE id = NEW.folder_id;
      END IF;
    END IF;
    -- Document soft deleted or restored
    IF OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
      IF NEW.deleted_at IS NOT NULL AND NEW.folder_id IS NOT NULL THEN
        UPDATE class_folders
        SET document_count = document_count - 1
        WHERE id = NEW.folder_id AND document_count > 0;
      ELSIF NEW.deleted_at IS NULL AND NEW.folder_id IS NOT NULL THEN
        UPDATE class_folders
        SET document_count = document_count + 1
        WHERE id = NEW.folder_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.folder_id IS NOT NULL AND OLD.deleted_at IS NULL THEN
      UPDATE class_folders
      SET document_count = document_count - 1
      WHERE id = OLD.folder_id AND document_count > 0;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maintain_folder_document_count ON class_documents;
CREATE TRIGGER maintain_folder_document_count
  AFTER INSERT OR UPDATE OR DELETE ON class_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_document_count();

-- Function to set user_id automatically
CREATE OR REPLACE FUNCTION set_document_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.user_id = auth.uid();
    NEW.created_at = now();
    NEW.updated_at = now();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_document_metadata ON class_documents;
CREATE TRIGGER set_document_metadata
  BEFORE INSERT OR UPDATE ON class_documents
  FOR EACH ROW
  EXECUTE FUNCTION set_document_user_id();

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_class_folders_updated_at ON class_folders;
CREATE TRIGGER update_class_folders_updated_at
  BEFORE UPDATE ON class_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to get all documents for a class
CREATE OR REPLACE FUNCTION get_class_documents_with_folders(
  p_class_id uuid
)
RETURNS TABLE (
  document_id uuid,
  document_title text,
  document_type text,
  folder_id uuid,
  folder_name text,
  created_at timestamptz,
  file_size integer,
  is_lesson_plan boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cd.id,
    cd.title,
    cd.document_type,
    cf.id,
    cf.folder_name,
    cd.created_at,
    cd.file_size,
    cd.is_lesson_plan
  FROM class_documents cd
  LEFT JOIN class_folders cf ON cd.folder_id = cf.id
  WHERE cd.class_id = p_class_id
    AND cd.deleted_at IS NULL
  ORDER BY cf.sort_order, cd.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get document statistics for a class
CREATE OR REPLACE FUNCTION get_class_document_stats(
  p_class_id uuid
)
RETURNS TABLE (
  total_documents integer,
  lesson_plans_count integer,
  notes_count integer,
  reports_count integer,
  resources_count integer,
  recent_document_title text,
  recent_document_date timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::integer as total_documents,
    COUNT(*) FILTER (WHERE document_type = 'lesson_plan')::integer as lesson_plans_count,
    COUNT(*) FILTER (WHERE document_type = 'note')::integer as notes_count,
    COUNT(*) FILTER (WHERE document_type = 'report')::integer as reports_count,
    COUNT(*) FILTER (WHERE document_type = 'resource')::integer as resources_count,
    (SELECT title FROM class_documents WHERE class_id = p_class_id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as recent_document_title,
    (SELECT created_at FROM class_documents WHERE class_id = p_class_id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as recent_document_date
  FROM class_documents
  WHERE class_id = p_class_id
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE class_folders IS 'Hierarchical folder structure for organizing class documents';
COMMENT ON TABLE class_documents IS 'Class-related documents including lesson plans, notes, reports, and resources';

COMMENT ON COLUMN class_folders.folder_type IS 'Folder category: lesson_plans, notes, reports, resources, or custom';
COMMENT ON COLUMN class_folders.folder_path IS 'Full path from root for breadcrumb navigation';
COMMENT ON COLUMN class_documents.document_type IS 'Document category: lesson_plan, note, report, resource, or other';
COMMENT ON COLUMN class_documents.auto_saved IS 'True if document was auto-saved from chat conversation';
COMMENT ON COLUMN class_documents.conversation_id IS 'Link to chat conversation where document was created';
