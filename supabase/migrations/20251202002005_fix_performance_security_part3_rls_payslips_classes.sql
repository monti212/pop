/*
  # Fix Database Performance - Part 3: RLS Optimization (Payslips & Classes)
  
  Continues RLS policy optimization for payslips, employment letters, classes, and students.
*/

-- =====================================================
-- PAYSLIPS & RELATED TABLES
-- =====================================================

DROP POLICY IF EXISTS "Employees can view their own payslips" ON public.payslips;
CREATE POLICY "Employees can view their own payslips"
  ON public.payslips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = payslips.employee_id
      AND employees.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can do everything with payslips" ON public.payslips;
CREATE POLICY "Admins can do everything with payslips"
  ON public.payslips
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Employees can view their own employment letters" ON public.employment_letters;
CREATE POLICY "Employees can view their own employment letters"
  ON public.employment_letters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employment_letters.employee_id
      AND employees.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can do everything with employment letters" ON public.employment_letters;
CREATE POLICY "Admins can do everything with employment letters"
  ON public.employment_letters
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Employees can view their own access logs" ON public.employee_access_logs;
CREATE POLICY "Employees can view their own access logs"
  ON public.employee_access_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_access_logs.employee_id
      AND employees.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can do everything with access logs" ON public.employee_access_logs;
CREATE POLICY "Admins can do everything with access logs"
  ON public.employee_access_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Employees can view their own payslip details" ON public.payslip_details;
CREATE POLICY "Employees can view their own payslip details"
  ON public.payslip_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payslips
      JOIN public.employees ON employees.id = payslips.employee_id
      WHERE payslips.id = payslip_details.payslip_id
      AND employees.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can do everything with payslip details" ON public.payslip_details;
CREATE POLICY "Admins can do everything with payslip details"
  ON public.payslip_details
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- =====================================================
-- CLASSES & STUDENTS
-- =====================================================

DROP POLICY IF EXISTS "Teachers can manage their own classes" ON public.classes;
CREATE POLICY "Teachers can manage their own classes"
  ON public.classes
  FOR ALL
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all classes" ON public.classes;
CREATE POLICY "Admins can view all classes"
  ON public.classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Teachers can manage students in their classes" ON public.students;
CREATE POLICY "Teachers can manage students in their classes"
  ON public.students
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = students.class_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view all students" ON public.students;
CREATE POLICY "Admins can view all students"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- =====================================================
-- ATTENDANCE RECORDS
-- =====================================================

DROP POLICY IF EXISTS "Teachers can manage attendance for their students" ON public.attendance_records;
CREATE POLICY "Teachers can manage attendance for their students"
  ON public.attendance_records
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      JOIN public.classes ON classes.id = students.class_id
      WHERE students.id = attendance_records.student_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view all attendance records" ON public.attendance_records;
CREATE POLICY "Admins can view all attendance records"
  ON public.attendance_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- =====================================================
-- CLASS FOLDERS & DOCUMENTS
-- =====================================================

DROP POLICY IF EXISTS "Teachers can manage folders for their classes" ON public.class_folders;
CREATE POLICY "Teachers can manage folders for their classes"
  ON public.class_folders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_folders.class_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view all class folders" ON public.class_folders;
CREATE POLICY "Admins can view all class folders"
  ON public.class_folders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Teachers can manage documents for their classes" ON public.class_documents;
CREATE POLICY "Teachers can manage documents for their classes"
  ON public.class_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_documents.class_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view all class documents" ON public.class_documents;
CREATE POLICY "Admins can view all class documents"
  ON public.class_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- =====================================================
-- USER FILES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage their own files" ON public.user_files;
CREATE POLICY "Users can manage their own files"
  ON public.user_files
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all files" ON public.user_files;
CREATE POLICY "Admins can view all files"
  ON public.user_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );