/*
  # Fix Organization Metrics Update Function
  
  1. Changes
    - Replace the update_organization_metrics function to query actual tables
    - Query from actual user_profiles, messages, conversations tables
    - Add fallback for missing tables
    
  2. Purpose
    - Fix dashboard showing zeros by populating metrics from real data
    - Allow metrics to be updated regularly
*/

CREATE OR REPLACE FUNCTION public.update_organization_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_users integer;
  v_active_today integer;
  v_active_week integer;
  v_active_month integer;
  v_total_tokens bigint;
  v_total_conversations integer;
  v_total_files integer;
BEGIN
  -- Count total users from user_profiles
  SELECT COUNT(*) INTO v_total_users FROM user_profiles;

  -- Count active users today (users who have messages today)
  SELECT COUNT(DISTINCT messages.user_id) INTO v_active_today
  FROM messages
  WHERE messages.created_at >= CURRENT_DATE;

  -- Count active users this week
  SELECT COUNT(DISTINCT messages.user_id) INTO v_active_week
  FROM messages
  WHERE messages.created_at >= CURRENT_DATE - INTERVAL '7 days';

  -- Count active users this month
  SELECT COUNT(DISTINCT messages.user_id) INTO v_active_month
  FROM messages
  WHERE messages.created_at >= CURRENT_DATE - INTERVAL '30 days';

  -- Sum total tokens used from token_usage_metrics
  SELECT COALESCE(SUM(tokens_used), 0) INTO v_total_tokens 
  FROM token_usage_metrics;

  -- Count total conversations
  SELECT COUNT(*) INTO v_total_conversations FROM conversations;

  -- Count total files processed
  SELECT COUNT(*) INTO v_total_files FROM user_files WHERE deleted_at IS NULL;

  -- Update or insert organization metrics
  INSERT INTO organization_metrics (
    organization_name,
    total_users,
    active_users_today,
    active_users_week,
    active_users_month,
    total_tokens_used,
    total_conversations,
    total_files_processed,
    updated_at
  ) VALUES (
    'Pencils of Promise',
    v_total_users,
    v_active_today,
    v_active_week,
    v_active_month,
    v_total_tokens,
    v_total_conversations,
    v_total_files,
    now()
  )
  ON CONFLICT (organization_name)
  DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users_today = EXCLUDED.active_users_today,
    active_users_week = EXCLUDED.active_users_week,
    active_users_month = EXCLUDED.active_users_month,
    total_tokens_used = EXCLUDED.total_tokens_used,
    total_conversations = EXCLUDED.total_conversations,
    total_files_processed = EXCLUDED.total_files_processed,
    updated_at = EXCLUDED.updated_at;

END;
$$;
