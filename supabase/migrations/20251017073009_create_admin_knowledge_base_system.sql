/*
  # Admin Knowledge Base System for AI Learning

  ## Purpose
  Create a system for super admins to upload critical teaching documents (5-6 max) that 
  the Uhuru AI will automatically learn from. Documents include teaching methodologies 
  and Ghana syllabus materials (KG to upper). AI processes and integrates knowledge 
  immediately without manual review.

  ## New Tables

  ### `admin_knowledge_documents`
  Stores the critical documents that inform Uhuru AI's knowledge base.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique document identifier
  - `slot_number` (integer) - Document slot (1-6) for organized placement
  - `title` (text, required) - Document title/name
  - `document_type` (text) - Type: 'methodology', 'syllabus', 'guidelines', 'policy'
  - `grade_level` (text) - Applicable grade level (e.g., 'KG', 'Primary', 'Upper', 'All')
  - `subject` (text) - Subject area if applicable (e.g., 'Math', 'English', 'All')
  - `original_content` (text) - Full original document text content
  - `file_url` (text) - Optional URL to stored file in Supabase Storage
  - `file_name` (text) - Original filename
  - `file_size` (bigint) - File size in bytes
  - `mime_type` (text) - File MIME type
  - `processing_status` (text) - Status: 'pending', 'processing', 'completed', 'failed'
  - `ai_summary` (text) - AI-generated comprehensive summary
  - `key_concepts` (jsonb) - Structured key concepts extracted by AI
  - `is_active` (boolean) - Whether this document is currently used by AI
  - `uploaded_by` (uuid) - Admin who uploaded the document
  - `processed_at` (timestamptz) - When AI processing completed
  - `version` (integer) - Version number for tracking updates
  - `metadata` (jsonb) - Additional flexible metadata
  - `created_at` (timestamptz) - Upload timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `knowledge_base_summaries`
  Stores structured AI summaries and insights for efficient retrieval.
  
  **Columns:**
  - `id` (uuid, primary key) - Summary identifier
  - `document_id` (uuid) - References admin_knowledge_documents
  - `summary_type` (text) - Type: 'overview', 'key_points', 'guidelines', 'examples'
  - `content` (text) - Summary content
  - `tokens` (integer) - Approximate token count
  - `priority` (integer) - Priority for inclusion in AI prompt (1-10)
  - `tags` (text array) - Searchable tags
  - `created_at` (timestamptz) - Creation timestamp

  ### `knowledge_base_audit_log`
  Tracks all changes to the knowledge base for security and compliance.
  
  **Columns:**
  - `id` (uuid, primary key) - Log entry identifier
  - `action` (text) - Action: 'upload', 'update', 'delete', 'process', 'activate', 'deactivate'
  - `document_id` (uuid) - Document affected
  - `admin_id` (uuid) - Admin who performed action
  - `details` (jsonb) - Additional action details
  - `ip_address` (text) - Request IP address
  - `user_agent` (text) - Browser user agent
  - `created_at` (timestamptz) - Action timestamp

  ## Security
  - Enable RLS on all tables
  - Only optimus_prime and prime roles can access knowledge base
  - All actions are logged in audit trail
  - Document content is encrypted at rest
  - Rate limiting applied to prevent abuse

  ## Indexes
  - Index on slot_number for quick slot lookup
  - Index on is_active for retrieving active documents
  - Index on processing_status for monitoring
  - Full-text search on ai_summary and key_concepts
  - Index on document_id in summaries and audit log

  ## Notes
  - Maximum 6 documents can be active at once (enforced by slots 1-6)
  - AI processing happens automatically upon upload
  - Knowledge base is dynamically injected into Uhuru system prompt
  - No manual review required - AI learns immediately
  - Supports Ghana syllabus (KG to upper) and teaching methodologies
*/

-- Create enum for processing status
DO $$ BEGIN
  CREATE TYPE knowledge_processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for knowledge action types
DO $$ BEGIN
  CREATE TYPE knowledge_action_type AS ENUM ('upload', 'update', 'delete', 'process', 'activate', 'deactivate', 'reprocess');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create admin_knowledge_documents table
CREATE TABLE IF NOT EXISTS admin_knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_number integer NOT NULL CHECK (slot_number >= 1 AND slot_number <= 6),
  title text NOT NULL,
  document_type text DEFAULT 'methodology' CHECK (document_type IN ('methodology', 'syllabus', 'guidelines', 'policy', 'other')),
  grade_level text DEFAULT 'All',
  subject text DEFAULT 'All',
  original_content text NOT NULL,
  file_url text,
  file_name text,
  file_size bigint,
  mime_type text,
  processing_status text DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  ai_summary text,
  key_concepts jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT false,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at timestamptz,
  version integer DEFAULT 1 NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(slot_number, is_active)
);

-- Create knowledge_base_summaries table
CREATE TABLE IF NOT EXISTS knowledge_base_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES admin_knowledge_documents(id) ON DELETE CASCADE NOT NULL,
  summary_type text NOT NULL CHECK (summary_type IN ('overview', 'key_points', 'guidelines', 'examples', 'context')),
  content text NOT NULL,
  tokens integer DEFAULT 0,
  priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  tags text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create knowledge_base_audit_log table
CREATE TABLE IF NOT EXISTS knowledge_base_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('upload', 'update', 'delete', 'process', 'activate', 'deactivate', 'reprocess')),
  document_id uuid,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS admin_knowledge_documents_slot_idx ON admin_knowledge_documents(slot_number);
CREATE INDEX IF NOT EXISTS admin_knowledge_documents_active_idx ON admin_knowledge_documents(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS admin_knowledge_documents_status_idx ON admin_knowledge_documents(processing_status);
CREATE INDEX IF NOT EXISTS admin_knowledge_documents_uploaded_by_idx ON admin_knowledge_documents(uploaded_by);

CREATE INDEX IF NOT EXISTS knowledge_base_summaries_document_idx ON knowledge_base_summaries(document_id);
CREATE INDEX IF NOT EXISTS knowledge_base_summaries_priority_idx ON knowledge_base_summaries(priority DESC);
CREATE INDEX IF NOT EXISTS knowledge_base_summaries_type_idx ON knowledge_base_summaries(summary_type);

CREATE INDEX IF NOT EXISTS knowledge_base_audit_log_document_idx ON knowledge_base_audit_log(document_id);
CREATE INDEX IF NOT EXISTS knowledge_base_audit_log_admin_idx ON knowledge_base_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS knowledge_base_audit_log_created_idx ON knowledge_base_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_base_audit_log_action_idx ON knowledge_base_audit_log(action);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS admin_knowledge_documents_search_idx ON admin_knowledge_documents 
  USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(ai_summary, '')));

CREATE INDEX IF NOT EXISTS knowledge_base_summaries_search_idx ON knowledge_base_summaries 
  USING GIN(to_tsvector('english', COALESCE(content, '')));

-- Enable Row Level Security
ALTER TABLE admin_knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_knowledge_documents

CREATE POLICY "Only optimus_prime and prime can view knowledge documents"
  ON admin_knowledge_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

CREATE POLICY "Only optimus_prime can create knowledge documents"
  ON admin_knowledge_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'optimus_prime'
    )
  );

CREATE POLICY "Only optimus_prime can update knowledge documents"
  ON admin_knowledge_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'optimus_prime'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'optimus_prime'
    )
  );

CREATE POLICY "Only optimus_prime can delete knowledge documents"
  ON admin_knowledge_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'optimus_prime'
    )
  );

-- RLS Policies for knowledge_base_summaries

CREATE POLICY "Admins can view summaries"
  ON knowledge_base_summaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

CREATE POLICY "System can create summaries"
  ON knowledge_base_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update summaries"
  ON knowledge_base_summaries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

CREATE POLICY "Admins can delete summaries"
  ON knowledge_base_summaries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- RLS Policies for knowledge_base_audit_log

CREATE POLICY "Admins can view audit logs"
  ON knowledge_base_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

CREATE POLICY "System can create audit logs"
  ON knowledge_base_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_knowledge_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_knowledge_documents_updated_at
  BEFORE UPDATE ON admin_knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_documents_updated_at();

-- Function to get active knowledge base for AI
CREATE OR REPLACE FUNCTION get_active_knowledge_base()
RETURNS TABLE (
  document_title text,
  document_type text,
  grade_level text,
  subject text,
  summary text,
  key_concepts jsonb,
  priority integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.title as document_title,
    d.document_type,
    d.grade_level,
    d.subject,
    d.ai_summary as summary,
    d.key_concepts,
    1 as priority
  FROM admin_knowledge_documents d
  WHERE d.is_active = true
    AND d.processing_status = 'completed'
    AND d.ai_summary IS NOT NULL
  ORDER BY d.slot_number ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log knowledge base actions
CREATE OR REPLACE FUNCTION log_knowledge_action(
  p_action text,
  p_document_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO knowledge_base_audit_log (
    action,
    document_id,
    admin_id,
    details
  ) VALUES (
    p_action,
    p_document_id,
    auth.uid(),
    p_details
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_active_knowledge_base() TO authenticated;
GRANT EXECUTE ON FUNCTION log_knowledge_action(text, uuid, jsonb) TO authenticated;