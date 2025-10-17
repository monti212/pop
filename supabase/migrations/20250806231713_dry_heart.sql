/*
  # Enforce Free/Pro Tiers Only

  1. Schema Changes
    - Update `user_profiles` table default subscription_tier from 'freemium' to 'free'
    - Convert all existing 'freemium' users to 'free' tier

  2. Data Migration
    - Update all users with 'freemium' subscription_tier to 'free'
    - Ensure no undefined or null subscription tiers exist

  3. Rationale
    - Simplify subscription model to only 'free' and 'pro' tiers
    - Remove legacy 'freemium' tier to prevent confusion
    - Ensure consistent user categorization across the platform
*/

-- Update default value for subscription_tier column to 'free'
ALTER TABLE user_profiles 
ALTER COLUMN subscription_tier SET DEFAULT 'free';

-- Update all existing users with 'freemium' tier to 'free'
UPDATE user_profiles 
SET subscription_tier = 'free'
WHERE subscription_tier = 'freemium' OR subscription_tier IS NULL;

-- Update users with undefined or empty subscription_tier to 'free'
UPDATE user_profiles 
SET subscription_tier = 'free'
WHERE subscription_tier = '' OR subscription_tier IS NULL;

-- Ensure all users have a valid subscription_tier (either 'free' or 'pro')
UPDATE user_profiles 
SET subscription_tier = 'free'
WHERE subscription_tier NOT IN ('free', 'pro');

-- Add a check constraint to ensure only 'free' or 'pro' values are allowed
ALTER TABLE user_profiles 
ADD CONSTRAINT valid_subscription_tier 
CHECK (subscription_tier IN ('free', 'pro'));

-- Update last_subscription_change_at for affected users to track the tier normalization
UPDATE user_profiles 
SET last_subscription_change_at = NOW()
WHERE subscription_tier = 'free' 
AND (last_subscription_change_at IS NULL OR last_subscription_change_at < '2025-01-01');