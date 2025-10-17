/*
  # Create API Keys Table

  1. New Tables
    - `api_keys`
      - `key_id` (uuid, primary key)
      - `user_id` (uuid, references auth.users(id))
      - `service` (text) - Service the key is for (e.g., 'uhuru', 'custom')
      - `key_value` (text) - The actual API key
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz) - When the key expires
      - `last_used_at` (timestamptz) - When the key was last used
      - `revoked` (boolean) - Whether the key has been revoked
  
  2. Security
    - Enable RLS on api_keys table
    - Add policies for users to see only their own API keys
    - Add policies for admins to manage all API keys

  3. Indexes
    - Add index on user_id for faster lookup
    - Add index on service for filtering by service type
*/

-- Create API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL, -- 'uhuru', 'custom', etc.
  key_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT false
);

-- Add indexes
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS api_keys_service_idx ON api_keys (service);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own API keys"
  ON api_keys
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys"
  ON api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
  ON api_keys
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
  ON api_keys
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin policy
CREATE POLICY "Admins can manage all API keys"
  ON api_keys
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

COMMENT ON TABLE api_keys IS 'Stores API keys for users to access OrionX services';
COMMENT ON COLUMN api_keys.user_id IS 'The user that owns this API key';
COMMENT ON COLUMN api_keys.service IS 'The service this key is for (uhuru, custom, etc.)';
COMMENT ON COLUMN api_keys.key_value IS 'The actual API key value';
COMMENT ON COLUMN api_keys.expires_at IS 'When this key expires';
COMMENT ON COLUMN api_keys.last_used_at IS 'When this key was last used';
COMMENT ON COLUMN api_keys.revoked IS 'Whether this key has been revoked';