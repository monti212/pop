/*
  # Fix Function Search Path Security Vulnerabilities
  
  1. Security Fixes
    - Set fixed search_path on all functions
    - Prevents search_path injection attacks
    - All 64 functions affected
  
  2. Impact
    - Functions can no longer be hijacked by malicious objects
    - Follows PostgreSQL security best practices
*/

ALTER FUNCTION track_usage_event SET search_path = public, pg_temp;
ALTER FUNCTION create_default_class_folders SET search_path = public, pg_temp;
ALTER FUNCTION calculate_student_attendance_rate SET search_path = public, pg_temp;
ALTER FUNCTION upsert_daily_usage_metric SET search_path = public, pg_temp;
ALTER FUNCTION update_updated_at_column SET search_path = public, pg_temp;
ALTER FUNCTION calculate_monthly_balance SET search_path = public, pg_temp;
ALTER FUNCTION update_folder_document_count SET search_path = public, pg_temp;
ALTER FUNCTION get_active_knowledge_base SET search_path = public, pg_temp;
ALTER FUNCTION get_platform_usage_summary SET search_path = public, pg_temp;
ALTER FUNCTION update_files_updated_at SET search_path = public, pg_temp;
ALTER FUNCTION update_folder_path SET search_path = public, pg_temp;
ALTER FUNCTION log_knowledge_action SET search_path = public, pg_temp;
ALTER FUNCTION extract_lesson_topic SET search_path = public, pg_temp;
ALTER FUNCTION check_student_limit SET search_path = public, pg_temp;
ALTER FUNCTION update_knowledge_documents_updated_at SET search_path = public, pg_temp;
ALTER FUNCTION handle_new_user SET search_path = public, pg_temp;
ALTER FUNCTION update_phone_verifications_updated_at SET search_path = public, pg_temp;
ALTER FUNCTION get_micro_knowledge_base SET search_path = public, pg_temp;
ALTER FUNCTION check_class_limit SET search_path = public, pg_temp;
ALTER FUNCTION get_classes_missing_attendance SET search_path = public, pg_temp;
ALTER FUNCTION set_document_user_id SET search_path = public, pg_temp;
ALTER FUNCTION get_user_token_usage_details SET search_path = public, pg_temp;
ALTER FUNCTION calculate_extraction_quality SET search_path = public, pg_temp;
ALTER FUNCTION update_class_assessments_updated_at SET search_path = public, pg_temp;
ALTER FUNCTION update_category_document_count SET search_path = public, pg_temp;
ALTER FUNCTION sync_attendance_is_present SET search_path = public, pg_temp;
ALTER FUNCTION get_file_format_from_mime SET search_path = public, pg_temp;
ALTER FUNCTION adjust_token_cap SET search_path = public, pg_temp;
ALTER FUNCTION assign_gaone_supa_admin_role SET search_path = public, pg_temp;
ALTER FUNCTION generate_share_token SET search_path = public, pg_temp;
ALTER FUNCTION get_class_document_stats SET search_path = public, pg_temp;
ALTER FUNCTION trigger_alert SET search_path = public, pg_temp;
ALTER FUNCTION calculate_rollover_tokens SET search_path = public, pg_temp;
ALTER FUNCTION calculate_class_attendance_rate SET search_path = public, pg_temp;
ALTER FUNCTION get_token_metrics SET search_path = public, pg_temp;
ALTER FUNCTION calculate_document_relevance SET search_path = public, pg_temp;
ALTER FUNCTION auto_extract_keywords SET search_path = public, pg_temp;
ALTER FUNCTION get_relevant_knowledge_base SET search_path = public, pg_temp;
ALTER FUNCTION add_token_refill SET search_path = public, pg_temp;
ALTER FUNCTION calculate_image_tokens_remaining SET search_path = public, pg_temp;
ALTER FUNCTION cleanup_user_file_storage SET search_path = public, pg_temp;
ALTER FUNCTION calculate_image_tokens_used SET search_path = public, pg_temp;
ALTER FUNCTION update_class_student_count SET search_path = public, pg_temp;
ALTER FUNCTION record_system_metric SET search_path = public, pg_temp;
ALTER FUNCTION update_student_gpa_trigger SET search_path = public, pg_temp;
ALTER FUNCTION extract_keywords_from_text SET search_path = public, pg_temp;
ALTER FUNCTION get_user_usage_summary SET search_path = public, pg_temp;
ALTER FUNCTION calculate_total_plan_balance SET search_path = public, pg_temp;
ALTER FUNCTION set_file_display_name SET search_path = public, pg_temp;
ALTER FUNCTION get_class_grade_distribution SET search_path = public, pg_temp;
ALTER FUNCTION update_knowledge_usage_stats SET search_path = public, pg_temp;
ALTER FUNCTION update_conversation_summary_timestamp SET search_path = public, pg_temp;
ALTER FUNCTION sync_team_role_to_jwt SET search_path = public, pg_temp;
ALTER FUNCTION get_concurrent_users_count SET search_path = public, pg_temp;
ALTER FUNCTION update_model_usage_daily_summary SET search_path = public, pg_temp;
ALTER FUNCTION get_class_documents_with_folders SET search_path = public, pg_temp;
ALTER FUNCTION calculate_monthly_cap SET search_path = public, pg_temp;
ALTER FUNCTION calculate_student_gpa SET search_path = public, pg_temp;
ALTER FUNCTION search_knowledge_base SET search_path = public, pg_temp;
ALTER FUNCTION set_attendance_recorded_by SET search_path = public, pg_temp;
ALTER FUNCTION generate_conversation_title SET search_path = public, pg_temp;
ALTER FUNCTION calculate_refill_balance SET search_path = public, pg_temp;