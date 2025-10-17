/*
  # Create privacy preferences table

  1. New Tables
    - `privacy_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users(id))
      - `share_data` (boolean) - Whether user allows data for AI training
      - `save_history` (boolean) - Whether user allows chat history to be saved
      - `data_collection` (boolean) - Whether user allows usage data collection
      - `personalized_responses` (boolean) - Whether user allows personalization
      - `third_party_sharing` (boolean) - Whether user allows third-party sharing
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on privacy_preferences table
    - Add policies for users to manage their own preferences
    - Add policy for admins to view all preferences
*/

-- Create privacy_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS privacy_preferences (
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

-- Add unique constraint on user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'privacy_preferences_user_id_key'
  ) THEN
    ALTER TABLE privacy_preferences ADD CONSTRAINT privacy_preferences_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE privacy_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own privacy preferences" ON privacy_preferences;
  DROP POLICY IF EXISTS "Users can update their own privacy preferences" ON privacy_preferences;
  DROP POLICY IF EXISTS "Users can insert their own privacy preferences" ON privacy_preferences;
  DROP POLICY IF EXISTS "Admins can view all privacy preferences" ON privacy_preferences;
EXCEPTION
  WHEN undefined_object THEN
    NULL; -- Ignore if policies don't exist
END $$;

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