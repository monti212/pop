/*
  # Fix lesson_plan_requests Table
  
  ## Problem
  The lesson_plan_requests table was referencing non-existent user_documents table,
  causing schema cache errors and preventing the table from being created properly.
  
  ## Solution
  1. Drop the broken table if it exists
  2. Recreate it with correct reference to class_documents table
  3. Add all necessary columns including status tracking
  
  ## Changes
  - Drops and recreates lesson_plan_requests table
  - References class_documents instead of user_documents
  - Includes status enum for tracking generation progress
  - Adds RLS policies for teacher access
  - Creates indexes for performance
*/

-- Drop the broken table if it exists
DROP TABLE IF EXISTS lesson_plan_requests CASCADE;

-- Create status enum type for lesson plans
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lesson_plan_status') THEN
    CREATE TYPE lesson_plan_status AS ENUM ('pending', 'generating', 'completed', 'failed');
  END IF;
END $$;

-- Create lesson_plan_requests table with correct references
CREATE TABLE IF NOT EXISTS lesson_plan_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_ids UUID[] NOT NULL,
  
  -- Request Details
  topic TEXT NOT NULL,
  subject TEXT,
  duration_minutes INTEGER DEFAULT 45,
  lesson_date DATE,
  
  -- Customization Parameters
  differentiation_level TEXT DEFAULT 'moderate',
  include_accommodations BOOLEAN DEFAULT true,
  focus_areas TEXT[],
  
  -- Generated Content
  lesson_plan_content TEXT,
  document_id UUID REFERENCES class_documents(id) ON DELETE SET NULL,
  
  -- Status and Metrics
  status lesson_plan_status DEFAULT 'pending',
  generated_at TIMESTAMPTZ,
  error_message TEXT,
  effectiveness_rating INTEGER,
  teacher_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_rating CHECK (effectiveness_rating IS NULL OR (effectiveness_rating >= 1 AND effectiveness_rating <= 5))
);

COMMENT ON TABLE lesson_plan_requests IS 'Tracks personalized lesson plan generation requests from teachers';
COMMENT ON COLUMN lesson_plan_requests.document_id IS 'Reference to the generated lesson plan in class_documents';
COMMENT ON COLUMN lesson_plan_requests.status IS 'Status of lesson plan generation: pending, generating, completed, or failed';
COMMENT ON COLUMN lesson_plan_requests.generated_at IS 'Timestamp when the lesson plan was successfully generated';
COMMENT ON COLUMN lesson_plan_requests.error_message IS 'Error message if generation failed';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lesson_requests_teacher ON lesson_plan_requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_requests_class ON lesson_plan_requests(class_id);
CREATE INDEX IF NOT EXISTS idx_lesson_requests_document ON lesson_plan_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_lesson_requests_status ON lesson_plan_requests(status);
CREATE INDEX IF NOT EXISTS idx_lesson_requests_teacher_status ON lesson_plan_requests(teacher_id, status);

-- Enable Row Level Security
ALTER TABLE lesson_plan_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Teachers can view their own lesson plan requests"
  ON lesson_plan_requests FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert their own lesson plan requests"
  ON lesson_plan_requests FOR INSERT
  TO authenticated
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their own lesson plan requests"
  ON lesson_plan_requests FOR UPDATE
  TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their own lesson plan requests"
  ON lesson_plan_requests FOR DELETE
  TO authenticated
  USING (teacher_id = auth.uid());

-- Admins can view all lesson plan requests
CREATE POLICY "Admins can view all lesson plan requests"
  ON lesson_plan_requests FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Create trigger to update updated_at
CREATE TRIGGER update_lesson_requests_updated_at 
  BEFORE UPDATE ON lesson_plan_requests
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();