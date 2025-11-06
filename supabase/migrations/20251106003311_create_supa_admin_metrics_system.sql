/*
  # Supa Admin Metrics System

  1. New Tables
    - `user_activity_metrics`
      - Tracks individual user activity, touchpoints, and time spent
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `session_start` (timestamptz)
      - `session_end` (timestamptz)
      - `duration_seconds` (integer)
      - `touchpoints` (integer) - number of interactions
      - `pages_visited` (jsonb) - array of pages visited
      - `created_at` (timestamptz)
      
    - `token_usage_metrics`
      - Tracks token usage per user and conversation
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `conversation_id` (uuid, nullable)
      - `tokens_used` (integer)
      - `model_used` (text)
      - `request_type` (text) - chat, image, file processing, etc.
      - `created_at` (timestamptz)
      
    - `organization_metrics`
      - Tracks organization-wide metrics for Pencils of Promise
      - `id` (uuid, primary key)
      - `organization_name` (text)
      - `total_users` (integer)
      - `active_users_today` (integer)
      - `active_users_week` (integer)
      - `active_users_month` (integer)
      - `total_tokens_used` (bigint)
      - `total_conversations` (integer)
      - `total_files_processed` (integer)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Only monti@orionx.xyz can access these tables
*/

-- User Activity Metrics Table
CREATE TABLE IF NOT EXISTS user_activity_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_start timestamptz NOT NULL DEFAULT now(),
  session_end timestamptz,
  duration_seconds integer DEFAULT 0,
  touchpoints integer DEFAULT 0,
  pages_visited jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_activity_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only supa admin can view user activity metrics"
  ON user_activity_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'monti@orionx.xyz'
    )
  );

CREATE POLICY "Only supa admin can insert user activity metrics"
  ON user_activity_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'monti@orionx.xyz'
    )
  );

-- Token Usage Metrics Table
CREATE TABLE IF NOT EXISTS token_usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid,
  tokens_used integer NOT NULL DEFAULT 0,
  model_used text NOT NULL,
  request_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE token_usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only supa admin can view token metrics"
  ON token_usage_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'monti@orionx.xyz'
    )
  );

CREATE POLICY "Only supa admin can insert token metrics"
  ON token_usage_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'monti@orionx.xyz'
    )
  );

-- Organization Metrics Table
CREATE TABLE IF NOT EXISTS organization_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL UNIQUE,
  total_users integer DEFAULT 0,
  active_users_today integer DEFAULT 0,
  active_users_week integer DEFAULT 0,
  active_users_month integer DEFAULT 0,
  total_tokens_used bigint DEFAULT 0,
  total_conversations integer DEFAULT 0,
  total_files_processed integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE organization_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only supa admin can view organization metrics"
  ON organization_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'monti@orionx.xyz'
    )
  );

CREATE POLICY "Only supa admin can manage organization metrics"
  ON organization_metrics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'monti@orionx.xyz'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'monti@orionx.xyz'
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage_metrics(created_at DESC);

-- Insert initial Pencils of Promise organization record
INSERT INTO organization_metrics (organization_name)
VALUES ('Pencils of Promise')
ON CONFLICT (organization_name) DO NOTHING;