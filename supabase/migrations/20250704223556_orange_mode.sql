/*
  # Create saved_websites table
  
  1. New Tables
    - `saved_websites` - Stores user-created websites
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users(id))
      - `title` (text)
      - `html_content` (text)
      - `description` (text)
      - `deployed_url` (text)
      - `netlify_site_id` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on saved_websites table
    - Add policies for users to manage their own saved websites
    - Add policy for admins to view all saved websites
*/

CREATE TABLE IF NOT EXISTS saved_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  html_content TEXT NOT NULL,
  description TEXT,
  deployed_url TEXT,
  netlify_site_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_websites_user_id_idx ON saved_websites (user_id);

ALTER TABLE saved_websites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own websites"
  ON saved_websites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own websites"
  ON saved_websites
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own websites"
  ON saved_websites
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own websites"
  ON saved_websites
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all saved websites"
  ON saved_websites
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

COMMENT ON TABLE saved_websites IS 'Stores user-created websites from the Website Builder';
COMMENT ON COLUMN saved_websites.user_id IS 'The user who created the website';
COMMENT ON COLUMN saved_websites.title IS 'Title or name of the website';
COMMENT ON COLUMN saved_websites.html_content IS 'Complete HTML content of the website';
COMMENT ON COLUMN saved_websites.description IS 'Original prompt or description of the website';
COMMENT ON COLUMN saved_websites.deployed_url IS 'URL where the website is deployed (if applicable)';
COMMENT ON COLUMN saved_websites.netlify_site_id IS 'Netlify site ID for the deployed website';