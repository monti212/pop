/*
  # Enhance Knowledge Base for Multi-Format Document Support
  
  ## Purpose
  Enhance the existing admin knowledge base system to support multiple document formats
  (PDF, DOC, DOCX, TXT, MD) with a 300MB file size limit. Add fields for better document
  tracking and processing metadata.
  
  ## Changes to Existing Tables
  
  ### `admin_knowledge_documents` - New Columns
  - `file_format` (text) - Document format: 'pdf', 'doc', 'docx', 'txt', 'md'
  - `page_count` (integer) - Number of pages in document (applicable for PDF/Word)
  - `word_count` (integer) - Approximate word count of extracted text
  - `extraction_method` (text) - Method used for text extraction
  - `extraction_quality_score` (decimal) - Quality score of text extraction (0-100)
  - `processing_duration_ms` (integer) - Time taken to process document in milliseconds
  - `token_count` (integer) - Approximate number of tokens in document
  - `estimated_cost` (decimal) - Estimated processing cost in USD
  - `error_message` (text) - Error details if processing failed
  - `chunk_count` (integer) - Number of chunks document was split into
  
  ## Constraints
  - File size must not exceed 314572800 bytes (300MB)
  - File format must be one of: pdf, doc, docx, txt, md
  - Quality score must be between 0 and 100
  
  ## Indexes
  - Index on file_format for filtering by document type
  - Index on word_count for finding large documents
  - Index on extraction_quality_score for quality filtering
  
  ## Notes
  - Existing documents will have NULL values for new fields
  - File size validation enforced at 300MB (314572800 bytes)
  - Supports educational document formats common in teaching
*/

-- Add new columns to admin_knowledge_documents table
DO $$ 
BEGIN
  -- Add file_format column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_knowledge_documents' AND column_name = 'file_format'
  ) THEN
    ALTER TABLE admin_knowledge_documents 
    ADD COLUMN file_format text CHECK (file_format IN ('pdf', 'doc', 'docx', 'txt', 'md', 'other'));
  END IF;

  -- Add page_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_knowledge_documents' AND column_name = 'page_count'
  ) THEN
    ALTER TABLE admin_knowledge_documents 
    ADD COLUMN page_count integer DEFAULT 0;
  END IF;

  -- Add word_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_knowledge_documents' AND column_name = 'word_count'
  ) THEN
    ALTER TABLE admin_knowledge_documents 
    ADD COLUMN word_count integer DEFAULT 0;
  END IF;

  -- Add extraction_method column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_knowledge_documents' AND column_name = 'extraction_method'
  ) THEN
    ALTER TABLE admin_knowledge_documents 
    ADD COLUMN extraction_method text;
  END IF;

  -- Add extraction_quality_score column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_knowledge_documents' AND column_name = 'extraction_quality_score'
  ) THEN
    ALTER TABLE admin_knowledge_documents 
    ADD COLUMN extraction_quality_score decimal(5,2) CHECK (extraction_quality_score >= 0 AND extraction_quality_score <= 100);
  END IF;

  -- Add processing_duration_ms column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_knowledge_documents' AND column_name = 'processing_duration_ms'
  ) THEN
    ALTER TABLE admin_knowledge_documents 
    ADD COLUMN processing_duration_ms integer DEFAULT 0;
  END IF;

  -- Add token_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_knowledge_documents' AND column_name = 'token_count'
  ) THEN
    ALTER TABLE admin_knowledge_documents 
    ADD COLUMN token_count integer DEFAULT 0;
  END IF;

  -- Add estimated_cost column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_knowledge_documents' AND column_name = 'estimated_cost'
  ) THEN
    ALTER TABLE admin_knowledge_documents 
    ADD COLUMN estimated_cost decimal(10,4) DEFAULT 0.0000;
  END IF;

  -- Add error_message column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_knowledge_documents' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE admin_knowledge_documents 
    ADD COLUMN error_message text;
  END IF;

  -- Add chunk_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_knowledge_documents' AND column_name = 'chunk_count'
  ) THEN
    ALTER TABLE admin_knowledge_documents 
    ADD COLUMN chunk_count integer DEFAULT 1;
  END IF;
END $$;

-- Add constraint for 300MB file size limit (314572800 bytes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_knowledge_documents_file_size_limit'
  ) THEN
    ALTER TABLE admin_knowledge_documents 
    ADD CONSTRAINT admin_knowledge_documents_file_size_limit 
    CHECK (file_size IS NULL OR file_size <= 314572800);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS admin_knowledge_documents_file_format_idx 
  ON admin_knowledge_documents(file_format);

CREATE INDEX IF NOT EXISTS admin_knowledge_documents_word_count_idx 
  ON admin_knowledge_documents(word_count DESC);

CREATE INDEX IF NOT EXISTS admin_knowledge_documents_quality_score_idx 
  ON admin_knowledge_documents(extraction_quality_score DESC) 
  WHERE extraction_quality_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS admin_knowledge_documents_token_count_idx 
  ON admin_knowledge_documents(token_count DESC);

CREATE INDEX IF NOT EXISTS admin_knowledge_documents_estimated_cost_idx 
  ON admin_knowledge_documents(estimated_cost DESC);

-- Create function to validate document format from mime type
CREATE OR REPLACE FUNCTION get_file_format_from_mime(mime_type text)
RETURNS text AS $$
BEGIN
  RETURN CASE 
    WHEN mime_type = 'application/pdf' THEN 'pdf'
    WHEN mime_type IN ('application/msword', 'application/vnd.ms-word') THEN 'doc'
    WHEN mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' THEN 'docx'
    WHEN mime_type IN ('text/plain', 'text/markdown') THEN 'txt'
    WHEN mime_type = 'text/markdown' THEN 'md'
    ELSE 'other'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to calculate extraction quality score
CREATE OR REPLACE FUNCTION calculate_extraction_quality(
  extracted_text text,
  word_count integer,
  has_errors boolean DEFAULT false
)
RETURNS decimal AS $$
DECLARE
  base_score decimal := 100.0;
  text_length integer;
BEGIN
  IF extracted_text IS NULL OR word_count = 0 THEN
    RETURN 0.0;
  END IF;

  text_length := length(extracted_text);
  
  -- Reduce score if there are errors
  IF has_errors THEN
    base_score := base_score - 30.0;
  END IF;
  
  -- Reduce score if text seems too short relative to word count
  IF text_length < word_count * 3 THEN
    base_score := base_score - 20.0;
  END IF;
  
  -- Reduce score if text has too many special characters (might indicate poor extraction)
  IF text_length > 0 AND (text_length - length(regexp_replace(extracted_text, '[^a-zA-Z0-9\s]', '', 'g'))) * 100.0 / text_length > 30 THEN
    base_score := base_score - 15.0;
  END IF;
  
  RETURN GREATEST(0.0, LEAST(100.0, base_score));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_file_format_from_mime(text) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_extraction_quality(text, integer, boolean) TO authenticated;

-- Add helpful comments
COMMENT ON COLUMN admin_knowledge_documents.file_format IS 'Document format: pdf, doc, docx, txt, md, other';
COMMENT ON COLUMN admin_knowledge_documents.page_count IS 'Number of pages in document (for paginated formats)';
COMMENT ON COLUMN admin_knowledge_documents.word_count IS 'Approximate word count of extracted text content';
COMMENT ON COLUMN admin_knowledge_documents.extraction_method IS 'Method used for text extraction (e.g., pdfjs, mammoth, textract)';
COMMENT ON COLUMN admin_knowledge_documents.extraction_quality_score IS 'Quality score of text extraction from 0-100, higher is better';
COMMENT ON COLUMN admin_knowledge_documents.processing_duration_ms IS 'Total processing time in milliseconds';
COMMENT ON COLUMN admin_knowledge_documents.token_count IS 'Approximate number of tokens for AI processing';
COMMENT ON COLUMN admin_knowledge_documents.estimated_cost IS 'Estimated processing cost in USD';
COMMENT ON COLUMN admin_knowledge_documents.error_message IS 'Error details if processing failed';
COMMENT ON COLUMN admin_knowledge_documents.chunk_count IS 'Number of chunks document was split into for processing';
