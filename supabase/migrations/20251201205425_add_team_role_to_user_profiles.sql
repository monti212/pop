/*
  # Add team_role column to user_profiles

  ## Summary
  Adds the team_role column to user_profiles table for role-based access control.
  This is required for the classes system RLS policies.

  ## Changes
  1. Add team_role column with default value 'autobot'
  2. Create index for efficient role-based queries
  3. Add check constraint to ensure valid role values

  ## Valid Roles
  - optimus_prime: Super admin
  - prime: Admin
  - autobot: Standard user
  - free: Free tier user
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'team_role'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN team_role text DEFAULT 'autobot' 
    CHECK (team_role IN ('optimus_prime', 'prime', 'autobot', 'free'));
    
    CREATE INDEX IF NOT EXISTS user_profiles_team_role_idx ON user_profiles(team_role);
  END IF;
END $$;