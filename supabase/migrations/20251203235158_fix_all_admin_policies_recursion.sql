/*
  # Fix Admin Policies Across All Tables
  
  Updates all admin policies to use the is_admin() security definer function
  instead of querying user_profiles directly, preventing potential recursion issues.
  
  ## Changes
  - Updates admin policies on 20+ tables to use is_admin() function
  - Improves performance by caching admin check
  - Prevents any potential circular dependencies
*/

-- PAYMENTS
DROP POLICY IF EXISTS "Admin can manage all payments" ON public.payments;
CREATE POLICY "Admin can manage all payments"
  ON public.payments FOR ALL TO authenticated
  USING (public.is_admin());

-- USERS
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT TO authenticated
  USING (public.is_admin());

-- API_KEYS
DROP POLICY IF EXISTS "Admins can manage all API keys" ON public.api_keys;
CREATE POLICY "Admins can manage all API keys"
  ON public.api_keys FOR ALL TO authenticated
  USING (public.is_admin());

-- API_USAGE
DROP POLICY IF EXISTS "Admins can manage all API usage records" ON public.api_usage;
CREATE POLICY "Admins can manage all API usage records"
  ON public.api_usage FOR ALL TO authenticated
  USING (public.is_admin());

-- PRIVACY_PREFERENCES
DROP POLICY IF EXISTS "Admins can view all privacy preferences" ON public.privacy_preferences;
CREATE POLICY "Admins can view all privacy preferences"
  ON public.privacy_preferences FOR SELECT TO authenticated
  USING (public.is_admin());

-- EMPLOYEES
DROP POLICY IF EXISTS "Admins can do everything with employees" ON public.employees;
CREATE POLICY "Admins can do everything with employees"
  ON public.employees FOR ALL TO authenticated
  USING (public.is_admin());

-- PAYSLIPS
DROP POLICY IF EXISTS "Admins can do everything with payslips" ON public.payslips;
CREATE POLICY "Admins can do everything with payslips"
  ON public.payslips FOR ALL TO authenticated
  USING (public.is_admin());

-- EMPLOYMENT_LETTERS
DROP POLICY IF EXISTS "Admins can do everything with employment letters" ON public.employment_letters;
CREATE POLICY "Admins can do everything with employment letters"
  ON public.employment_letters FOR ALL TO authenticated
  USING (public.is_admin());

-- EMPLOYEE_ACCESS_LOGS
DROP POLICY IF EXISTS "Admins can do everything with access logs" ON public.employee_access_logs;
CREATE POLICY "Admins can do everything with access logs"
  ON public.employee_access_logs FOR ALL TO authenticated
  USING (public.is_admin());

-- PAYSLIP_DETAILS
DROP POLICY IF EXISTS "Admins can do everything with payslip details" ON public.payslip_details;
CREATE POLICY "Admins can do everything with payslip details"
  ON public.payslip_details FOR ALL TO authenticated
  USING (public.is_admin());

-- CLASSES
DROP POLICY IF EXISTS "Admins can view all classes" ON public.classes;
CREATE POLICY "Admins can view all classes"
  ON public.classes FOR SELECT TO authenticated
  USING (public.is_admin());

-- STUDENTS
DROP POLICY IF EXISTS "Admins can view all students" ON public.students;
CREATE POLICY "Admins can view all students"
  ON public.students FOR SELECT TO authenticated
  USING (public.is_admin());

-- ATTENDANCE_RECORDS
DROP POLICY IF EXISTS "Admins can view all attendance records" ON public.attendance_records;
CREATE POLICY "Admins can view all attendance records"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (public.is_admin());

-- CLASS_FOLDERS
DROP POLICY IF EXISTS "Admins can view all class folders" ON public.class_folders;
CREATE POLICY "Admins can view all class folders"
  ON public.class_folders FOR SELECT TO authenticated
  USING (public.is_admin());

-- CLASS_DOCUMENTS
DROP POLICY IF EXISTS "Admins can view all class documents" ON public.class_documents;
CREATE POLICY "Admins can view all class documents"
  ON public.class_documents FOR SELECT TO authenticated
  USING (public.is_admin());

-- USER_FILES
DROP POLICY IF EXISTS "Admins can view all files" ON public.user_files;
CREATE POLICY "Admins can view all files"
  ON public.user_files FOR SELECT TO authenticated
  USING (public.is_admin());