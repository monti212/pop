/*
  # Create Monitoring Metrics Schema

  ## Purpose
  Establish comprehensive monitoring infrastructure for tracking system performance,
  user activity, and operational metrics to support 500 concurrent teachers.

  ## New Tables

  ### 1. system_metrics
  Stores real-time and historical system performance metrics
  - `id` (uuid, primary key)
  - `metric_type` (text) - Type of metric (concurrent_users, connection_pool, error_rate, etc.)
  - `metric_value` (numeric) - The measured value
  - `metadata` (jsonb) - Additional context (region, breakdown, etc.)
  - `recorded_at` (timestamptz) - When the metric was recorded
  - `created_at` (timestamptz)

  ### 2. active_sessions_log
  Tracks active user sessions for concurrent user monitoring
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `session_start` (timestamptz)
  - `session_end` (timestamptz, nullable)
  - `last_activity` (timestamptz)
  - `region` (text)
  - `device_type` (text)
  - `ip_address` (text)
  - `created_at` (timestamptz)

  ### 3. api_performance_log
  Detailed logging of API endpoint performance
  - `id` (uuid, primary key)
  - `endpoint` (text) - API endpoint called
  - `method` (text) - HTTP method
  - `response_time_ms` (integer) - Response time in milliseconds
  - `status_code` (integer) - HTTP status code
  - `user_id` (uuid, nullable)
  - `error_message` (text, nullable)
  - `request_size_bytes` (integer)
  - `response_size_bytes` (integer)
  - `recorded_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 4. error_log
  Centralized error tracking
  - `id` (uuid, primary key)
  - `error_type` (text) - frontend, backend, database, external_api
  - `severity` (text) - critical, error, warning, info
  - `error_code` (text)
  - `error_message` (text)
  - `stack_trace` (text, nullable)
  - `user_id` (uuid, nullable)
  - `endpoint` (text, nullable)
  - `context` (jsonb) - Additional context
  - `resolved` (boolean) - Whether error has been addressed
  - `resolved_at` (timestamptz, nullable)
  - `resolved_by` (uuid, nullable)
  - `recorded_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 5. alert_history
  Track system alerts and incidents
  - `id` (uuid, primary key)
  - `alert_type` (text) - connection_pool, token_limit, error_rate, etc.
  - `severity` (text) - warning, critical
  - `alert_message` (text)
  - `metric_value` (numeric)
  - `threshold_value` (numeric)
  - `acknowledged` (boolean)
  - `acknowledged_at` (timestamptz, nullable)
  - `acknowledged_by` (uuid, nullable)
  - `resolved` (boolean)
  - `resolved_at` (timestamptz, nullable)
  - `resolution_notes` (text, nullable)
  - `triggered_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 6. database_metrics
  Database-specific performance metrics
  - `id` (uuid, primary key)
  - `active_connections` (integer)
  - `max_connections` (integer)
  - `database_size_mb` (numeric)
  - `cache_hit_ratio` (numeric)
  - `transactions_per_second` (numeric)
  - `slow_query_count` (integer)
  - `cpu_usage_percent` (numeric)
  - `memory_usage_percent` (numeric)
  - `recorded_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Indexes
  - Time-based indexes for efficient time-range queries
  - User-based indexes for per-user analytics
  - Metric type indexes for filtering
  - Composite indexes for common query patterns

  ## Security
  - RLS enabled on all tables
  - Only supa_admin and optimus_prime roles can access
  - Regular users cannot view monitoring data
*/

-- Create system_metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_metrics_type_time_idx 
  ON system_metrics(metric_type, recorded_at DESC);

CREATE INDEX IF NOT EXISTS system_metrics_recorded_at_idx 
  ON system_metrics(recorded_at DESC);

-- Create active_sessions_log table
CREATE TABLE IF NOT EXISTS active_sessions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_end TIMESTAMPTZ,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  region TEXT,
  device_type TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS active_sessions_user_idx 
  ON active_sessions_log(user_id, session_start DESC);

CREATE INDEX IF NOT EXISTS active_sessions_activity_idx 
  ON active_sessions_log(last_activity DESC) 
  WHERE session_end IS NULL;

CREATE INDEX IF NOT EXISTS active_sessions_range_idx 
  ON active_sessions_log(session_start, session_end);

-- Create api_performance_log table
CREATE TABLE IF NOT EXISTS api_performance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT,
  request_size_bytes INTEGER DEFAULT 0,
  response_size_bytes INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_performance_endpoint_time_idx 
  ON api_performance_log(endpoint, recorded_at DESC);

CREATE INDEX IF NOT EXISTS api_performance_time_idx 
  ON api_performance_log(recorded_at DESC);

CREATE INDEX IF NOT EXISTS api_performance_status_idx 
  ON api_performance_log(status_code, recorded_at DESC);

CREATE INDEX IF NOT EXISTS api_performance_slow_queries_idx 
  ON api_performance_log(response_time_ms DESC, recorded_at DESC) 
  WHERE response_time_ms > 1000;

-- Create error_log table
CREATE TABLE IF NOT EXISTS error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL CHECK (error_type IN ('frontend', 'backend', 'database', 'external_api')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'error', 'warning', 'info')),
  error_code TEXT,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS error_log_severity_time_idx 
  ON error_log(severity, recorded_at DESC);

CREATE INDEX IF NOT EXISTS error_log_type_time_idx 
  ON error_log(error_type, recorded_at DESC);

CREATE INDEX IF NOT EXISTS error_log_unresolved_idx 
  ON error_log(recorded_at DESC) 
  WHERE resolved = false;

CREATE INDEX IF NOT EXISTS error_log_user_idx 
  ON error_log(user_id, recorded_at DESC);

-- Create alert_history table
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  alert_message TEXT NOT NULL,
  metric_value NUMERIC,
  threshold_value NUMERIC,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alert_history_type_time_idx 
  ON alert_history(alert_type, triggered_at DESC);

CREATE INDEX IF NOT EXISTS alert_history_unresolved_idx 
  ON alert_history(triggered_at DESC) 
  WHERE resolved = false;

CREATE INDEX IF NOT EXISTS alert_history_severity_idx 
  ON alert_history(severity, triggered_at DESC);

-- Create database_metrics table
CREATE TABLE IF NOT EXISTS database_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_connections INTEGER NOT NULL DEFAULT 0,
  max_connections INTEGER NOT NULL DEFAULT 0,
  database_size_mb NUMERIC NOT NULL DEFAULT 0,
  cache_hit_ratio NUMERIC,
  transactions_per_second NUMERIC,
  slow_query_count INTEGER DEFAULT 0,
  cpu_usage_percent NUMERIC,
  memory_usage_percent NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS database_metrics_time_idx 
  ON database_metrics(recorded_at DESC);

-- Enable RLS on all monitoring tables
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_performance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only supa_admin can access monitoring data
CREATE POLICY "Only supa_admin can view system metrics"
  ON system_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

CREATE POLICY "Only supa_admin can insert system metrics"
  ON system_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

CREATE POLICY "Only supa_admin can view active sessions"
  ON active_sessions_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

CREATE POLICY "Only supa_admin can insert session logs"
  ON active_sessions_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

CREATE POLICY "Only supa_admin can update session logs"
  ON active_sessions_log FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

CREATE POLICY "Only supa_admin can view API performance"
  ON api_performance_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

CREATE POLICY "Only supa_admin can insert API performance"
  ON api_performance_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

CREATE POLICY "Only supa_admin can view error logs"
  ON error_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

CREATE POLICY "Only supa_admin can insert error logs"
  ON error_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

CREATE POLICY "Only supa_admin can update error logs"
  ON error_log FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

CREATE POLICY "Only supa_admin can view alert history"
  ON alert_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

CREATE POLICY "Only supa_admin can insert alerts"
  ON alert_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

CREATE POLICY "Only supa_admin can update alerts"
  ON alert_history FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

CREATE POLICY "Only supa_admin can view database metrics"
  ON database_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

CREATE POLICY "Only supa_admin can insert database metrics"
  ON database_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- Create helper functions for monitoring

-- Function to get current concurrent users count
CREATE OR REPLACE FUNCTION get_concurrent_users_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT user_id)
    FROM active_sessions_log
    WHERE session_end IS NULL
    AND last_activity > now() - interval '15 minutes'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record system metric
CREATE OR REPLACE FUNCTION record_system_metric(
  p_metric_type TEXT,
  p_metric_value NUMERIC,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_metric_id UUID;
BEGIN
  INSERT INTO system_metrics (metric_type, metric_value, metadata)
  VALUES (p_metric_type, p_metric_value, p_metadata)
  RETURNING id INTO v_metric_id;
  
  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to trigger alert
CREATE OR REPLACE FUNCTION trigger_alert(
  p_alert_type TEXT,
  p_severity TEXT,
  p_alert_message TEXT,
  p_metric_value NUMERIC DEFAULT NULL,
  p_threshold_value NUMERIC DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO alert_history (
    alert_type,
    severity,
    alert_message,
    metric_value,
    threshold_value
  )
  VALUES (
    p_alert_type,
    p_severity,
    p_alert_message,
    p_metric_value,
    p_threshold_value
  )
  RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE system_metrics IS 'Stores real-time and historical system performance metrics for monitoring dashboard';
COMMENT ON TABLE active_sessions_log IS 'Tracks active user sessions for concurrent user monitoring and analytics';
COMMENT ON TABLE api_performance_log IS 'Detailed logging of API endpoint performance for optimization';
COMMENT ON TABLE error_log IS 'Centralized error tracking across all system components';
COMMENT ON TABLE alert_history IS 'Track system alerts and incidents with resolution status';
COMMENT ON TABLE database_metrics IS 'Database-specific performance metrics for health monitoring';
