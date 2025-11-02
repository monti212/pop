/*
  # Remove Slot Constraints from Knowledge Base System

  ## Purpose
  Remove the 6-slot limitation from the admin knowledge base system to allow
  unlimited document uploads. This migration removes the unique constraint on
  slot_number and updates the system to support a modern document library approach.

  ## Changes

  ### `admin_knowledge_documents` table
  - Remove UNIQUE constraint on (slot_number, is_active)
  - Make slot_number nullable for backward compatibility
  - Remove CHECK constraint limiting slots to 1-6
  - Add index on created_at for chronological sorting
  - Add index on title for search functionality

  ## Migration Strategy
  - Preserve existing documents with their current slot numbers
  - New documents will have auto-assigned slot numbers or NULL
  - No data loss - only constraint removal

  ## Notes
  - Existing slot numbers remain unchanged for legacy documents
  - System now supports unlimited document uploads
  - Slot numbers become optional metadata rather than required placement
*/

-- Drop the unique constraint on slot_number and is_active
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_knowledge_documents_slot_number_is_active_key'
  ) THEN
    ALTER TABLE admin_knowledge_documents 
    DROP CONSTRAINT admin_knowledge_documents_slot_number_is_active_key;
  END IF;
END $$;

-- Drop the check constraint limiting slot numbers to 1-6
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_knowledge_documents_slot_number_check'
  ) THEN
    ALTER TABLE admin_knowledge_documents 
    DROP CONSTRAINT admin_knowledge_documents_slot_number_check;
  END IF;
END $$;

-- Make slot_number nullable for new documents
ALTER TABLE admin_knowledge_documents 
ALTER COLUMN slot_number DROP NOT NULL;

-- Add new indexes for improved performance
CREATE INDEX IF NOT EXISTS admin_knowledge_documents_created_at_idx 
  ON admin_knowledge_documents(created_at DESC);

CREATE INDEX IF NOT EXISTS admin_knowledge_documents_title_idx 
  ON admin_knowledge_documents(title);

CREATE INDEX IF NOT EXISTS admin_knowledge_documents_is_active_created_idx 
  ON admin_knowledge_documents(is_active, created_at DESC);

-- Update the get_active_knowledge_base function to sort by created_at instead of slot_number
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
  ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to document the change
COMMENT ON COLUMN admin_knowledge_documents.slot_number IS 'Legacy slot number (1-6) - now optional, kept for backward compatibility';
