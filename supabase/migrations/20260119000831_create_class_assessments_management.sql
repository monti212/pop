/*
  # Create Class Assessment Management System

  1. New Tables
    - `class_assessments`
      - `id` (uuid, primary key)
      - `class_id` (uuid, foreign key to classes)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text, not null)
      - `description` (text)
      - `status` (text, not null) - active, upcoming, due, completed
      - `due_date` (date)
      - `document_url` (text) - storage path
      - `document_name` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `class_assessments` table
    - Add policies for teachers to manage their class assessments

  3. Indexes
    - Index on class_id for faster queries
    - Index on status for filtering
*/

-- Create class_assessments table
CREATE TABLE IF NOT EXISTS class_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('active', 'upcoming', 'due', 'completed')),
  due_date date,
  document_url text,
  document_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_class_assessments_class_id ON class_assessments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_assessments_user_id ON class_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_class_assessments_status ON class_assessments(status);
CREATE INDEX IF NOT EXISTS idx_class_assessments_due_date ON class_assessments(due_date);

-- Enable RLS
ALTER TABLE class_assessments ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can view assessments for their classes
CREATE POLICY "Teachers can view their class assessments"
  ON class_assessments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_assessments.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Policy: Teachers can insert assessments for their classes
CREATE POLICY "Teachers can create class assessments"
  ON class_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_assessments.class_id
      AND classes.teacher_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Policy: Teachers can update their own assessments
CREATE POLICY "Teachers can update their class assessments"
  ON class_assessments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Teachers can delete their own assessments
CREATE POLICY "Teachers can delete their class assessments"
  ON class_assessments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_class_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS class_assessments_updated_at ON class_assessments;
CREATE TRIGGER class_assessments_updated_at
  BEFORE UPDATE ON class_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_class_assessments_updated_at();