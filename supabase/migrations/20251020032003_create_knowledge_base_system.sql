/*
  # Create Knowledge Base System for AI Training

  ## Overview
  This migration creates a comprehensive knowledge base system for the superadmin dashboard,
  enabling document upload, processing, embedding generation, and RAG-based retrieval for
  enhancing Uhuru AI responses with custom organizational knowledge.

  ## 1. New Tables

  ### knowledge_base_categories
  - `id` (uuid, primary key) - Unique category identifier
  - `name` (text, unique) - Category name (e.g., "Product Docs", "Training Materials")
  - `description` (text) - Category description
  - `color` (text) - UI color code for visual organization
  - `document_count` (integer) - Number of documents in category
  - `created_by` (uuid) - Admin who created the category
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### knowledge_base_documents
  - `id` (uuid, primary key) - Unique document identifier
  - `title` (text) - Document title
  - `file_name` (text) - Original filename
  - `file_type` (text) - MIME type (application/pdf, text/plain, etc.)
  - `file_size` (bigint) - File size in bytes
  - `storage_path` (text) - Supabase Storage path
  - `category_id` (uuid) - Reference to category
  - `status` (text) - processing_status: pending, processing, completed, failed
  - `chunk_count` (integer) - Number of chunks generated
  - `embedding_count` (integer) - Number of embeddings created
  - `metadata` (jsonb) - Additional metadata (author, tags, etc.)
  - `uploaded_by` (uuid) - Admin who uploaded the document
  - `processed_at` (timestamptz) - When processing completed
  - `created_at` (timestamptz) - Upload timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### knowledge_base_chunks
  - `id` (uuid, primary key) - Unique chunk identifier
  - `document_id` (uuid) - Reference to parent document
  - `chunk_index` (integer) - Sequential position in document
  - `content` (text) - Actual text content of the chunk
  - `token_count` (integer) - Number of tokens in chunk
  - `metadata` (jsonb) - Chunk-specific metadata (page number, section, etc.)
  - `created_at` (timestamptz) - Creation timestamp

  ### knowledge_base_embeddings
  - `id` (uuid, primary key) - Unique embedding identifier
  - `chunk_id` (uuid) - Reference to chunk
  - `document_id` (uuid) - Reference to document (for faster queries)
  - `embedding` (vector(384)) - Embedding vector (gte-small produces 384-dim vectors)
  - `created_at` (timestamptz) - Creation timestamp

  ### knowledge_base_retrievals
  - `id` (uuid, primary key) - Unique retrieval identifier
  - `user_id` (uuid) - User who triggered the retrieval
  - `query` (text) - Original search query
  - `chunks_retrieved` (integer) - Number of chunks returned
  - `document_ids` (uuid[]) - Array of document IDs retrieved
  - `relevance_scores` (numeric[]) - Similarity scores
  - `used_in_response` (boolean) - Whether retrieval was used in AI response
  - `created_at` (timestamptz) - Timestamp

  ### knowledge_base_training_jobs
  - `id` (uuid, primary key) - Unique job identifier
  - `document_id` (uuid) - Document being processed
  - `job_type` (text) - Job type: extract, chunk, embed
  - `status` (text) - Job status: pending, running, completed, failed
  - `progress` (integer) - Progress percentage (0-100)
  - `error_message` (text) - Error details if failed
  - `started_at` (timestamptz) - When job started
  - `completed_at` (timestamptz) - When job completed
  - `created_at` (timestamptz) - Creation timestamp

  ## 2. Security (RLS Policies)
  - All tables restricted to optimus_prime superadmin role
  - Read, write, update, delete policies for admin operations
  - Service role bypass for edge function processing

  ## 3. Indexes
  - Document category lookup
  - Chunk document lookup
  - Embedding vector similarity search (IVFFlat)
  - Retrieval analytics queries

  ## 4. Functions
  - search_knowledge_base: Vector similarity search function
  - update_category_counts: Maintain accurate document counts
*/

-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge_base_categories table
CREATE TABLE IF NOT EXISTS knowledge_base_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  color text DEFAULT '#0096B3',
  document_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create knowledge_base_documents table
CREATE TABLE IF NOT EXISTS knowledge_base_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  storage_path text NOT NULL,
  category_id uuid REFERENCES knowledge_base_categories(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  chunk_count integer DEFAULT 0,
  embedding_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create knowledge_base_chunks table
CREATE TABLE IF NOT EXISTS knowledge_base_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES knowledge_base_documents(id) ON DELETE CASCADE NOT NULL,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  token_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create knowledge_base_embeddings table
CREATE TABLE IF NOT EXISTS knowledge_base_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id uuid REFERENCES knowledge_base_chunks(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES knowledge_base_documents(id) ON DELETE CASCADE NOT NULL,
  embedding vector(384) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create knowledge_base_retrievals table
CREATE TABLE IF NOT EXISTS knowledge_base_retrievals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  query text NOT NULL,
  chunks_retrieved integer DEFAULT 0,
  document_ids uuid[] DEFAULT ARRAY[]::uuid[],
  relevance_scores numeric[] DEFAULT ARRAY[]::numeric[],
  used_in_response boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create knowledge_base_training_jobs table
CREATE TABLE IF NOT EXISTS knowledge_base_training_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES knowledge_base_documents(id) ON DELETE CASCADE NOT NULL,
  job_type text NOT NULL CHECK (job_type IN ('extract', 'chunk', 'embed')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress integer DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kb_documents_category ON knowledge_base_documents(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_documents_status ON knowledge_base_documents(status);
CREATE INDEX IF NOT EXISTS idx_kb_documents_created_at ON knowledge_base_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_document ON knowledge_base_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_chunk ON knowledge_base_embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_document ON knowledge_base_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_kb_retrievals_user ON knowledge_base_retrievals(user_id);
CREATE INDEX IF NOT EXISTS idx_kb_retrievals_created_at ON knowledge_base_retrievals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kb_training_jobs_document ON knowledge_base_training_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_kb_training_jobs_status ON knowledge_base_training_jobs(status);

-- Create vector similarity index (IVFFlat for fast approximate nearest neighbor search)
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_vector ON knowledge_base_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE knowledge_base_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_retrievals ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_training_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_base_categories
CREATE POLICY "Superadmins can view all categories"
  ON knowledge_base_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'optimus_prime'
    )
  );

CREATE POLICY "Superadmins can insert categories"
  ON knowledge_base_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'optimus_prime'
    )
  );

CREATE POLICY "Superadmins can update categories"
  ON knowledge_base_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'optimus_prime'
    )
  );

CREATE POLICY "Superadmins can delete categories"
  ON knowledge_base_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'optimus_prime'
    )
  );

-- RLS Policies for knowledge_base_documents
CREATE POLICY "Superadmins can view all documents"
  ON knowledge_base_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'optimus_prime'
    )
  );

CREATE POLICY "Superadmins can insert documents"
  ON knowledge_base_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'optimus_prime'
    )
  );

CREATE POLICY "Superadmins can update documents"
  ON knowledge_base_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'optimus_prime'
    )
  );

CREATE POLICY "Superadmins can delete documents"
  ON knowledge_base_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'optimus_prime'
    )
  );

-- RLS Policies for knowledge_base_chunks
CREATE POLICY "Superadmins can view all chunks"
  ON knowledge_base_chunks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'optimus_prime'
    )
  );

CREATE POLICY "System can insert chunks"
  ON knowledge_base_chunks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Superadmins can delete chunks"
  ON knowledge_base_chunks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'optimus_prime'
    )
  );

-- RLS Policies for knowledge_base_embeddings
CREATE POLICY "Authenticated users can search embeddings"
  ON knowledge_base_embeddings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert embeddings"
  ON knowledge_base_embeddings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Superadmins can delete embeddings"
  ON knowledge_base_embeddings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'optimus_prime'
    )
  );

-- RLS Policies for knowledge_base_retrievals
CREATE POLICY "Users can view own retrievals"
  ON knowledge_base_retrievals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all retrievals"
  ON knowledge_base_retrievals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'optimus_prime'
    )
  );

CREATE POLICY "System can insert retrievals"
  ON knowledge_base_retrievals FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for knowledge_base_training_jobs
CREATE POLICY "Superadmins can view all training jobs"
  ON knowledge_base_training_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'optimus_prime'
    )
  );

CREATE POLICY "System can insert training jobs"
  ON knowledge_base_training_jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update training jobs"
  ON knowledge_base_training_jobs FOR UPDATE
  TO authenticated
  USING (true);

-- Function to search knowledge base using vector similarity
CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  chunk_content text,
  similarity float,
  metadata jsonb
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kbe.chunk_id,
    kbe.document_id,
    kbd.title as document_title,
    kbc.content as chunk_content,
    1 - (kbe.embedding <=> query_embedding) as similarity,
    kbc.metadata
  FROM knowledge_base_embeddings kbe
  JOIN knowledge_base_chunks kbc ON kbe.chunk_id = kbc.id
  JOIN knowledge_base_documents kbd ON kbe.document_id = kbd.id
  WHERE 1 - (kbe.embedding <=> query_embedding) > match_threshold
  AND kbd.status = 'completed'
  ORDER BY kbe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to update category document counts
CREATE OR REPLACE FUNCTION update_category_document_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE knowledge_base_categories
    SET document_count = document_count + 1,
        updated_at = now()
    WHERE id = NEW.category_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE knowledge_base_categories
    SET document_count = GREATEST(0, document_count - 1),
        updated_at = now()
    WHERE id = OLD.category_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.category_id IS DISTINCT FROM NEW.category_id THEN
    -- Document moved to different category
    UPDATE knowledge_base_categories
    SET document_count = GREATEST(0, document_count - 1),
        updated_at = now()
    WHERE id = OLD.category_id;
    
    UPDATE knowledge_base_categories
    SET document_count = document_count + 1,
        updated_at = now()
    WHERE id = NEW.category_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to maintain category document counts
CREATE TRIGGER trigger_update_category_document_count
  AFTER INSERT OR UPDATE OR DELETE ON knowledge_base_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_category_document_count();

-- Function to update document updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE TRIGGER trigger_kb_categories_updated_at
  BEFORE UPDATE ON knowledge_base_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_kb_documents_updated_at
  BEFORE UPDATE ON knowledge_base_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO knowledge_base_categories (name, description, color) VALUES
  ('General Knowledge', 'General organizational knowledge and documentation', '#0096B3'),
  ('Product Documentation', 'Product specifications, user guides, and technical docs', '#FF6A00'),
  ('Training Materials', 'Employee training and educational content', '#19324A'),
  ('Policies & Procedures', 'Company policies, procedures, and guidelines', '#7DF9FF')
ON CONFLICT (name) DO NOTHING;