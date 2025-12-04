/*
  # Create Missing Student Profile Tables
  
  ## Problem
  The comprehensive student profile system tables were never created because
  the original migration referenced non-existent user_documents table.
  
  ## Tables Created
  1. grade_categories - Grading categories per class with weights
  2. assignments - Class assignments linked to categories
  3. student_grades - Individual grade entries for students
  4. student_personality_traits - Personality and learning style info
  5. student_behavior_logs - Behavioral incidents and observations
  
  ## Security
  - All tables have RLS enabled
  - Teachers can only access data for their own classes
  - Proper indexes for performance
*/

-- Create grade_categories table
CREATE TABLE IF NOT EXISTS grade_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  category_weight DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  description TEXT,
  color TEXT DEFAULT '#0096B3',
  active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_weight CHECK (category_weight >= 0 AND category_weight <= 100)
);

COMMENT ON TABLE grade_categories IS 'Grading categories per class (homework, tests, projects, etc.) with weighted grading';

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  category_id UUID REFERENCES grade_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  points_possible DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  due_date DATE,
  assigned_date DATE DEFAULT CURRENT_DATE,
  assignment_type TEXT DEFAULT 'assignment',
  status TEXT DEFAULT 'active',
  rubric JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_points CHECK (points_possible > 0)
);

COMMENT ON TABLE assignments IS 'Class assignments with due dates and submission tracking';

-- Create student_grades table
CREATE TABLE IF NOT EXISTS student_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  category_id UUID REFERENCES grade_categories(id) ON DELETE SET NULL,
  subject TEXT,
  grade_value DECIMAL(10,2) NOT NULL,
  points_possible DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN points_possible > 0 THEN (grade_value / points_possible * 100)
      ELSE 0
    END
  ) STORED,
  letter_grade TEXT,
  graded_date DATE DEFAULT CURRENT_DATE,
  teacher_comments TEXT,
  late_submission BOOLEAN DEFAULT false,
  extra_credit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_grade CHECK (grade_value >= 0 AND grade_value <= points_possible)
);

COMMENT ON TABLE student_grades IS 'Individual grade entries for students with automatic percentage calculation';

-- Create student_personality_traits table
CREATE TABLE IF NOT EXISTS student_personality_traits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  learning_style TEXT DEFAULT 'visual',
  learning_style_notes TEXT,
  
  work_pace TEXT DEFAULT 'moderate',
  participation_level TEXT DEFAULT 'moderate',
  collaboration_preference TEXT DEFAULT 'flexible',
  independence_level TEXT DEFAULT 'moderate',
  
  focus_duration TEXT DEFAULT 'average',
  energy_level TEXT DEFAULT 'moderate',
  motivation_type TEXT DEFAULT 'intrinsic',
  stress_response TEXT DEFAULT 'calm',
  
  peer_interaction_style TEXT DEFAULT 'balanced',
  leadership_qualities TEXT DEFAULT 'emerging',
  communication_style TEXT DEFAULT 'verbal',
  
  favorite_subjects TEXT[],
  challenging_subjects TEXT[],
  preferred_activities TEXT[],
  reward_preferences TEXT,
  
  teacher_observations TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(student_id)
);

COMMENT ON TABLE student_personality_traits IS 'Personality and learning style information for personalized instruction';

-- Create student_behavior_logs table
CREATE TABLE IF NOT EXISTS student_behavior_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  incident_time TIME,
  behavior_type TEXT NOT NULL,
  severity TEXT DEFAULT 'minor',
  description TEXT NOT NULL,
  context TEXT,
  action_taken TEXT,
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_completed BOOLEAN DEFAULT false,
  parent_notified BOOLEAN DEFAULT false,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE student_behavior_logs IS 'Behavioral incidents and observations for pattern analysis';

-- Add columns to students table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'current_gpa') THEN
    ALTER TABLE students ADD COLUMN current_gpa DECIMAL(3,2) DEFAULT 0.00;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'parent_guardian_name') THEN
    ALTER TABLE students ADD COLUMN parent_guardian_name TEXT;
    ALTER TABLE students ADD COLUMN parent_guardian_email TEXT;
    ALTER TABLE students ADD COLUMN parent_guardian_phone TEXT;
    ALTER TABLE students ADD COLUMN emergency_contact TEXT;
    ALTER TABLE students ADD COLUMN medical_notes TEXT;
    ALTER TABLE students ADD COLUMN strengths TEXT;
    ALTER TABLE students ADD COLUMN areas_for_improvement TEXT;
    ALTER TABLE students ADD COLUMN interests TEXT;
    ALTER TABLE students ADD COLUMN preferred_seating TEXT;
    ALTER TABLE students ADD COLUMN profile_photo_url TEXT;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_grades_student ON student_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_class ON student_grades(class_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_assignment ON student_grades(assignment_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_date ON student_grades(graded_date);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_grade_categories_class ON grade_categories(class_id);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_student ON student_behavior_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_class ON student_behavior_logs(class_id);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_date ON student_behavior_logs(incident_date);
CREATE INDEX IF NOT EXISTS idx_personality_traits_student ON student_personality_traits(student_id);

-- Enable Row Level Security
ALTER TABLE grade_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_personality_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_behavior_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grade_categories
DROP POLICY IF EXISTS "Teachers can view their own class grade categories" ON grade_categories;
CREATE POLICY "Teachers can view their own class grade categories"
  ON grade_categories FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_categories.class_id AND classes.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers can insert grade categories for their classes" ON grade_categories;
CREATE POLICY "Teachers can insert grade categories for their classes"
  ON grade_categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_categories.class_id AND classes.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers can update their own class grade categories" ON grade_categories;
CREATE POLICY "Teachers can update their own class grade categories"
  ON grade_categories FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_categories.class_id AND classes.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers can delete their own class grade categories" ON grade_categories;
CREATE POLICY "Teachers can delete their own class grade categories"
  ON grade_categories FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_categories.class_id AND classes.teacher_id = auth.uid()));

-- RLS Policies for assignments
DROP POLICY IF EXISTS "Teachers can view their own class assignments" ON assignments;
CREATE POLICY "Teachers can view their own class assignments"
  ON assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND classes.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers can insert assignments for their classes" ON assignments;
CREATE POLICY "Teachers can insert assignments for their classes"
  ON assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND classes.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers can update their own class assignments" ON assignments;
CREATE POLICY "Teachers can update their own class assignments"
  ON assignments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND classes.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers can delete their own class assignments" ON assignments;
CREATE POLICY "Teachers can delete their own class assignments"
  ON assignments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND classes.teacher_id = auth.uid()));

-- RLS Policies for student_grades
DROP POLICY IF EXISTS "Teachers can view grades for their class students" ON student_grades;
CREATE POLICY "Teachers can view grades for their class students"
  ON student_grades FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = student_grades.class_id AND classes.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers can insert grades for their class students" ON student_grades;
CREATE POLICY "Teachers can insert grades for their class students"
  ON student_grades FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM classes WHERE classes.id = student_grades.class_id AND classes.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers can update grades for their class students" ON student_grades;
CREATE POLICY "Teachers can update grades for their class students"
  ON student_grades FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = student_grades.class_id AND classes.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers can delete grades for their class students" ON student_grades;
CREATE POLICY "Teachers can delete grades for their class students"
  ON student_grades FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = student_grades.class_id AND classes.teacher_id = auth.uid()));

-- RLS Policies for student_personality_traits
DROP POLICY IF EXISTS "Teachers can view personality traits for their students" ON student_personality_traits;
CREATE POLICY "Teachers can view personality traits for their students"
  ON student_personality_traits FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM students
    JOIN classes ON students.class_id = classes.id
    WHERE students.id = student_personality_traits.student_id AND classes.teacher_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Teachers can insert personality traits for their students" ON student_personality_traits;
CREATE POLICY "Teachers can insert personality traits for their students"
  ON student_personality_traits FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM students
    JOIN classes ON students.class_id = classes.id
    WHERE students.id = student_personality_traits.student_id AND classes.teacher_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Teachers can update personality traits for their students" ON student_personality_traits;
CREATE POLICY "Teachers can update personality traits for their students"
  ON student_personality_traits FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM students
    JOIN classes ON students.class_id = classes.id
    WHERE students.id = student_personality_traits.student_id AND classes.teacher_id = auth.uid()
  ));

-- RLS Policies for student_behavior_logs
DROP POLICY IF EXISTS "Teachers can view behavior logs for their class students" ON student_behavior_logs;
CREATE POLICY "Teachers can view behavior logs for their class students"
  ON student_behavior_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = student_behavior_logs.class_id AND classes.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers can insert behavior logs for their class students" ON student_behavior_logs;
CREATE POLICY "Teachers can insert behavior logs for their class students"
  ON student_behavior_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM classes WHERE classes.id = student_behavior_logs.class_id AND classes.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers can update behavior logs for their class students" ON student_behavior_logs;
CREATE POLICY "Teachers can update behavior logs for their class students"
  ON student_behavior_logs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = student_behavior_logs.class_id AND classes.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers can delete behavior logs for their class students" ON student_behavior_logs;
CREATE POLICY "Teachers can delete behavior logs for their class students"
  ON student_behavior_logs FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = student_behavior_logs.class_id AND classes.teacher_id = auth.uid()));

-- Create helper functions
CREATE OR REPLACE FUNCTION calculate_student_gpa(p_student_id UUID)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_gpa DECIMAL(3,2);
BEGIN
  SELECT ROUND(AVG(percentage) / 25, 2) INTO v_gpa
  FROM student_grades
  WHERE student_id = p_student_id AND grade_value IS NOT NULL;
  
  RETURN COALESCE(v_gpa, 0.00);
END;
$$;

-- Create trigger function to update student GPA
CREATE OR REPLACE FUNCTION update_student_gpa_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE students
  SET current_gpa = calculate_student_gpa(NEW.student_id)
  WHERE id = NEW.student_id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_student_gpa ON student_grades;
CREATE TRIGGER trigger_update_student_gpa
AFTER INSERT OR UPDATE ON student_grades
FOR EACH ROW
EXECUTE FUNCTION update_student_gpa_trigger();

-- Create updated_at triggers
DROP TRIGGER IF EXISTS update_grade_categories_updated_at ON grade_categories;
CREATE TRIGGER update_grade_categories_updated_at 
  BEFORE UPDATE ON grade_categories
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
CREATE TRIGGER update_assignments_updated_at 
  BEFORE UPDATE ON assignments
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_grades_updated_at ON student_grades;
CREATE TRIGGER update_student_grades_updated_at 
  BEFORE UPDATE ON student_grades
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_personality_traits_updated_at ON student_personality_traits;
CREATE TRIGGER update_personality_traits_updated_at 
  BEFORE UPDATE ON student_personality_traits
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_behavior_logs_updated_at ON student_behavior_logs;
CREATE TRIGGER update_behavior_logs_updated_at 
  BEFORE UPDATE ON student_behavior_logs
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();