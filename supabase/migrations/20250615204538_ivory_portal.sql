/*
  # Create privacy_preferences table with share_data default true

  1. New Tables
    - `privacy_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users(id))
      - `share_data` (boolean, default true) - Changed default to true
      - `save_history` (boolean, default true)
      - `data_collection` (boolean, default true)
      - `personalized_responses` (boolean, default true)
      - `third_party_sharing` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on privacy_preferences table
    - Add policies for users to manage their own preferences
    - Add policy for admins to view all preferences
*/

-- Check if table exists first
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'privacy_preferences') THEN
    -- Create privacy_preferences table
    CREATE TABLE privacy_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      share_data BOOLEAN NOT NULL DEFAULT true,
      save_history BOOLEAN NOT NULL DEFAULT true,
      data_collection BOOLEAN NOT NULL DEFAULT true,
      personalized_responses BOOLEAN NOT NULL DEFAULT true,
      third_party_sharing BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Add unique constraint on user_id
    ALTER TABLE privacy_preferences ADD CONSTRAINT privacy_preferences_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE privacy_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own privacy preferences" ON privacy_preferences;
DROP POLICY IF EXISTS "Users can update their own privacy preferences" ON privacy_preferences;
DROP POLICY IF EXISTS "Users can insert their own privacy preferences" ON privacy_preferences;
DROP POLICY IF EXISTS "Admins can view all privacy preferences" ON privacy_preferences;

-- RLS policies
CREATE POLICY "Users can view their own privacy preferences"
  ON privacy_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy preferences"
  ON privacy_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy preferences"
  ON privacy_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin policy
CREATE POLICY "Admins can view all privacy preferences"
  ON privacy_preferences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users auth_users
      WHERE auth_users.id = auth.uid()
      AND auth_users.email LIKE '%@orionx.xyz'
    )
  );

-- Add comments
COMMENT ON TABLE privacy_preferences IS 'Stores user privacy preferences for data handling and personalization';
COMMENT ON COLUMN privacy_preferences.share_data IS 'Whether user allows their data to be used for AI training';
COMMENT ON COLUMN privacy_preferences.save_history IS 'Whether user allows their chat history to be saved';
COMMENT ON COLUMN privacy_preferences.data_collection IS 'Whether user allows collection of usage data';
COMMENT ON COLUMN privacy_preferences.personalized_responses IS 'Whether user allows personalized responses based on history';
COMMENT ON COLUMN privacy_preferences.third_party_sharing IS 'Whether user allows sharing data with trusted third parties';