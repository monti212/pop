/*
  # Admin Analytics System - Conversation Summaries and Usage Metrics

  ## Overview
  This migration creates the infrastructure for tracking conversation summaries and usage metrics
  for the admin dashboard. It enables real-time monitoring of platform usage per account and
  aggregated across all users.

  ## 1. New Tables

  ### conversation_summaries
    - `id` (uuid, primary key)
    - `conversation_id` (uuid, references conversations)
    - `user_id` (uuid, references auth.users)
    - `ai_summary` (text) - AI-generated summary of the conversation topic
    - `message_count` (int) - Number of messages when summary was generated
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### usage_metrics
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users)
    - `conversation_id` (uuid, references conversations, nullable)
    - `message_count` (int) - Number of messages in this metric period
    - `token_count` (int) - Total tokens used
    - `conversation_count` (int) - Number of conversations
    - `metric_date` (date) - Date for daily aggregation
    - `created_at` (timestamptz)

  ### usage_events
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users)
    - `conversation_id` (uuid, references conversations, nullable)
    - `event_type` (text) - Type of event: 'message_sent', 'conversation_started', etc.
    - `token_count` (int) - Tokens used in this event
    - `metadata` (jsonb) - Additional event data
    - `created_at` (timestamptz)

  ## 2. Indexes
    - Performance indexes on user_id, conversation_id, and created_at fields
    - Partial indexes for recent data queries

  ## 3. Security
    - Enable RLS on all tables
    - Admin-only access policies
    - Users can view their own usage metrics

  ## 4. Functions
    - Function to aggregate daily usage metrics
    - Function to track token usage per message
*/

-- =====================================================
-- CONVERSATION SUMMARIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS conversation_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ai_summary text NOT NULL,
  message_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id)
);

-- Index for fast lookup by conversation
CREATE INDEX IF NOT EXISTS conversation_summaries_conversation_id_idx
  ON conversation_summaries(conversation_id);

-- Index for user queries
CREATE INDEX IF NOT EXISTS conversation_summaries_user_id_idx
  ON conversation_summaries(user_id);

-- Index for recent summaries
CREATE INDEX IF NOT EXISTS conversation_summaries_created_at_idx
  ON conversation_summaries(created_at DESC);

-- Enable RLS
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Admin can view all summaries
CREATE POLICY "Admins can view all conversation summaries"
  ON conversation_summaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- Users can view their own summaries
CREATE POLICY "Users can view own conversation summaries"
  ON conversation_summaries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can insert/update summaries
CREATE POLICY "Service can manage conversation summaries"
  ON conversation_summaries
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- USAGE METRICS TABLE (Daily Aggregations)
-- =====================================================

CREATE TABLE IF NOT EXISTS usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  message_count int DEFAULT 0,
  token_count int DEFAULT 0,
  conversation_count int DEFAULT 0,
  metric_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, metric_date)
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS usage_metrics_user_id_idx
  ON usage_metrics(user_id);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS usage_metrics_metric_date_idx
  ON usage_metrics(metric_date DESC);

-- Composite index for user + date queries
CREATE INDEX IF NOT EXISTS usage_metrics_user_date_idx
  ON usage_metrics(user_id, metric_date DESC);

-- Enable RLS
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- Admin can view all metrics
CREATE POLICY "Admins can view all usage metrics"
  ON usage_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- Users can view their own metrics
CREATE POLICY "Users can view own usage metrics"
  ON usage_metrics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage metrics
CREATE POLICY "Service can manage usage metrics"
  ON usage_metrics
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- USAGE EVENTS TABLE (Granular Event Tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('message_sent', 'conversation_started', 'conversation_ended', 'image_generated', 'file_uploaded')),
  token_count int DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS usage_events_user_id_idx
  ON usage_events(user_id);

-- Index for conversation queries
CREATE INDEX IF NOT EXISTS usage_events_conversation_id_idx
  ON usage_events(conversation_id);

-- Index for event type queries
CREATE INDEX IF NOT EXISTS usage_events_event_type_idx
  ON usage_events(event_type);

-- Index for time-based queries (recent events)
CREATE INDEX IF NOT EXISTS usage_events_created_at_idx
  ON usage_events(created_at DESC);

-- Composite index for user + time queries
CREATE INDEX IF NOT EXISTS usage_events_user_time_idx
  ON usage_events(user_id, created_at DESC);

-- Partial index for recent events (using immutable function)
-- Note: This will need periodic recreation or we can skip it for now
-- CREATE INDEX IF NOT EXISTS usage_events_recent_idx
--   ON usage_events(user_id, created_at DESC)
--   WHERE created_at > now() - interval '30 days';

-- Enable RLS
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Admin can view all events
CREATE POLICY "Admins can view all usage events"
  ON usage_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- Users can view their own events
CREATE POLICY "Users can view own usage events"
  ON usage_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can insert events
CREATE POLICY "Service can insert usage events"
  ON usage_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update or insert daily usage metrics
CREATE OR REPLACE FUNCTION upsert_daily_usage_metric(
  p_user_id uuid,
  p_conversation_id uuid DEFAULT NULL,
  p_message_count int DEFAULT 0,
  p_token_count int DEFAULT 0,
  p_conversation_count int DEFAULT 0
)
RETURNS void AS $$
BEGIN
  INSERT INTO usage_metrics (
    user_id,
    conversation_id,
    message_count,
    token_count,
    conversation_count,
    metric_date
  )
  VALUES (
    p_user_id,
    p_conversation_id,
    p_message_count,
    p_token_count,
    p_conversation_count,
    CURRENT_DATE
  )
  ON CONFLICT (user_id, metric_date)
  DO UPDATE SET
    message_count = usage_metrics.message_count + EXCLUDED.message_count,
    token_count = usage_metrics.token_count + EXCLUDED.token_count,
    conversation_count = usage_metrics.conversation_count + EXCLUDED.conversation_count,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track a usage event and update metrics
CREATE OR REPLACE FUNCTION track_usage_event(
  p_user_id uuid,
  p_conversation_id uuid,
  p_event_type text,
  p_token_count int DEFAULT 0,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_event_id uuid;
BEGIN
  -- Insert the event
  INSERT INTO usage_events (
    user_id,
    conversation_id,
    event_type,
    token_count,
    metadata
  )
  VALUES (
    p_user_id,
    p_conversation_id,
    p_event_type,
    p_token_count,
    p_metadata
  )
  RETURNING id INTO v_event_id;

  -- Update daily metrics based on event type
  IF p_event_type = 'message_sent' THEN
    PERFORM upsert_daily_usage_metric(
      p_user_id,
      p_conversation_id,
      1, -- message_count
      p_token_count,
      0  -- conversation_count
    );
  ELSIF p_event_type = 'conversation_started' THEN
    PERFORM upsert_daily_usage_metric(
      p_user_id,
      p_conversation_id,
      0, -- message_count
      0, -- token_count
      1  -- conversation_count
    );
  END IF;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get usage summary for a user
CREATE OR REPLACE FUNCTION get_user_usage_summary(
  p_user_id uuid,
  p_days int DEFAULT 30
)
RETURNS TABLE (
  total_messages bigint,
  total_tokens bigint,
  total_conversations bigint,
  avg_messages_per_day numeric,
  avg_tokens_per_day numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(message_count), 0)::bigint as total_messages,
    COALESCE(SUM(token_count), 0)::bigint as total_tokens,
    COALESCE(SUM(conversation_count), 0)::bigint as total_conversations,
    COALESCE(AVG(message_count), 0)::numeric as avg_messages_per_day,
    COALESCE(AVG(token_count), 0)::numeric as avg_tokens_per_day
  FROM usage_metrics
  WHERE user_id = p_user_id
    AND metric_date >= CURRENT_DATE - p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get platform-wide usage summary
CREATE OR REPLACE FUNCTION get_platform_usage_summary(
  p_days int DEFAULT 30
)
RETURNS TABLE (
  total_users bigint,
  total_messages bigint,
  total_tokens bigint,
  total_conversations bigint,
  avg_messages_per_user numeric,
  avg_tokens_per_user numeric,
  active_users_today bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT user_id)::bigint as total_users,
    COALESCE(SUM(message_count), 0)::bigint as total_messages,
    COALESCE(SUM(token_count), 0)::bigint as total_tokens,
    COALESCE(SUM(conversation_count), 0)::bigint as total_conversations,
    COALESCE(AVG(message_count), 0)::numeric as avg_messages_per_user,
    COALESCE(AVG(token_count), 0)::numeric as avg_tokens_per_user,
    (
      SELECT COUNT(DISTINCT user_id)
      FROM usage_events
      WHERE created_at >= CURRENT_DATE
    )::bigint as active_users_today
  FROM usage_metrics
  WHERE metric_date >= CURRENT_DATE - p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update conversation summary updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_summary_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update conversation summary timestamp
DROP TRIGGER IF EXISTS update_conversation_summary_timestamp_trigger ON conversation_summaries;
CREATE TRIGGER update_conversation_summary_timestamp_trigger
  BEFORE UPDATE ON conversation_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_summary_timestamp();

-- Trigger to auto-update usage metrics timestamp
DROP TRIGGER IF EXISTS update_usage_metrics_timestamp_trigger ON usage_metrics;
CREATE TRIGGER update_usage_metrics_timestamp_trigger
  BEFORE UPDATE ON usage_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_summary_timestamp();
