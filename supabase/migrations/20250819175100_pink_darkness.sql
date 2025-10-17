/*
  # Add personal context to user profiles

  1. New Columns
    - Add `personal_context` column to `user_profiles` table
      - `personal_context` (text, nullable) - General information that AI should consider for all responses
  
  2. Security
    - No changes to RLS policies needed as this uses existing user_profiles table
    - Users can only access their own personal context through existing policies
*/

-- Add personal_context column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS personal_context text;

-- Add comment to describe the column
COMMENT ON COLUMN user_profiles.personal_context IS 'General user information that AI should consider when generating responses';