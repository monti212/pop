/*
  COMPLETE MIGRATION TO CREATE CLASSES SYSTEM

  This script includes:
  1. Required helper function (update_updated_at_column)
  2. Classes table and related tables
  3. All necessary indexes, triggers, and RLS policies

  Run this in your Supabase SQL Editor to fix the "classes table not found" error.
*/

-- ============================================================================
-- STEP 1: CREATE HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- STEP 2: CREATE CLASSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Class Information
  class_name text NOT NULL,
  subject text,
  grade_level text,
  class_section text,
  description text,

  -- Schedule Information
  meeting_days text[] DEFAULT ARRAY[]::text[],
  meeting_time text,
  room_location text,

  -- Tracking
  student_count integer DEFAULT 0 CHECK (student_count >= 0 AND student_count <= 35),
  active_status boolean DEFAULT true,

  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS classes_teacher_id_idx ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS classes_active_idx ON classes(active_status) WHERE active_status = true;
CREATE INDEX IF NOT EXISTS classes_subject_grade_idx ON classes(subject, grade_level);

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classes
DROP POLICY IF EXISTS "Teachers can manage their own classes" ON classes;
CREATE POLICY "Teachers can manage their own classes"
  ON classes FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all classes" ON classes;
CREATE POLICY "Admins can view all classes"
  ON classes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- ============================================================================
-- STEP 3: CREATE STUDENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE NOT NULL,

  -- Student Information
  student_name text NOT NULL,
  student_identifier text,

  -- Neurodivergence Tracking
  has_neurodivergence boolean DEFAULT false,
  neurodivergence_type text CHECK (neurodivergence_type IN ('ADHD', 'Autism', 'Dyslexia', 'Dyscalculia', 'Other', NULL)),
  accommodations text,
  learning_notes text,

  -- Status
  active_status boolean DEFAULT true,

  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS students_class_id_idx ON students(class_id);
CREATE INDEX IF NOT EXISTS students_active_idx ON students(active_status) WHERE active_status = true;
CREATE INDEX IF NOT EXISTS students_neurodivergence_idx ON students(has_neurodivergence) WHERE has_neurodivergence = true;

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- RLS Policies for students
DROP POLICY IF EXISTS "Teachers can manage students in their classes" ON students;
CREATE POLICY "Teachers can manage students in their classes"
  ON students FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = students.class_id
      AND classes.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = students.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all students" ON students;
CREATE POLICY "Admins can view all students"
  ON students FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- ============================================================================
-- STEP 4: CREATE ATTENDANCE_RECORDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE NOT NULL,

  -- Attendance Information
  attendance_date date NOT NULL,
  is_present boolean NOT NULL,

  -- Audit Trail
  recorded_at timestamptz DEFAULT now() NOT NULL,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_modified_at timestamptz DEFAULT now() NOT NULL,

  -- Prevent duplicate attendance records for same student on same date
  UNIQUE(student_id, attendance_date)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS attendance_student_id_idx ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS attendance_class_id_idx ON attendance_records(class_id);
CREATE INDEX IF NOT EXISTS attendance_date_idx ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS attendance_class_date_idx ON attendance_records(class_id, attendance_date);
CREATE INDEX IF NOT EXISTS attendance_recorded_at_idx ON attendance_records(recorded_at);

-- Enable RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_records
DROP POLICY IF EXISTS "Teachers can manage attendance for their students" ON attendance_records;
CREATE POLICY "Teachers can manage attendance for their students"
  ON attendance_records FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = attendance_records.class_id
      AND classes.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = attendance_records.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all attendance records" ON attendance_records;
CREATE POLICY "Admins can view all attendance records"
  ON attendance_records FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- ============================================================================
-- STEP 5: CREATE CONSTRAINT FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to enforce maximum 5 classes per teacher
CREATE OR REPLACE FUNCTION check_class_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM classes
    WHERE teacher_id = NEW.teacher_id
    AND active_status = true
  ) >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 classes per teacher reached. Archive or delete a class before creating a new one.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_class_limit ON classes;
CREATE TRIGGER enforce_class_limit
  BEFORE INSERT ON classes
  FOR EACH ROW
  EXECUTE FUNCTION check_class_limit();

-- Function to enforce maximum 35 students per class
CREATE OR REPLACE FUNCTION check_student_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM students
    WHERE class_id = NEW.class_id
    AND active_status = true
  ) >= 35 THEN
    RAISE EXCEPTION 'Maximum of 35 students per class reached. Remove a student before adding a new one.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_student_limit ON students;
CREATE TRIGGER enforce_student_limit
  BEFORE INSERT ON students
  FOR EACH ROW
  EXECUTE FUNCTION check_student_limit();

-- Function to update student count in classes table
CREATE OR REPLACE FUNCTION update_class_student_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.active_status = true THEN
      UPDATE classes
      SET student_count = student_count + 1
      WHERE id = NEW.class_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.active_status = true AND NEW.active_status = false THEN
      UPDATE classes
      SET student_count = student_count - 1
      WHERE id = NEW.class_id;
    ELSIF OLD.active_status = false AND NEW.active_status = true THEN
      UPDATE classes
      SET student_count = student_count + 1
      WHERE id = NEW.class_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.active_status = true THEN
      UPDATE classes
      SET student_count = student_count - 1
      WHERE id = OLD.class_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maintain_student_count ON students;
CREATE TRIGGER maintain_student_count
  AFTER INSERT OR UPDATE OR DELETE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_class_student_count();

-- Function to set recorded_by on attendance records
CREATE OR REPLACE FUNCTION set_attendance_recorded_by()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.recorded_by = auth.uid();
    NEW.recorded_at = now();
    NEW.last_modified_at = now();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.last_modified_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_attendance_metadata ON attendance_records;
CREATE TRIGGER set_attendance_metadata
  BEFORE INSERT OR UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION set_attendance_recorded_by();

-- ============================================================================
-- STEP 6: UPDATED_AT TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 7: HELPER FUNCTIONS FOR STATISTICS
-- ============================================================================

-- Function to calculate attendance rate for a student
CREATE OR REPLACE FUNCTION calculate_student_attendance_rate(
  p_student_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS numeric AS $$
DECLARE
  total_days integer;
  present_days integer;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_present = true)
  INTO total_days, present_days
  FROM attendance_records
  WHERE student_id = p_student_id
    AND (p_start_date IS NULL OR attendance_date >= p_start_date)
    AND (p_end_date IS NULL OR attendance_date <= p_end_date);

  IF total_days = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((present_days::numeric / total_days::numeric) * 100, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate attendance rate for a class
CREATE OR REPLACE FUNCTION calculate_class_attendance_rate(
  p_class_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS numeric AS $$
DECLARE
  total_records integer;
  present_records integer;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_present = true)
  INTO total_records, present_records
  FROM attendance_records
  WHERE class_id = p_class_id
    AND (p_start_date IS NULL OR attendance_date >= p_start_date)
    AND (p_end_date IS NULL OR attendance_date <= p_end_date);

  IF total_records = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((present_records::numeric / total_records::numeric) * 100, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get classes missing attendance for a specific date
CREATE OR REPLACE FUNCTION get_classes_missing_attendance(
  p_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  class_id uuid,
  class_name text,
  teacher_id uuid,
  teacher_name text,
  student_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.class_name,
    c.teacher_id,
    COALESCE(up.display_name, up.email) as teacher_name,
    c.student_count
  FROM classes c
  LEFT JOIN user_profiles up ON c.teacher_id = up.id
  WHERE c.active_status = true
    AND c.student_count > 0
    AND NOT EXISTS (
      SELECT 1
      FROM attendance_records ar
      WHERE ar.class_id = c.id
      AND ar.attendance_date = p_date
    )
  ORDER BY c.teacher_id, c.class_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- STEP 8: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE classes IS 'Teacher classroom groups with maximum 5 per teacher enforced by trigger';
COMMENT ON TABLE students IS 'Student roster per class with maximum 35 per class enforced by trigger';
COMMENT ON TABLE attendance_records IS 'Daily attendance records with unique constraint per student per date';

COMMENT ON COLUMN students.has_neurodivergence IS 'Flag indicating if student has documented neurodivergence';
COMMENT ON COLUMN students.neurodivergence_type IS 'Type of neurodivergence: ADHD, Autism, Dyslexia, Dyscalculia, Other';
COMMENT ON COLUMN students.accommodations IS 'Specific accommodations required for the student';
COMMENT ON COLUMN students.learning_notes IS 'Additional notes about student learning needs and strengths';

COMMENT ON COLUMN attendance_records.recorded_by IS 'User who recorded this attendance entry';
COMMENT ON COLUMN attendance_records.last_modified_at IS 'Last time this attendance record was modified';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration completed successfully! Classes table and related tables have been created.' as message;
