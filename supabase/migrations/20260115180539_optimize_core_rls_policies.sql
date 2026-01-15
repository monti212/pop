/*
  # Optimize Core RLS Policies - Part 1

  1. Performance Improvements
    - Replace auth.uid() with (select auth.uid()) in policies
    - Prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  2. Tables Optimized
    - user_profiles, conversations, messages, classes
    - students, grade_categories, assignments, student_grades
    - attendance_records, user_documents, user_files
*/

-- user_profiles policies
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (select auth.uid())
      AND up.team_role IN ('supa_admin', 'admin')
    )
  );

-- conversations policies
DROP POLICY IF EXISTS "Teachers manage own teaching sessions" ON conversations;
CREATE POLICY "Teachers manage own teaching sessions" ON conversations
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all conversations" ON conversations;
CREATE POLICY "Admins can view all conversations" ON conversations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- messages policies
DROP POLICY IF EXISTS "Teachers view messages in their sessions" ON messages;
CREATE POLICY "Teachers view messages in their sessions" ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Teachers insert messages in their sessions" ON messages;
CREATE POLICY "Teachers insert messages in their sessions" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Teachers update messages in their sessions" ON messages;
CREATE POLICY "Teachers update messages in their sessions" ON messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
CREATE POLICY "Admins can view all messages" ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- classes policies
DROP POLICY IF EXISTS "Teachers can manage their own classes" ON classes;
CREATE POLICY "Teachers can manage their own classes" ON classes
  FOR ALL TO authenticated
  USING (teacher_id = (select auth.uid()))
  WITH CHECK (teacher_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all classes" ON classes;
CREATE POLICY "Admins can view all classes" ON classes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- students policies
DROP POLICY IF EXISTS "Teachers can manage students in their classes" ON students;
CREATE POLICY "Teachers can manage students in their classes" ON students
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = students.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = students.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view all students" ON students;
CREATE POLICY "Admins can view all students" ON students
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- grade_categories policies
DROP POLICY IF EXISTS "Teachers can view their own class grade categories" ON grade_categories;
CREATE POLICY "Teachers can view their own class grade categories" ON grade_categories
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = grade_categories.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Teachers can insert grade categories for their classes" ON grade_categories;
CREATE POLICY "Teachers can insert grade categories for their classes" ON grade_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = grade_categories.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Teachers can update their own class grade categories" ON grade_categories;
CREATE POLICY "Teachers can update their own class grade categories" ON grade_categories
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = grade_categories.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = grade_categories.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Teachers can delete their own class grade categories" ON grade_categories;
CREATE POLICY "Teachers can delete their own class grade categories" ON grade_categories
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = grade_categories.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

-- assignments policies
DROP POLICY IF EXISTS "Teachers can view their own class assignments" ON assignments;
CREATE POLICY "Teachers can view their own class assignments" ON assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = assignments.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Teachers can insert assignments for their classes" ON assignments;
CREATE POLICY "Teachers can insert assignments for their classes" ON assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = assignments.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Teachers can update their own class assignments" ON assignments;
CREATE POLICY "Teachers can update their own class assignments" ON assignments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = assignments.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = assignments.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Teachers can delete their own class assignments" ON assignments;
CREATE POLICY "Teachers can delete their own class assignments" ON assignments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = assignments.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

-- student_grades policies
DROP POLICY IF EXISTS "Teachers can view grades for their class students" ON student_grades;
CREATE POLICY "Teachers can view grades for their class students" ON student_grades
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_grades.student_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Teachers can insert grades for their class students" ON student_grades;
CREATE POLICY "Teachers can insert grades for their class students" ON student_grades
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_grades.student_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Teachers can update grades for their class students" ON student_grades;
CREATE POLICY "Teachers can update grades for their class students" ON student_grades
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_grades.student_id
      AND classes.teacher_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_grades.student_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Teachers can delete grades for their class students" ON student_grades;
CREATE POLICY "Teachers can delete grades for their class students" ON student_grades
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = student_grades.student_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

-- attendance_records policies
DROP POLICY IF EXISTS "Teachers can manage attendance for their students" ON attendance_records;
CREATE POLICY "Teachers can manage attendance for their students" ON attendance_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = attendance_records.student_id
      AND classes.teacher_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      JOIN classes ON students.class_id = classes.id
      WHERE students.id = attendance_records.student_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view all attendance records" ON attendance_records;
CREATE POLICY "Admins can view all attendance records" ON attendance_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- user_documents policies
DROP POLICY IF EXISTS "Teachers manage own documents" ON user_documents;
CREATE POLICY "Teachers manage own documents" ON user_documents
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins view all documents" ON user_documents;
CREATE POLICY "Admins view all documents" ON user_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- user_files policies
DROP POLICY IF EXISTS "Teachers manage own files" ON user_files;
CREATE POLICY "Teachers manage own files" ON user_files
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view shared files" ON user_files;
CREATE POLICY "Users can view shared files" ON user_files
  FOR SELECT TO authenticated
  USING (
    is_shared = true
    OR user_id = (select auth.uid())
  );