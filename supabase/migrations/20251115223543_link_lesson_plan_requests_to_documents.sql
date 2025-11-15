/*
  # Link Lesson Plan Requests to User Documents

  ## Summary
  Adds a document_id column to lesson_plan_requests table to link generated
  lesson plans to their saved documents in user_documents table. Also adds
  a status column to track generation progress.

  ## Changes
  - Add document_id column to reference user_documents
  - Add status enum column (pending, generating, completed, failed)
  - Add generated_at timestamp for tracking completion time
  - Add indexes for efficient querying
  - Update existing records to have 'completed' status if applicable

  ## Security
  - Maintains existing RLS policies
  - No changes to access control
*/

-- Create status enum type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lesson_plan_status') THEN
    CREATE TYPE lesson_plan_status AS ENUM ('pending', 'generating', 'completed', 'failed');
  END IF;
END $$;

-- Add new columns to lesson_plan_requests table if they don't exist
DO $$
BEGIN
  -- Check and add document_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_plan_requests' AND column_name = 'document_id'
  ) THEN
    ALTER TABLE lesson_plan_requests
    ADD COLUMN document_id uuid REFERENCES user_documents(id) ON DELETE SET NULL;
  END IF;

  -- Check and add status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_plan_requests' AND column_name = 'status'
  ) THEN
    ALTER TABLE lesson_plan_requests
    ADD COLUMN status lesson_plan_status DEFAULT 'pending';
  END IF;

  -- Check and add generated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_plan_requests' AND column_name = 'generated_at'
  ) THEN
    ALTER TABLE lesson_plan_requests
    ADD COLUMN generated_at timestamptz;
  END IF;

  -- Check and add error_message column for failed generations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_plan_requests' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE lesson_plan_requests
    ADD COLUMN error_message text;
  END IF;
END $$;

-- Create indexes for efficient querying if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'lesson_plan_requests_document_id_idx'
  ) THEN
    CREATE INDEX lesson_plan_requests_document_id_idx ON lesson_plan_requests(document_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'lesson_plan_requests_status_idx'
  ) THEN
    CREATE INDEX lesson_plan_requests_status_idx ON lesson_plan_requests(status);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'lesson_plan_requests_teacher_status_idx'
  ) THEN
    CREATE INDEX lesson_plan_requests_teacher_status_idx ON lesson_plan_requests(teacher_id, status);
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN lesson_plan_requests.document_id IS 'Reference to the generated lesson plan document in user_documents';
COMMENT ON COLUMN lesson_plan_requests.status IS 'Status of lesson plan generation: pending, generating, completed, or failed';
COMMENT ON COLUMN lesson_plan_requests.generated_at IS 'Timestamp when the lesson plan was successfully generated';
COMMENT ON COLUMN lesson_plan_requests.error_message IS 'Error message if generation failed';
