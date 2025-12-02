/*
  # Fix Database Performance - Part 1: Foreign Key Indexes
  
  Adds missing indexes for all unindexed foreign keys to improve query performance.
  
  ## Changes
  - Adds indexes for 8 foreign key columns across multiple tables
  - Improves JOIN performance and referential integrity checks
*/

-- Index for attendance_records.recorded_by foreign key
CREATE INDEX IF NOT EXISTS idx_attendance_records_recorded_by 
ON public.attendance_records(recorded_by);

-- Index for class_documents.parent_version_id foreign key
CREATE INDEX IF NOT EXISTS idx_class_documents_parent_version_id 
ON public.class_documents(parent_version_id);

-- Index for conversations.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_conversations_user_id 
ON public.conversations(user_id);

-- Index for employee_access_logs.employee_id foreign key
CREATE INDEX IF NOT EXISTS idx_employee_access_logs_employee_id 
ON public.employee_access_logs(employee_id);

-- Index for employees.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_employees_user_id 
ON public.employees(user_id);

-- Index for employment_letters.employee_id foreign key
CREATE INDEX IF NOT EXISTS idx_employment_letters_employee_id 
ON public.employment_letters(employee_id);

-- Index for messages.conversation_id foreign key
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
ON public.messages(conversation_id);

-- Index for payslip_details.payslip_id foreign key
CREATE INDEX IF NOT EXISTS idx_payslip_details_payslip_id 
ON public.payslip_details(payslip_id);