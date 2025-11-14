/*
  # Comprehensive Student Profile System

  ## Overview
  This migration creates a comprehensive student profile and classroom management system
  with grades, personality traits, behavior tracking, and personalized learning support.

  ## New Tables

  ### 1. student_grades
  - Tracks individual grade entries for students
  - Links to students and classes
  - Supports multiple assignment types and subjects
  - Includes weighted grade calculations

  ### 2. student_personality_traits
  - Stores personality and learning style information
  - Multiple trait categories for comprehensive profiling
  - Used for personalized lesson plan generation

  ### 3. student_behavior_logs
  - Documents behavioral incidents and observations
  - Tracks both positive and negative behaviors
  - Links to students and classes for pattern analysis

  ### 4. grade_categories
  - Defines grading categories per class (homework, tests, projects, etc.)
  - Supports weighted grading schemes
  - Teacher-customizable per class

  ### 5. assignments
  - Tracks all assignments for classes
  - Links to grade categories
  - Manages due dates and submission status

  ### 6. lesson_plan_requests
  - Tracks personalized lesson plan generation requests
  - Links students to generated lesson plans
  - Stores customization parameters and success metrics

  ## Security
  - All tables have RLS enabled
  - Teachers can only access data for their own classes
  - Students can only view their own data (future feature)

  ## Enhancements to Existing Tables
  - Adds personality fields to students table
  - Adds grade-related fields and GPA tracking
  - Adds parent contact information
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add new columns to existing students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS current_gpa DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_guardian_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_guardian_email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_guardian_phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS medical_notes TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS strengths TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS areas_for_improvement TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS interests TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS preferred_seating TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Create grade_categories table
CREATE TABLE IF NOT EXISTS grade_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Create student_grades table
CREATE TABLE IF NOT EXISTS student_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Create student_personality_traits table
CREATE TABLE IF NOT EXISTS student_personality_traits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- Learning Style
  learning_style TEXT DEFAULT 'visual',
  learning_style_notes TEXT,
  
  -- Personality Traits
  work_pace TEXT DEFAULT 'moderate',
  participation_level TEXT DEFAULT 'moderate',
  collaboration_preference TEXT DEFAULT 'flexible',
  independence_level TEXT DEFAULT 'moderate',
  
  -- Behavioral Traits
  focus_duration TEXT DEFAULT 'average',
  energy_level TEXT DEFAULT 'moderate',
  motivation_type TEXT DEFAULT 'intrinsic',
  stress_response TEXT DEFAULT 'calm',
  
  -- Social Traits
  peer_interaction_style TEXT DEFAULT 'balanced',
  leadership_qualities TEXT DEFAULT 'emerging',
  communication_style TEXT DEFAULT 'verbal',
  
  -- Academic Preferences
  favorite_subjects TEXT[],
  challenging_subjects TEXT[],
  preferred_activities TEXT[],
  reward_preferences TEXT,
  
  -- Additional Notes
  teacher_observations TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(student_id)
);

-- Create student_behavior_logs table
CREATE TABLE IF NOT EXISTS student_behavior_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Create lesson_plan_requests table
CREATE TABLE IF NOT EXISTS lesson_plan_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  document_id UUID REFERENCES user_documents(id) ON DELETE SET NULL,
  
  -- Status and Metrics
  status TEXT DEFAULT 'pending',
  generated_at TIMESTAMPTZ,
  effectiveness_rating INTEGER,
  teacher_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_rating CHECK (effectiveness_rating IS NULL OR (effectiveness_rating >= 1 AND effectiveness_rating <= 5))
);

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
CREATE INDEX IF NOT EXISTS idx_lesson_requests_teacher ON lesson_plan_requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_requests_class ON lesson_plan_requests(class_id);

-- Enable Row Level Security
ALTER TABLE grade_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_personality_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_behavior_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plan_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grade_categories
CREATE POLICY "Teachers can view their own class grade categories"
  ON grade_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = grade_categories.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can insert grade categories for their classes"
  ON grade_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = grade_categories.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update their own class grade categories"
  ON grade_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = grade_categories.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete their own class grade categories"
  ON grade_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = grade_categories.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- RLS Policies for assignments
CREATE POLICY "Teachers can view their own class assignments"
  ON assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = assignments.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can insert assignments for their classes"
  ON assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = assignments.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update their own class assignments"
  ON assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = assignments.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete their own class assignments"
  ON assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = assignments.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- RLS Policies for student_grades
CREATE POLICY "Teachers can view grades for their class students"
  ON student_grades FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = student_grades.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can insert grades for their class students"
  ON student_grades FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = student_grades.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update grades for their class students"
  ON student_grades FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = student_grades.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete grades for their class students"
  ON student_grades FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = student_grades.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- RLS Policies for student_personality_traits
CREATE POLICY "Teachers can view personality traits for their students"
  ON student_personality_traits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_personality_traits.student_id
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can insert personality traits for their students"
  ON student_personality_traits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_personality_traits.student_id
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update personality traits for their students"
  ON student_personality_traits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_personality_traits.student_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- RLS Policies for student_behavior_logs
CREATE POLICY "Teachers can view behavior logs for their class students"
  ON student_behavior_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = student_behavior_logs.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can insert behavior logs for their class students"
  ON student_behavior_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = student_behavior_logs.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update behavior logs for their class students"
  ON student_behavior_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = student_behavior_logs.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete behavior logs for their class students"
  ON student_behavior_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = student_behavior_logs.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- RLS Policies for lesson_plan_requests
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

-- Create function to calculate student GPA
CREATE OR REPLACE FUNCTION calculate_student_gpa(p_student_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  v_gpa DECIMAL(3,2);
BEGIN
  SELECT ROUND(AVG(percentage) / 25, 2) INTO v_gpa
  FROM student_grades
  WHERE student_id = p_student_id
  AND grade_value IS NOT NULL;
  
  RETURN COALESCE(v_gpa, 0.00);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get class grade distribution
CREATE OR REPLACE FUNCTION get_class_grade_distribution(p_class_id UUID)
RETURNS TABLE (
  grade_range TEXT,
  student_count BIGINT,
  percentage DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH grade_stats AS (
    SELECT 
      student_id,
      AVG(percentage) as avg_percentage
    FROM student_grades
    WHERE class_id = p_class_id
    GROUP BY student_id
  ),
  total_students AS (
    SELECT COUNT(DISTINCT student_id)::DECIMAL as total
    FROM grade_stats
  )
  SELECT 
    CASE
      WHEN avg_percentage >= 90 THEN 'A (90-100)'
      WHEN avg_percentage >= 80 THEN 'B (80-89)'
      WHEN avg_percentage >= 70 THEN 'C (70-79)'
      WHEN avg_percentage >= 60 THEN 'D (60-69)'
      ELSE 'F (0-59)'
    END as grade_range,
    COUNT(*)::BIGINT as student_count,
    ROUND((COUNT(*)::DECIMAL / total_students.total * 100), 2) as percentage
  FROM grade_stats, total_students
  GROUP BY grade_range, total_students.total
  ORDER BY 
    CASE grade_range
      WHEN 'A (90-100)' THEN 1
      WHEN 'B (80-89)' THEN 2
      WHEN 'C (70-79)' THEN 3
      WHEN 'D (60-69)' THEN 4
      ELSE 5
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update student GPA when grades change
CREATE OR REPLACE FUNCTION update_student_gpa_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE students
  SET current_gpa = calculate_student_gpa(NEW.student_id)
  WHERE id = NEW.student_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_student_gpa
AFTER INSERT OR UPDATE ON student_grades
FOR EACH ROW
EXECUTE FUNCTION update_student_gpa_trigger();

-- Create updated_at triggers for all new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_grade_categories_updated_at BEFORE UPDATE ON grade_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_grades_updated_at BEFORE UPDATE ON student_grades
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personality_traits_updated_at BEFORE UPDATE ON student_personality_traits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_behavior_logs_updated_at BEFORE UPDATE ON student_behavior_logs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_requests_updated_at BEFORE UPDATE ON lesson_plan_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
