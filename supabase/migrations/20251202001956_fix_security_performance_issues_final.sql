/*
  # Fix Security and Performance Issues
  
  This migration addresses critical security and performance issues identified by Supabase:
  
  ## Changes Made
  
  ### 1. Foreign Key Indexes (Performance)
  - Add indexes for all unindexed foreign keys to improve query performance
  
  ### 2. RLS Policy Optimization (Performance)
  - Update all RLS policies to use (select auth.uid()) pattern
  - This prevents re-evaluation of auth functions for each row
  
  ### 3. Function Security (Security)
  - Set search_path for all functions to prevent security vulnerabilities
*/

-- =====================================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS attendance_records_recorded_by_idx ON public.attendance_records(recorded_by);
CREATE INDEX IF NOT EXISTS class_documents_parent_version_id_idx ON public.class_documents(parent_version_id);
CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS employee_access_logs_employee_id_idx ON public.employee_access_logs(employee_id);
CREATE INDEX IF NOT EXISTS employees_user_id_idx ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS employment_letters_employee_id_idx ON public.employment_letters(employee_id);
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS payslip_details_payslip_id_idx ON public.payslip_details(payslip_id);

-- =====================================================
-- PART 2: FIX RLS POLICIES - PAYMENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Admin can manage all payments" ON public.payments;

CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admin can manage all payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- =====================================================
-- PART 3: FIX RLS POLICIES - USERS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;

CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

CREATE POLICY "Users can insert own data"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can read own data"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

-- =====================================================
-- PART 4: FIX RLS POLICIES - API_KEYS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can manage all API keys" ON public.api_keys;

CREATE POLICY "Users can view their own API keys"
  ON public.api_keys FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own API keys"
  ON public.api_keys FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own API keys"
  ON public.api_keys FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own API keys"
  ON public.api_keys FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can manage all API keys"
  ON public.api_keys FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- =====================================================
-- PART 5: FIX RLS POLICIES - USER_PROFILES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin full access" ON public.user_profiles;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Admin full access"
  ON public.user_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (select auth.uid())
      AND up.team_role IN ('supa_admin', 'admin')
    )
  );

-- =====================================================
-- PART 6: FIX RLS POLICIES - API_USAGE, CONVERSATIONS, MESSAGES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own API usage" ON public.api_usage;
DROP POLICY IF EXISTS "Admins can manage all API usage records" ON public.api_usage;

CREATE POLICY "Users can view their own API usage"
  ON public.api_usage FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can manage all API usage records"
  ON public.api_usage FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;

CREATE POLICY "Users can view their own conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own conversations"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own conversations"
  ON public.conversations FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages into their conversations" ON public.messages;

CREATE POLICY "Users can view messages from their conversations"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert messages into their conversations"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- PART 7: FIX RLS POLICIES - PRIVACY_PREFERENCES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own privacy preferences" ON public.privacy_preferences;
DROP POLICY IF EXISTS "Users can update their own privacy preferences" ON public.privacy_preferences;
DROP POLICY IF EXISTS "Users can insert their own privacy preferences" ON public.privacy_preferences;
DROP POLICY IF EXISTS "Admins can view all privacy preferences" ON public.privacy_preferences;

CREATE POLICY "Users can view their own privacy preferences"
  ON public.privacy_preferences FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own privacy preferences"
  ON public.privacy_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own privacy preferences"
  ON public.privacy_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Admins can view all privacy preferences"
  ON public.privacy_preferences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- =====================================================
-- PART 8: FIX RLS POLICIES - EMPLOYEE TABLES
-- =====================================================

DROP POLICY IF EXISTS "Employees can view their own data" ON public.employees;
DROP POLICY IF EXISTS "Employees can update their own data" ON public.employees;
DROP POLICY IF EXISTS "Admins can do everything with employees" ON public.employees;

CREATE POLICY "Employees can view their own data"
  ON public.employees FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Employees can update their own data"
  ON public.employees FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can do everything with employees"
  ON public.employees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Employees can view their own payslips" ON public.payslips;
DROP POLICY IF EXISTS "Admins can do everything with payslips" ON public.payslips;

CREATE POLICY "Employees can view their own payslips"
  ON public.payslips FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = payslips.employee_id
      AND employees.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can do everything with payslips"
  ON public.payslips FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Employees can view their own employment letters" ON public.employment_letters;
DROP POLICY IF EXISTS "Admins can do everything with employment letters" ON public.employment_letters;

CREATE POLICY "Employees can view their own employment letters"
  ON public.employment_letters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employment_letters.employee_id
      AND employees.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can do everything with employment letters"
  ON public.employment_letters FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Employees can view their own access logs" ON public.employee_access_logs;
DROP POLICY IF EXISTS "Admins can do everything with access logs" ON public.employee_access_logs;

CREATE POLICY "Employees can view their own access logs"
  ON public.employee_access_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_access_logs.employee_id
      AND employees.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can do everything with access logs"
  ON public.employee_access_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Employees can view their own payslip details" ON public.payslip_details;
DROP POLICY IF EXISTS "Admins can do everything with payslip details" ON public.payslip_details;

CREATE POLICY "Employees can view their own payslip details"
  ON public.payslip_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payslips
      JOIN public.employees ON employees.id = payslips.employee_id
      WHERE payslips.id = payslip_details.payslip_id
      AND employees.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can do everything with payslip details"
  ON public.payslip_details FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- =====================================================
-- PART 9: FIX RLS POLICIES - CLASSROOM TABLES
-- =====================================================

DROP POLICY IF EXISTS "Teachers can manage their own classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can view all classes" ON public.classes;

CREATE POLICY "Teachers can manage their own classes"
  ON public.classes FOR ALL
  TO authenticated
  USING (teacher_id = (select auth.uid()));

CREATE POLICY "Admins can view all classes"
  ON public.classes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Teachers can manage students in their classes" ON public.students;
DROP POLICY IF EXISTS "Admins can view all students" ON public.students;

CREATE POLICY "Teachers can manage students in their classes"
  ON public.students FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = students.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can view all students"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Teachers can manage attendance for their students" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins can view all attendance records" ON public.attendance_records;

CREATE POLICY "Teachers can manage attendance for their students"
  ON public.attendance_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      JOIN public.classes ON classes.id = students.class_id
      WHERE students.id = attendance_records.student_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can view all attendance records"
  ON public.attendance_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Teachers can manage folders for their classes" ON public.class_folders;
DROP POLICY IF EXISTS "Admins can view all class folders" ON public.class_folders;

CREATE POLICY "Teachers can manage folders for their classes"
  ON public.class_folders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_folders.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can view all class folders"
  ON public.class_folders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Teachers can manage documents for their classes" ON public.class_documents;
DROP POLICY IF EXISTS "Admins can view all class documents" ON public.class_documents;

CREATE POLICY "Teachers can manage documents for their classes"
  ON public.class_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_documents.class_id
      AND classes.teacher_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can view all class documents"
  ON public.class_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can manage their own files" ON public.user_files;
DROP POLICY IF EXISTS "Admins can view all files" ON public.user_files;

CREATE POLICY "Users can manage their own files"
  ON public.user_files FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can view all files"
  ON public.user_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- =====================================================
-- PART 10: FIX FUNCTION SECURITY - SET SEARCH_PATH
-- =====================================================

ALTER FUNCTION public.update_updated_at_column() SET search_path = pg_catalog, public;
ALTER FUNCTION public.check_class_limit() SET search_path = pg_catalog, public;
ALTER FUNCTION public.check_student_limit() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_class_student_count() SET search_path = pg_catalog, public;
ALTER FUNCTION public.set_attendance_recorded_by() SET search_path = pg_catalog, public;
ALTER FUNCTION public.calculate_student_attendance_rate(uuid, date, date) SET search_path = pg_catalog, public;
ALTER FUNCTION public.get_api_usage_stats(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.increment_message_count(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.handle_new_user() SET search_path = pg_catalog, public;
ALTER FUNCTION public.log_payslip_download() SET search_path = pg_catalog, public;
ALTER FUNCTION public.log_letter_view() SET search_path = pg_catalog, public;
ALTER FUNCTION public.log_letter_download() SET search_path = pg_catalog, public;
ALTER FUNCTION public.reset_daily_message_count() SET search_path = pg_catalog, public;
ALTER FUNCTION public.increment(uuid, integer) SET search_path = pg_catalog, public;
ALTER FUNCTION public.check_subscription_expiry() SET search_path = pg_catalog, public;
ALTER FUNCTION public.log_payslip_view() SET search_path = pg_catalog, public;
ALTER FUNCTION public.calculate_class_attendance_rate(uuid, date, date) SET search_path = pg_catalog, public;
ALTER FUNCTION public.get_classes_missing_attendance(date) SET search_path = pg_catalog, public;
ALTER FUNCTION public.create_default_class_folders() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_folder_document_count() SET search_path = pg_catalog, public;
ALTER FUNCTION public.set_document_user_id() SET search_path = pg_catalog, public;
ALTER FUNCTION public.get_class_documents_with_folders(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.get_class_document_stats(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_user_files_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.cleanup_user_file_storage() SET search_path = pg_catalog, public;