/*
  # Fix Foreign Key Indexes for Performance

  1. Performance Improvements
    - Add indexes on all unindexed foreign keys
    - Improves JOIN performance and foreign key constraint checks
    - Prevents table scans on foreign key lookups

  2. Security Impact
    - Better query performance reduces resource consumption
    - Prevents potential DoS through slow queries
*/

-- Add indexes on foreign keys without covering indexes
CREATE INDEX IF NOT EXISTS idx_alert_history_acknowledged_by ON alert_history(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_api_performance_log_user_id ON api_performance_log(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_lesson_plan_id ON assessments(lesson_plan_id);
CREATE INDEX IF NOT EXISTS idx_assignments_category_id ON assignments(category_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_recorded_by ON attendance_records(recorded_by);
CREATE INDEX IF NOT EXISTS idx_class_documents_parent_version_id ON class_documents(parent_version_id);
CREATE INDEX IF NOT EXISTS idx_error_log_resolved_by ON error_log(resolved_by);
CREATE INDEX IF NOT EXISTS idx_kb_categories_created_by ON knowledge_base_categories(created_by);
CREATE INDEX IF NOT EXISTS idx_kb_documents_uploaded_by ON knowledge_base_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_lesson_plan_requests_document_id ON lesson_plan_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_conversation_id ON lesson_plans(conversation_id);
CREATE INDEX IF NOT EXISTS idx_model_usage_logs_conversation_id ON model_usage_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_student_behavior_logs_recorded_by ON student_behavior_logs(recorded_by);
CREATE INDEX IF NOT EXISTS idx_student_grades_category_id ON student_grades(category_id);
CREATE INDEX IF NOT EXISTS idx_teacher_calendar_assessment_id ON teacher_calendar(assessment_id);
CREATE INDEX IF NOT EXISTS idx_teacher_calendar_lesson_plan_id ON teacher_calendar(lesson_plan_id);
CREATE INDEX IF NOT EXISTS idx_teaching_resources_lesson_plan_id ON teaching_resources(lesson_plan_id);
CREATE INDEX IF NOT EXISTS idx_teaching_tips_author_id ON teaching_tips(author_id);
CREATE INDEX IF NOT EXISTS idx_token_refills_added_by_user_id ON token_refills(added_by_user_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_conversation_id ON usage_metrics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_message_id ON user_documents(message_id);