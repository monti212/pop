/*
  # WhatsApp Integration Tables

  1. New Tables
    - `whatsapp_users`
      - `id` (uuid, primary key)
      - `phone_number` (text, unique, E.164 format)
      - `user_id` (uuid, foreign key to auth.users)
      - `first_message_date` (timestamptz)
      - `last_message_date` (timestamptz)
      - `account_status` (text, default 'active')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `whatsapp_sessions`
      - `id` (uuid, primary key)
      - `phone_number` (text)
      - `whatsapp_user_id` (uuid, foreign key)
      - `session_start` (timestamptz)
      - `session_expiry` (timestamptz)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `whatsapp_messages`
      - `id` (uuid, primary key)
      - `whatsapp_user_id` (uuid, foreign key)
      - `message_sid` (text, unique, Twilio message ID)
      - `sender_phone` (text)
      - `recipient_phone` (text)
      - `message_body` (text)
      - `media_urls` (jsonb, array of media URLs)
      - `media_types` (jsonb, array of media content types)
      - `direction` (text, 'inbound' or 'outbound')
      - `delivery_status` (text)
      - `session_id` (uuid, foreign key)
      - `created_at` (timestamptz)
    
    - `whatsapp_usage`
      - `id` (uuid, primary key)
      - `whatsapp_user_id` (uuid, foreign key)
      - `phone_number` (text)
      - `date` (date)
      - `message_count` (integer, default 0)
      - `daily_limit` (integer, default 25)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `whatsapp_user_context`
      - `id` (uuid, primary key)
      - `whatsapp_user_id` (uuid, foreign key)
      - `conversation_history` (jsonb)
      - `preferences` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for service role access only (these are internal tables managed by edge functions)
    - Add policies for admin users (optimus_prime, prime, autobot) to read data

  3. Indexes
    - Add indexes on phone_number fields for fast lookups
    - Add indexes on session_expiry for active session queries
    - Add indexes on date field for usage queries
*/

-- Create whatsapp_users table
CREATE TABLE IF NOT EXISTS whatsapp_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  first_message_date timestamptz DEFAULT now(),
  last_message_date timestamptz DEFAULT now(),
  account_status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create whatsapp_sessions table
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  whatsapp_user_id uuid REFERENCES whatsapp_users(id) ON DELETE CASCADE,
  session_start timestamptz DEFAULT now(),
  session_expiry timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create whatsapp_messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_user_id uuid REFERENCES whatsapp_users(id) ON DELETE CASCADE,
  message_sid text UNIQUE,
  sender_phone text NOT NULL,
  recipient_phone text NOT NULL,
  message_body text,
  media_urls jsonb DEFAULT '[]'::jsonb,
  media_types jsonb DEFAULT '[]'::jsonb,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  delivery_status text DEFAULT 'pending',
  session_id uuid REFERENCES whatsapp_sessions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create whatsapp_usage table
CREATE TABLE IF NOT EXISTS whatsapp_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_user_id uuid REFERENCES whatsapp_users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  message_count integer DEFAULT 0,
  daily_limit integer DEFAULT 25,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(whatsapp_user_id, date)
);

-- Create whatsapp_user_context table
CREATE TABLE IF NOT EXISTS whatsapp_user_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_user_id uuid REFERENCES whatsapp_users(id) ON DELETE CASCADE UNIQUE,
  conversation_history jsonb DEFAULT '[]'::jsonb,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_phone ON whatsapp_users(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_user_id ON whatsapp_users(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_expiry ON whatsapp_sessions(session_expiry) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user ON whatsapp_messages(whatsapp_user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_usage_date ON whatsapp_usage(date, whatsapp_user_id);

-- Enable Row Level Security
ALTER TABLE whatsapp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_user_context ENABLE ROW LEVEL SECURITY;

-- Policies for whatsapp_users
CREATE POLICY "Service role can manage whatsapp_users"
  ON whatsapp_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view whatsapp_users"
  ON whatsapp_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'autobot')
    )
  );

-- Policies for whatsapp_sessions
CREATE POLICY "Service role can manage whatsapp_sessions"
  ON whatsapp_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view whatsapp_sessions"
  ON whatsapp_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'autobot')
    )
  );

-- Policies for whatsapp_messages
CREATE POLICY "Service role can manage whatsapp_messages"
  ON whatsapp_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view whatsapp_messages"
  ON whatsapp_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'autobot')
    )
  );

-- Policies for whatsapp_usage
CREATE POLICY "Service role can manage whatsapp_usage"
  ON whatsapp_usage FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view whatsapp_usage"
  ON whatsapp_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'autobot')
    )
  );

-- Policies for whatsapp_user_context
CREATE POLICY "Service role can manage whatsapp_user_context"
  ON whatsapp_user_context FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view whatsapp_user_context"
  ON whatsapp_user_context FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'autobot')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_whatsapp_users_updated_at
  BEFORE UPDATE ON whatsapp_users
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_updated_at();

CREATE TRIGGER update_whatsapp_sessions_updated_at
  BEFORE UPDATE ON whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_updated_at();

CREATE TRIGGER update_whatsapp_usage_updated_at
  BEFORE UPDATE ON whatsapp_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_updated_at();

CREATE TRIGGER update_whatsapp_user_context_updated_at
  BEFORE UPDATE ON whatsapp_user_context
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_updated_at();