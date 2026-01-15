/*
  # Optimize Monitoring System RLS Policies

  1. Performance Improvements
    - Optimize system_metrics, active_sessions_log
    - Optimize api_performance_log, error_log
    - Optimize alert_history, database_metrics

  2. Security
    - Maintain supa_admin only access for sensitive monitoring data
*/

-- system_metrics policies
DROP POLICY IF EXISTS "Only supa_admin can view system metrics" ON system_metrics;
CREATE POLICY "Only supa_admin can view system metrics" ON system_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Only supa_admin can insert system metrics" ON system_metrics;
CREATE POLICY "Only supa_admin can insert system metrics" ON system_metrics
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- active_sessions_log policies
DROP POLICY IF EXISTS "Only supa_admin can view active sessions" ON active_sessions_log;
CREATE POLICY "Only supa_admin can view active sessions" ON active_sessions_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Only supa_admin can insert session logs" ON active_sessions_log;
CREATE POLICY "Only supa_admin can insert session logs" ON active_sessions_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Only supa_admin can update session logs" ON active_sessions_log;
CREATE POLICY "Only supa_admin can update session logs" ON active_sessions_log
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- api_performance_log policies
DROP POLICY IF EXISTS "Only supa_admin can view API performance" ON api_performance_log;
CREATE POLICY "Only supa_admin can view API performance" ON api_performance_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Only supa_admin can insert API performance" ON api_performance_log;
CREATE POLICY "Only supa_admin can insert API performance" ON api_performance_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- error_log policies
DROP POLICY IF EXISTS "Only supa_admin can view error logs" ON error_log;
CREATE POLICY "Only supa_admin can view error logs" ON error_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Only supa_admin can insert error logs" ON error_log;
CREATE POLICY "Only supa_admin can insert error logs" ON error_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Only supa_admin can update error logs" ON error_log;
CREATE POLICY "Only supa_admin can update error logs" ON error_log
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- alert_history policies
DROP POLICY IF EXISTS "Only supa_admin can view alert history" ON alert_history;
CREATE POLICY "Only supa_admin can view alert history" ON alert_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Only supa_admin can insert alerts" ON alert_history;
CREATE POLICY "Only supa_admin can insert alerts" ON alert_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Only supa_admin can update alerts" ON alert_history;
CREATE POLICY "Only supa_admin can update alerts" ON alert_history
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- database_metrics policies
DROP POLICY IF EXISTS "Only supa_admin can view database metrics" ON database_metrics;
CREATE POLICY "Only supa_admin can view database metrics" ON database_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Only supa_admin can insert database metrics" ON database_metrics;
CREATE POLICY "Only supa_admin can insert database metrics" ON database_metrics
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (select auth.uid())
      AND user_profiles.team_role = 'supa_admin'
    )
  );