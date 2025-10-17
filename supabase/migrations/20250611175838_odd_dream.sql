/*
  # Create API Usage Table for Tracking

  1. New Tables
    - `api_usage`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users(id))
      - `endpoint` (text) - The API endpoint called
      - `tokens_input` (integer) - Number of input tokens
      - `tokens_output` (integer) - Number of output tokens
      - `model` (text) - Model used for the request
      - `timestamp` (timestamptz) - When the request was made
  
  2. Security
    - Enable RLS on api_usage table
    - Add policies for users to see their own usage
    - Add policies for admins to manage all usage records

  3. Indexes
    - Add index on user_id for faster lookup
    - Add index on timestamp for reporting
*/

-- Create API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS api_usage_user_id_idx ON api_usage (user_id);
CREATE INDEX IF NOT EXISTS api_usage_timestamp_idx ON api_usage (timestamp);
CREATE INDEX IF NOT EXISTS api_usage_model_idx ON api_usage (model);

-- Enable RLS
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own API usage"
  ON api_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin policy
CREATE POLICY "Admins can manage all API usage records"
  ON api_usage
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@orionx.xyz'
    )
  );

COMMENT ON TABLE api_usage IS 'Tracks API usage for billing and rate limiting';
COMMENT ON COLUMN api_usage.tokens_input IS 'Number of input tokens in the request';
COMMENT ON COLUMN api_usage.tokens_output IS 'Number of output tokens generated';
COMMENT ON COLUMN api_usage.model IS 'The model used for this request';