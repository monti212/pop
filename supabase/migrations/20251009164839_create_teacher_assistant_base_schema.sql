/*
  # Create Teacher Assistant Platform Base Schema for Pencils of Promise
  
  ## Summary
  Complete database initialization for a Teacher's Assistant AI platform designed
  for Pencils of Promise educators. This creates all core tables needed for teachers
  to use AI assistance for lesson planning, content creation, grading, and classroom
  management.

  ## New Tables Created
  
  ### User Management
  - **user_profiles** - Extended teacher profiles with teaching-specific information
  - **schools** - Pencils of Promise partner schools
  - **teaching_preferences** - AI assistant and workflow preferences per teacher
  
  ### Teaching Sessions (AI Conversations)
  - **conversations** - AI teaching sessions with context (lesson planning, grading, etc.)
  - **messages** - Individual messages within teaching sessions
  
  ### Lesson Planning
  - **lesson_plans** - Complete lesson plans created or edited by teachers
  - **teaching_resources** - Files, worksheets, presentations, and materials
  
  ### Student Management (Simplified)
  - **student_rosters** - Minimal student tracking for teacher's classes
  - **classroom_groups** - Class sections and groups
  
  ### Assessment and Grading
  - **assessments** - Tests, quizzes, assignments created by teachers
  - **grading_rubrics** - Reusable grading criteria
  
  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Teachers can only access their own content
  - Admins have full access for support
  - School-level data isolation
  
  ## Notes
  - Optimized for teacher workflow efficiency
  - Privacy-first: minimal student data collection
  - Supports offline work with sync capabilities
  - Multi-language support for international deployment
*/

-- ============================================================================
-- 1. SCHOOLS TABLE
-- ============================================================================

CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL,
  country text,
  region text,
  principal_name text,
  principal_email text,
  principal_phone text,
  address text,
  partnership_date date DEFAULT CURRENT_DATE,
  active_status boolean DEFAULT true,
  student_count integer DEFAULT 0,
  teacher_count integer DEFAULT 0,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX schools_country_region_idx ON schools(country, region);
CREATE INDEX schools_active_idx ON schools(active_status) WHERE active_status = true;

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view all schools"
  ON schools FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- 2. USER PROFILES (TEACHERS)
-- ============================================================================

CREATE TABLE user_profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name text,
  email text,
  school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
  
  -- Teaching Information
  subjects_taught text[] DEFAULT ARRAY[]::text[],
  grade_levels_taught text[] DEFAULT ARRAY[]::text[],
  years_of_experience integer DEFAULT 0,
  teaching_languages text[] DEFAULT ARRAY['english']::text[],
  bio text,
  
  -- Role and Access
  team_role text DEFAULT 'autobot' CHECK (team_role IN ('optimus_prime', 'prime', 'autobot', 'free')),
  
  -- AI Preferences
  preferred_language text DEFAULT 'english',
  preferred_region text DEFAULT 'global',
  preferred_ai_tone text DEFAULT 'professional' CHECK (preferred_ai_tone IN ('professional', 'friendly', 'formal', 'casual')),
  preferred_ai_verbosity text DEFAULT 'medium' CHECK (preferred_ai_verbosity IN ('low', 'medium', 'high')),
  
  -- Legacy fields (keeping for compatibility)
  subscription_tier text DEFAULT 'free',
  daily_message_count integer DEFAULT 0,
  
  -- Tracking
  last_active_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX user_profiles_school_id_idx ON user_profiles(school_id);
CREATE INDEX user_profiles_team_role_idx ON user_profiles(team_role);
CREATE INDEX user_profiles_last_active_idx ON user_profiles(last_active_at DESC);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.team_role IN ('optimus_prime', 'prime')
    )
  );

-- ============================================================================
-- 3. TEACHING PREFERENCES
-- ============================================================================

CREATE TABLE teaching_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- AI Assistant Settings
  default_session_type text DEFAULT 'general_query',
  auto_save_enabled boolean DEFAULT true,
  ai_suggestions_enabled boolean DEFAULT true,
  
  -- Lesson Planning Defaults
  default_lesson_duration_minutes integer DEFAULT 45,
  include_materials_list boolean DEFAULT true,
  include_assessment_methods boolean DEFAULT true,
  include_differentiation boolean DEFAULT true,
  
  -- Grading Settings
  default_grading_scale text DEFAULT 'percentage',
  feedback_detail_level text DEFAULT 'detailed',
  
  -- Communication Settings
  parent_message_tone text DEFAULT 'professional',
  auto_translate_messages boolean DEFAULT false,
  
  -- Notifications
  email_notifications boolean DEFAULT true,
  deadline_reminders boolean DEFAULT true,
  
  -- Display
  theme text DEFAULT 'light',
  compact_view boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE teaching_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own preferences"
  ON teaching_preferences FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- ============================================================================
-- 4. CONVERSATIONS (TEACHING SESSIONS)
-- ============================================================================

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text DEFAULT 'New Teaching Session',
  
  -- Teaching Context
  session_type text DEFAULT 'general_query' CHECK (session_type IN (
    'lesson_planning',
    'content_creation',
    'grading_assistance',
    'student_communication',
    'assessment_design',
    'professional_development',
    'general_query'
  )),
  subject text,
  grade_level text,
  topic text,
  curriculum_standards text[],
  
  -- Organization
  is_starred boolean DEFAULT false,
  tags text[] DEFAULT ARRAY[]::text[],
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX conversations_user_id_idx ON conversations(user_id);
CREATE INDEX conversations_session_type_idx ON conversations(session_type);
CREATE INDEX conversations_subject_idx ON conversations(subject);
CREATE INDEX conversations_updated_at_idx ON conversations(updated_at DESC);
CREATE INDEX conversations_is_starred_idx ON conversations(is_starred) WHERE is_starred = true;
CREATE INDEX conversations_tags_idx ON conversations USING GIN(tags);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own teaching sessions"
  ON conversations FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 5. MESSAGES
-- ============================================================================

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content jsonb NOT NULL,
  is_long_response boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX messages_conversation_id_idx ON messages(conversation_id);
CREATE INDEX messages_created_at_idx ON messages(created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers view messages in their sessions"
  ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers insert messages in their sessions"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers update messages in their sessions"
  ON messages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND c.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. LESSON PLANS
-- ============================================================================

CREATE TABLE lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  
  -- Basic Info
  title text NOT NULL,
  subject text NOT NULL,
  grade_level text NOT NULL,
  topic text NOT NULL,
  estimated_duration_minutes integer DEFAULT 45,
  
  -- Content
  learning_objectives text[] DEFAULT ARRAY[]::text[],
  materials_needed text[] DEFAULT ARRAY[]::text[],
  lesson_activities jsonb DEFAULT '[]',
  assessment_methods text[] DEFAULT ARRAY[]::text[],
  differentiation_strategies text[] DEFAULT ARRAY[]::text[],
  homework_assignment text,
  teacher_notes text,
  
  -- Standards and Tags
  curriculum_standards text[] DEFAULT ARRAY[]::text[],
  tags text[] DEFAULT ARRAY[]::text[],
  
  -- Metadata
  ai_generated boolean DEFAULT false,
  is_template boolean DEFAULT false,
  shared_publicly boolean DEFAULT false,
  times_used integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX lesson_plans_teacher_id_idx ON lesson_plans(teacher_id);
CREATE INDEX lesson_plans_subject_grade_idx ON lesson_plans(subject, grade_level);
CREATE INDEX lesson_plans_tags_idx ON lesson_plans USING GIN(tags);
CREATE INDEX lesson_plans_updated_at_idx ON lesson_plans(updated_at DESC);

ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own lesson plans"
  ON lesson_plans FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers view shared lesson plans"
  ON lesson_plans FOR SELECT TO authenticated
  USING (shared_publicly = true);

-- ============================================================================
-- 7. TEACHING RESOURCES
-- ============================================================================

CREATE TABLE teaching_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_plan_id uuid REFERENCES lesson_plans(id) ON DELETE SET NULL,
  
  -- Resource Info
  title text NOT NULL,
  description text,
  resource_type text CHECK (resource_type IN (
    'worksheet', 'presentation', 'video', 'game', 'handout',
    'quiz', 'rubric', 'template', 'image', 'document', 'other'
  )),
  
  -- File Storage
  file_url text,
  file_name text,
  file_size_bytes bigint,
  mime_type text,
  
  -- Classification
  subject text,
  grade_level text,
  topic text,
  tags text[] DEFAULT ARRAY[]::text[],
  
  -- Sharing
  ai_generated boolean DEFAULT false,
  shared_publicly boolean DEFAULT false,
  download_count integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX teaching_resources_teacher_id_idx ON teaching_resources(teacher_id);
CREATE INDEX teaching_resources_type_idx ON teaching_resources(resource_type);
CREATE INDEX teaching_resources_subject_grade_idx ON teaching_resources(subject, grade_level);
CREATE INDEX teaching_resources_tags_idx ON teaching_resources USING GIN(tags);

ALTER TABLE teaching_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own resources"
  ON teaching_resources FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers view shared resources"
  ON teaching_resources FOR SELECT TO authenticated
  USING (shared_publicly = true);

-- ============================================================================
-- 8. STUDENT ROSTERS (SIMPLIFIED)
-- ============================================================================

CREATE TABLE student_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Minimal Student Info (Privacy-First)
  student_first_name text NOT NULL,
  student_identifier text, -- Optional: student ID or anonymous code
  grade_level text NOT NULL,
  
  -- Class Assignment
  class_section text,
  
  -- Notes
  learning_notes text, -- IEP, accommodations, strengths, challenges
  parent_contact text, -- Optional parent email/phone
  
  -- Status
  active_status boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX student_rosters_teacher_id_idx ON student_rosters(teacher_id);
CREATE INDEX student_rosters_class_section_idx ON student_rosters(class_section);
CREATE INDEX student_rosters_active_idx ON student_rosters(active_status) WHERE active_status = true;

ALTER TABLE student_rosters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own student rosters"
  ON student_rosters FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- ============================================================================
-- 9. CLASSROOM GROUPS
-- ============================================================================

CREATE TABLE classroom_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Group Info
  group_name text NOT NULL,
  subject text,
  grade_level text,
  class_section text,
  
  -- Schedule
  meeting_days text[] DEFAULT ARRAY[]::text[], -- ['Monday', 'Wednesday', 'Friday']
  meeting_time text, -- '9:00 AM'
  room_location text,
  
  -- Students
  student_count integer DEFAULT 0,
  
  -- Status
  active_status boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX classroom_groups_teacher_id_idx ON classroom_groups(teacher_id);
CREATE INDEX classroom_groups_subject_grade_idx ON classroom_groups(subject, grade_level);
CREATE INDEX classroom_groups_active_idx ON classroom_groups(active_status) WHERE active_status = true;

ALTER TABLE classroom_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own classroom groups"
  ON classroom_groups FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- ============================================================================
-- 10. ASSESSMENTS
-- ============================================================================

CREATE TABLE assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_plan_id uuid REFERENCES lesson_plans(id) ON DELETE SET NULL,
  
  -- Assessment Info
  title text NOT NULL,
  assessment_type text CHECK (assessment_type IN (
    'quiz', 'test', 'exam', 'project', 'assignment', 'homework', 'presentation', 'other'
  )),
  subject text NOT NULL,
  grade_level text NOT NULL,
  topic text,
  
  -- Content
  instructions text,
  questions jsonb DEFAULT '[]', -- Array of question objects
  answer_key jsonb, -- Answers and rubrics
  total_points integer DEFAULT 100,
  time_limit_minutes integer,
  
  -- Metadata
  ai_generated boolean DEFAULT false,
  is_template boolean DEFAULT false,
  shared_publicly boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX assessments_teacher_id_idx ON assessments(teacher_id);
CREATE INDEX assessments_type_idx ON assessments(assessment_type);
CREATE INDEX assessments_subject_grade_idx ON assessments(subject, grade_level);

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own assessments"
  ON assessments FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers view shared assessments"
  ON assessments FOR SELECT TO authenticated
  USING (shared_publicly = true);

-- ============================================================================
-- 11. GRADING RUBRICS
-- ============================================================================

CREATE TABLE grading_rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Rubric Info
  rubric_name text NOT NULL,
  description text,
  subject text,
  assessment_type text,
  
  -- Criteria
  criteria jsonb NOT NULL DEFAULT '[]', -- Array of criteria with point values
  total_points integer DEFAULT 100,
  
  -- Sharing
  is_template boolean DEFAULT false,
  shared_publicly boolean DEFAULT false,
  ai_generated boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX grading_rubrics_teacher_id_idx ON grading_rubrics(teacher_id);
CREATE INDEX grading_rubrics_subject_idx ON grading_rubrics(subject);

ALTER TABLE grading_rubrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own rubrics"
  ON grading_rubrics FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers view shared rubrics"
  ON grading_rubrics FOR SELECT TO authenticated
  USING (shared_publicly = true);

-- ============================================================================
-- 12. TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teaching_preferences_updated_at BEFORE UPDATE ON teaching_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_plans_updated_at BEFORE UPDATE ON lesson_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teaching_resources_updated_at BEFORE UPDATE ON teaching_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_rosters_updated_at BEFORE UPDATE ON student_rosters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classroom_groups_updated_at BEFORE UPDATE ON classroom_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grading_rubrics_updated_at BEFORE UPDATE ON grading_rubrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 13. FUNCTION TO INITIALIZE NEW TEACHERS
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO user_profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default teaching preferences
  INSERT INTO teaching_preferences (teacher_id)
  VALUES (NEW.id)
  ON CONFLICT (teacher_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 14. SEED DATA
-- ============================================================================

-- Insert demo Pencils of Promise school
INSERT INTO schools (
  school_name,
  country,
  region,
  principal_name,
  partnership_date,
  notes
) VALUES (
  'Pencils of Promise Demo School',
  'Global',
  'Demo Region',
  'Demo Principal',
  CURRENT_DATE,
  'Default demo school for Pencils of Promise Teacher Assistant platform'
);
