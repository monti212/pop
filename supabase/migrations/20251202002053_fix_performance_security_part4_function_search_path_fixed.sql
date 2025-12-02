/*
  # Fix Database Performance - Part 4: Function Search Path Security
  
  Fixes search_path mutability for all database functions to prevent
  potential security vulnerabilities.
  
  ## Security Impact
  - Prevents search_path manipulation attacks
  - Ensures functions always execute in correct schema context
  - Improves function security and reliability
*/

-- Set immutable search_path for all trigger and utility functions

ALTER FUNCTION public.update_updated_at_column() 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.check_class_limit() 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.check_student_limit() 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_class_student_count() 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.set_attendance_recorded_by() 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.calculate_student_attendance_rate(uuid, date, date) 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_api_usage_stats(uuid) 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.increment_message_count(uuid) 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.handle_new_user() 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.log_payslip_download() 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.log_letter_view() 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.log_letter_download() 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.reset_daily_message_count() 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.increment(uuid, integer) 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.check_subscription_expiry() 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.log_payslip_view() 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.calculate_class_attendance_rate(uuid, date, date) 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_classes_missing_attendance(date) 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.create_default_class_folders() 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_folder_document_count() 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.set_document_user_id() 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_class_documents_with_folders(uuid) 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_class_document_stats(uuid) 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_user_files_updated_at() 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.cleanup_user_file_storage() 
  SET search_path = public, pg_catalog;