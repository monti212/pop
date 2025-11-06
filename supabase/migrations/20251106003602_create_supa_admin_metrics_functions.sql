/*
  # Supa Admin Metrics Functions

  1. Functions
    - `get_user_activity_summary()` - Returns aggregated user activity metrics
    - `get_token_usage_summary()` - Returns aggregated token usage metrics per user
    - `update_organization_metrics()` - Updates organization-wide metrics
    
  2. Security
    - All functions can only be executed by monti@orionx.xyz (supa admin)
*/

-- Function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary()
RETURNS TABLE (
  user_email text,
  total_sessions bigint,
  total_duration_seconds bigint,
  total_touchpoints bigint,
  last_active timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if current user is supa admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'monti@orionx.xyz'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only supa admin can access this function';
  END IF;

  RETURN QUERY
  SELECT 
    au.email::text as user_email,
    COUNT(uam.id) as total_sessions,
    COALESCE(SUM(uam.duration_seconds), 0)::bigint as total_duration_seconds,
    COALESCE(SUM(uam.touchpoints), 0)::bigint as total_touchpoints,
    MAX(uam.session_start) as last_active
  FROM auth.users au
  LEFT JOIN user_activity_metrics uam ON au.id = uam.user_id
  GROUP BY au.email
  HAVING COUNT(uam.id) > 0
  ORDER BY last_active DESC;
END;
$$;

-- Function to get token usage summary
CREATE OR REPLACE FUNCTION get_token_usage_summary()
RETURNS TABLE (
  user_email text,
  total_tokens bigint,
  model_breakdown jsonb
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if current user is supa admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'monti@orionx.xyz'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only supa admin can access this function';
  END IF;

  RETURN QUERY
  SELECT 
    au.email::text as user_email,
    COALESCE(SUM(tum.tokens_used), 0)::bigint as total_tokens,
    jsonb_object_agg(
      tum.model_used,
      SUM(tum.tokens_used)
    ) FILTER (WHERE tum.model_used IS NOT NULL) as model_breakdown
  FROM auth.users au
  LEFT JOIN token_usage_metrics tum ON au.id = tum.user_id
  GROUP BY au.email
  HAVING COUNT(tum.id) > 0
  ORDER BY total_tokens DESC;
END;
$$;

-- Function to update organization metrics (can be called periodically or on-demand)
CREATE OR REPLACE FUNCTION update_organization_metrics()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
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
  -- Check if current user is supa admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'monti@orionx.xyz'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only supa admin can access this function';
  END IF;

  -- Count total users
  SELECT COUNT(*) INTO v_total_users FROM auth.users;

  -- Count active users today
  SELECT COUNT(DISTINCT user_id) INTO v_active_today
  FROM user_activity_metrics
  WHERE session_start >= CURRENT_DATE;

  -- Count active users this week
  SELECT COUNT(DISTINCT user_id) INTO v_active_week
  FROM user_activity_metrics
  WHERE session_start >= CURRENT_DATE - INTERVAL '7 days';

  -- Count active users this month
  SELECT COUNT(DISTINCT user_id) INTO v_active_month
  FROM user_activity_metrics
  WHERE session_start >= CURRENT_DATE - INTERVAL '30 days';

  -- Sum total tokens used
  SELECT COALESCE(SUM(tokens_used), 0) INTO v_total_tokens
  FROM token_usage_metrics;

  -- Count total conversations (assuming conversations table exists)
  SELECT COUNT(*) INTO v_total_conversations
  FROM conversations;

  -- Count total files processed (assuming user_files table exists)
  SELECT COUNT(*) INTO v_total_files
  FROM user_files;

  -- Update organization metrics
  UPDATE organization_metrics
  SET 
    total_users = v_total_users,
    active_users_today = v_active_today,
    active_users_week = v_active_week,
    active_users_month = v_active_month,
    total_tokens_used = v_total_tokens,
    total_conversations = v_total_conversations,
    total_files_processed = v_total_files,
    updated_at = now()
  WHERE organization_name = 'Pencils of Promise';

END;
$$;

-- Grant execute permissions to authenticated users (RLS will handle authorization)
GRANT EXECUTE ON FUNCTION get_user_activity_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_token_usage_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION update_organization_metrics() TO authenticated;