/*
  # Rate Limiting System

  1. New Tables
    - `rate_limits`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `endpoint` (text) - endpoint identifier (e.g., 'chat', 'image_generation', 'auth')
      - `request_count` (integer) - number of requests in current window
      - `window_start` (timestamptz) - start of current rate limit window
      - `window_duration` (interval) - duration of rate limit window (e.g., '1 hour')
      - `max_requests` (integer) - maximum requests allowed in window
      - `last_request_at` (timestamptz) - timestamp of last request
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `rate_limits` table
    - Add policies for authenticated users to view their own rate limit status
    - Admin users can view all rate limits

  3. Indexes
    - Index on user_id and endpoint for fast lookups
    - Index on window_start for cleanup queries

  4. Functions
    - Function to check and update rate limits
    - Function to reset expired windows
*/

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_duration interval NOT NULL DEFAULT '1 hour',
  max_requests integer NOT NULL DEFAULT 100,
  last_request_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own rate limits
CREATE POLICY "Users can view own rate limits"
  ON rate_limits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can view all rate limits
CREATE POLICY "Admins can view all rate limits"
  ON rate_limits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint
  ON rate_limits(user_id, endpoint);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON rate_limits(window_start);

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_max_requests integer DEFAULT 100,
  p_window_duration interval DEFAULT '1 hour'::interval
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record record;
  v_current_time timestamptz := now();
  v_window_expired boolean;
  v_result jsonb;
BEGIN
  -- Get or create rate limit record
  SELECT * INTO v_record
  FROM rate_limits
  WHERE user_id = p_user_id AND endpoint = p_endpoint
  FOR UPDATE;

  -- Check if we need to create a new record
  IF v_record IS NULL THEN
    INSERT INTO rate_limits (
      user_id,
      endpoint,
      request_count,
      window_start,
      window_duration,
      max_requests,
      last_request_at
    ) VALUES (
      p_user_id,
      p_endpoint,
      1,
      v_current_time,
      p_window_duration,
      p_max_requests,
      v_current_time
    )
    RETURNING * INTO v_record;

    -- First request, always allowed
    RETURN jsonb_build_object(
      'allowed', true,
      'limit', p_max_requests,
      'remaining', p_max_requests - 1,
      'reset_at', v_record.window_start + p_window_duration
    );
  END IF;

  -- Check if window has expired
  v_window_expired := (v_current_time >= v_record.window_start + v_record.window_duration);

  -- If window expired, reset counters
  IF v_window_expired THEN
    UPDATE rate_limits
    SET
      request_count = 1,
      window_start = v_current_time,
      last_request_at = v_current_time,
      updated_at = v_current_time
    WHERE user_id = p_user_id AND endpoint = p_endpoint
    RETURNING * INTO v_record;

    RETURN jsonb_build_object(
      'allowed', true,
      'limit', v_record.max_requests,
      'remaining', v_record.max_requests - 1,
      'reset_at', v_record.window_start + v_record.window_duration
    );
  END IF;

  -- Check if limit exceeded
  IF v_record.request_count >= v_record.max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'limit', v_record.max_requests,
      'remaining', 0,
      'reset_at', v_record.window_start + v_record.window_duration,
      'retry_after', EXTRACT(EPOCH FROM (v_record.window_start + v_record.window_duration - v_current_time))
    );
  END IF;

  -- Increment counter
  UPDATE rate_limits
  SET
    request_count = request_count + 1,
    last_request_at = v_current_time,
    updated_at = v_current_time
  WHERE user_id = p_user_id AND endpoint = p_endpoint
  RETURNING * INTO v_record;

  RETURN jsonb_build_object(
    'allowed', true,
    'limit', v_record.max_requests,
    'remaining', v_record.max_requests - v_record.request_count,
    'reset_at', v_record.window_start + v_record.window_duration
  );
END;
$$;

-- Function to cleanup old rate limit records
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Delete rate limit records older than 7 days
  DELETE FROM rate_limits
  WHERE window_start < now() - interval '7 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

-- Create a scheduled job to cleanup old records (runs daily)
-- Note: This requires pg_cron extension which may not be available on all Supabase plans
-- If pg_cron is not available, you can manually run cleanup_expired_rate_limits() periodically
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-rate-limits',
      '0 2 * * *', -- Run at 2 AM daily
      $$SELECT cleanup_expired_rate_limits();$$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- pg_cron not available, skip scheduling
    NULL;
END $$;
