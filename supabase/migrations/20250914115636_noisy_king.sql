/*
  # Add Team Roles for OrionX Team Accounts

  1. New Types
    - `team_role_enum` with values: optimus_prime, prime, autobot, free

  2. Schema Changes
    - Add `team_role` column to `user_profiles` table
    - Set default value to 'free'
    - Add NOT NULL constraint

  3. Data Updates
    - Set monti@orionx.xyz to 'optimus_prime'
    - Set mthabisi@orionx.xyz to 'prime' 
    - Set other @orionx.xyz emails to 'autobot'
    - All other users remain 'free'

  4. Security
    - No RLS changes needed (inherits from existing user_profiles policies)
*/

-- Create team role enum
CREATE TYPE team_role_enum AS ENUM ('optimus_prime', 'prime', 'autobot', 'free');

-- Add team_role column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN team_role team_role_enum DEFAULT 'free' NOT NULL;

-- Update existing users based on email addresses
-- Get emails from auth.users and update user_profiles accordingly
UPDATE user_profiles 
SET team_role = CASE 
  WHEN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = user_profiles.id 
    AND auth.users.email = 'monti@orionx.xyz'
  ) THEN 'optimus_prime'::team_role_enum
  WHEN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = user_profiles.id 
    AND auth.users.email = 'mthabisi@orionx.xyz'
  ) THEN 'prime'::team_role_enum
  WHEN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = user_profiles.id 
    AND auth.users.email LIKE '%@orionx.xyz'
  ) THEN 'autobot'::team_role_enum
  ELSE 'free'::team_role_enum
END;