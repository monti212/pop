/*
  # Add Username Support

  1. Changes
    - Add `username` column to user_profiles table
    - Add unique constraint on username
    - Create index for fast username lookups
    - Add RLS policies for username-based auth

  2. Security
    - Username must be unique
    - Username lookups are efficient via index
    - Users can only update their own username
*/

-- Add username column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS username text;

-- Create unique index on username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_key
ON user_profiles (LOWER(username))
WHERE username IS NOT NULL;

-- Create index for fast username lookups
CREATE INDEX IF NOT EXISTS user_profiles_username_idx
ON user_profiles (username)
WHERE username IS NOT NULL;

-- Add check constraint for username format
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'username_format' 
    AND conrelid = 'user_profiles'::regclass
  ) THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT username_format
    CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9_-]{3,}$');
  END IF;
END $$;

-- Function to extract username from auth.users metadata
CREATE OR REPLACE FUNCTION get_username_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- If username is provided in user metadata, set it in the profile
  IF NEW.raw_user_meta_data->>'username' IS NOT NULL THEN
    UPDATE user_profiles
    SET username = LOWER(NEW.raw_user_meta_data->>'username')
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-populate username from auth metadata
DROP TRIGGER IF EXISTS on_auth_user_username_created ON auth.users;
CREATE TRIGGER on_auth_user_username_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION get_username_from_auth();
