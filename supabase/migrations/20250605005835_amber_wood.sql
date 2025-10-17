/*
  # Add subscription fields to user_profiles table
  
  1. Table Updates
    - Add to `user_profiles`:
      - `subscription_start` (timestamp) - When the current subscription started
      - `subscription_end` (timestamp) - When the current subscription will end
  
  This migration adds fields to track subscription periods for users.
*/

-- Add subscription fields to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ;

COMMENT ON COLUMN user_profiles.subscription_start IS 'When the current subscription started';
COMMENT ON COLUMN user_profiles.subscription_end IS 'When the current subscription will end';