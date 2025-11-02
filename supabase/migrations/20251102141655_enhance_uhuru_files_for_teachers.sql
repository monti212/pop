/*
  # Enhance Uhuru Files for Teacher-Specific Use

  ## Summary
  Transforms Uhuru Files from general file storage into a specialized teacher tool
  focused on attendance records and lesson plans with enhanced metadata and organization.

  ## Changes

  1. Enhanced Metadata Columns
     - Add `document_category` to user_files for better classification (attendance, lesson_plan, other)
     - Add `academic_year`, `semester`, and `week_number` for academic organization
     - Add `classroom_group_id` for linking files to specific classes
     - Add `student_ids` array for linking attendance records to students
     - Add `lesson_plan_structure` jsonb for structured lesson plan data

  2. New Indexes
     - Index on document_category for fast filtering
     - Index on academic_year and semester for academic period queries
     - Index on classroom_group_id for class-based filtering
     - Composite index on user_id and document_category for common queries

  3. Update Policies
     - Maintain existing RLS policies for security
     - Add policies for classroom group access if needed

  ## Security
  - All existing RLS policies remain in effect
  - Teachers can only access their own files
  - Data integrity maintained through constraints
*/

-- Add new columns to user_files table if they don't exist
DO $$
BEGIN
  -- Add document_category column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_files' AND column_name = 'document_category'
  ) THEN
    ALTER TABLE user_files ADD COLUMN document_category text DEFAULT 'other' 
      CHECK (document_category IN ('attendance', 'lesson_plan', 'other'));
  END IF;

  -- Add academic organization columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_files' AND column_name = 'academic_year'
  ) THEN
    ALTER TABLE user_files ADD COLUMN academic_year text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_files' AND column_name = 'semester'
  ) THEN
    ALTER TABLE user_files ADD COLUMN semester text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_files' AND column_name = 'week_number'
  ) THEN
    ALTER TABLE user_files ADD COLUMN week_number integer;
  END IF;

  -- Add classroom relationship
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_files' AND column_name = 'classroom_group_id'
  ) THEN
    ALTER TABLE user_files ADD COLUMN classroom_group_id uuid REFERENCES classroom_groups(id) ON DELETE SET NULL;
  END IF;

  -- Add student relationship for attendance
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_files' AND column_name = 'student_ids'
  ) THEN
    ALTER TABLE user_files ADD COLUMN student_ids uuid[] DEFAULT ARRAY[]::uuid[];
  END IF;

  -- Add lesson plan structured data
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_files' AND column_name = 'lesson_plan_structure'
  ) THEN
    ALTER TABLE user_files ADD COLUMN lesson_plan_structure jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Add attendance date for attendance records
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_files' AND column_name = 'attendance_date'
  ) THEN
    ALTER TABLE user_files ADD COLUMN attendance_date date;
  END IF;

  -- Add lesson date for lesson plans
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_files' AND column_name = 'lesson_date'
  ) THEN
    ALTER TABLE user_files ADD COLUMN lesson_date date;
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS user_files_document_category_idx ON user_files(document_category);
CREATE INDEX IF NOT EXISTS user_files_academic_year_idx ON user_files(academic_year);
CREATE INDEX IF NOT EXISTS user_files_semester_idx ON user_files(semester);
CREATE INDEX IF NOT EXISTS user_files_classroom_group_idx ON user_files(classroom_group_id);
CREATE INDEX IF NOT EXISTS user_files_attendance_date_idx ON user_files(attendance_date) WHERE attendance_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_files_lesson_date_idx ON user_files(lesson_date) WHERE lesson_date IS NOT NULL;

-- Composite index for common queries (user + category)
CREATE INDEX IF NOT EXISTS user_files_user_category_idx ON user_files(user_id, document_category);

-- Update focus_sets table to support better categorization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'focus_sets' AND column_name = 'set_type'
  ) THEN
    ALTER TABLE focus_sets ADD COLUMN set_type text DEFAULT 'general'
      CHECK (set_type IN ('attendance', 'lesson_plan', 'general'));
  END IF;
END $$;

-- Add index for focus set types
CREATE INDEX IF NOT EXISTS focus_sets_type_idx ON focus_sets(set_type);

-- Add helpful comment
COMMENT ON COLUMN user_files.document_category IS 'Primary classification: attendance (attendance records), lesson_plan (lesson plans), other (general files)';
COMMENT ON COLUMN user_files.lesson_plan_structure IS 'Structured lesson plan data: {objectives: [], materials: [], activities: [], assessments: [], standards: []}';
COMMENT ON COLUMN user_files.student_ids IS 'Array of student UUIDs for attendance records';
COMMENT ON COLUMN user_files.classroom_group_id IS 'Link to classroom group for class-specific documents';
