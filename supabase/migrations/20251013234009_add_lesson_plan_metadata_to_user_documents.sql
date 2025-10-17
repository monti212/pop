/*
  # Add Lesson Plan Metadata to User Documents
  
  ## Summary
  Extends the user_documents table to support lesson plan detection and organization.
  Adds fields for tracking lesson plans that are auto-saved from chat conversations,
  including detection confidence, structured data, and conversation references.
  
  ## Changes
  - Add is_lesson_plan boolean flag
  - Add lesson_plan_confidence score (0-1)
  - Add lesson_plan_metadata JSONB for structured data (subject, grade, sections)
  - Add conversation_id reference to link back to original chat
  - Add message_id reference to link to specific message
  - Add auto_saved flag to distinguish auto-saved vs manually uploaded
  - Add indexes for efficient querying
  
  ## Security
  - Maintains existing RLS policies
  - No changes to access control
*/

-- Add new columns to user_documents table if they don't exist
DO $$
BEGIN
  -- Check and add is_lesson_plan column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_documents' AND column_name = 'is_lesson_plan'
  ) THEN
    ALTER TABLE user_documents ADD COLUMN is_lesson_plan boolean DEFAULT false;
  END IF;

  -- Check and add lesson_plan_confidence column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_documents' AND column_name = 'lesson_plan_confidence'
  ) THEN
    ALTER TABLE user_documents ADD COLUMN lesson_plan_confidence decimal(3,2) DEFAULT 0.0;
  END IF;

  -- Check and add lesson_plan_metadata column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_documents' AND column_name = 'lesson_plan_metadata'
  ) THEN
    ALTER TABLE user_documents ADD COLUMN lesson_plan_metadata jsonb DEFAULT '{}';
  END IF;

  -- Check and add conversation_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_documents' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE user_documents ADD COLUMN conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL;
  END IF;

  -- Check and add message_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_documents' AND column_name = 'message_id'
  ) THEN
    ALTER TABLE user_documents ADD COLUMN message_id uuid REFERENCES messages(id) ON DELETE SET NULL;
  END IF;

  -- Check and add auto_saved column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_documents' AND column_name = 'auto_saved'
  ) THEN
    ALTER TABLE user_documents ADD COLUMN auto_saved boolean DEFAULT false;
  END IF;

  -- Check and add date_folder column for organizing by date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_documents' AND column_name = 'date_folder'
  ) THEN
    ALTER TABLE user_documents ADD COLUMN date_folder text;
  END IF;
END $$;

-- Create indexes for efficient querying if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'user_documents_is_lesson_plan_idx'
  ) THEN
    CREATE INDEX user_documents_is_lesson_plan_idx ON user_documents(is_lesson_plan) WHERE is_lesson_plan = true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'user_documents_conversation_id_idx'
  ) THEN
    CREATE INDEX user_documents_conversation_id_idx ON user_documents(conversation_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'user_documents_auto_saved_idx'
  ) THEN
    CREATE INDEX user_documents_auto_saved_idx ON user_documents(auto_saved) WHERE auto_saved = true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'user_documents_date_folder_idx'
  ) THEN
    CREATE INDEX user_documents_date_folder_idx ON user_documents(date_folder);
  END IF;
END $$;

-- Add helpful comment
COMMENT ON COLUMN user_documents.is_lesson_plan IS 'Flag indicating if document is a detected lesson plan';
COMMENT ON COLUMN user_documents.lesson_plan_confidence IS 'Confidence score (0-1) of lesson plan detection';
COMMENT ON COLUMN user_documents.lesson_plan_metadata IS 'Structured lesson plan data: subject, grade, sections, etc.';
COMMENT ON COLUMN user_documents.conversation_id IS 'Reference to conversation where lesson plan was generated';
COMMENT ON COLUMN user_documents.message_id IS 'Reference to specific message containing lesson plan';
COMMENT ON COLUMN user_documents.auto_saved IS 'True if document was auto-saved from chat';
COMMENT ON COLUMN user_documents.date_folder IS 'Date-based folder path for organization (e.g., "Lesson Plans/2025/01/15")';
