/*
  # Remove Duplicate Indexes
  
  Removes duplicate indexes created in previous migration.
  Keeps the newer idx_* naming convention and removes older duplicates.
  
  ## Changes
  - Drops 8 duplicate indexes
  - Improves database performance by reducing index maintenance overhead
*/

-- Drop the newer indexes we just created, keep the original ones
DROP INDEX IF EXISTS public.idx_attendance_records_recorded_by;
DROP INDEX IF EXISTS public.idx_class_documents_parent_version_id;
DROP INDEX IF EXISTS public.idx_conversations_user_id;
DROP INDEX IF EXISTS public.idx_employee_access_logs_employee_id;
DROP INDEX IF EXISTS public.idx_employees_user_id;
DROP INDEX IF EXISTS public.idx_employment_letters_employee_id;
DROP INDEX IF EXISTS public.idx_messages_conversation_id;
DROP INDEX IF EXISTS public.idx_payslip_details_payslip_id;