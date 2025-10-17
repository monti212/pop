/*
  # Create privacy_preferences table
  
  1. New Tables
    - `privacy_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users(id))
      - `share_data` (boolean) - Whether to share data for AI improvement
      - `save_history` (boolean) - Whether to save chat history
      - `data_collection` (boolean) - Whether to allow usage data collection
      - `personalized_responses` (boolean) - Whether to allow personalized responses
      - `third_party_sharing` (boolean) - Whether to allow sharing with third parties
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on privacy_preferences table
    - Add policies for users to manage their own preferences
    - Add policies for admins to view all preferences
*/

-- Create privacy_preferences table
CREATE TABLE IF NOT EXISTS privacy_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_data BOOLEAN NOT NULL DEFAULT false,
  save_history BOOLEAN NOT NULL DEFAULT true,
  data_collection BOOLEAN NOT NULL DEFAULT true,
  personalized_responses BOOLEAN NOT NULL DEFAULT true,
  third_party_sharing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add unique constraint on user_id
ALTER TABLE privacy_preferences ADD CONSTRAINT privacy_preferences_user_id_key UNIQUE (user_id);

-- Enable RLS
ALTER TABLE privacy_preferences ENABLE ROW LEVEL SECURITY;

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