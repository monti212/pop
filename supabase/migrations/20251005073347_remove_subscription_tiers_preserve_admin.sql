/*
  # Remove Subscription Tiers - Preserve Admin Access

  ## Summary
  This migration removes all subscription-related fields from the user_profiles table
  while preserving the admin access control system based on team_role.

  ## Changes

  1. **Remove Subscription Triggers and Functions**
     - Drop trigger `prevent_subscription_downgrade_trigger`
     - Drop function `prevent_subscription_downgrade()` if exists

  2. **Remove Subscription Fields**
     - Drop `subscription_tier` column (no longer needed - all features are free)
     - Drop `daily_message_count` column (no usage limits)
     - Drop `daily_image_count` column (no usage limits)
     - Drop `subscription_start` column (no subscriptions)
     - Drop `subscription_end` column (no subscriptions)
     - Drop `last_subscription_change_at` column (no subscription changes)

  3. **Preserve Admin Access Control**
     - Keep `team_role` column unchanged (optimus_prime, prime, autobot, free)
     - Keep all RLS policies that use team_role for admin access
     - Admin roles retain access to admin panel and system management features

  4. **Data Preservation**
     - No user data is lost
     - User accounts remain intact
     - Admin roles remain unchanged
     - All existing RLS policies based on team_role continue to work

  ## Access Levels After Migration
  - **optimus_prime**: Chief AI Officer - Full admin access
  - **prime**: CEO - Full admin access
  - **autobot**: Team Member - Admin access
  - **free** (or null): Regular user - Full feature access, no admin panel

  ## Notes
  - All users get unlimited access to all Uhuru features
  - No payment or subscription required
  - Admin access remains restricted to team_role members
*/

-- Drop subscription-related triggers first
DROP TRIGGER IF EXISTS prevent_subscription_downgrade_trigger ON user_profiles;

-- Drop subscription-related functions
DROP FUNCTION IF EXISTS prevent_subscription_downgrade();

-- Remove subscription-related columns (all features are now free)
ALTER TABLE user_profiles DROP COLUMN IF EXISTS subscription_tier CASCADE;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS daily_message_count CASCADE;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS daily_image_count CASCADE;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS subscription_start CASCADE;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS subscription_end CASCADE;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS last_subscription_change_at CASCADE;

-- team_role column is preserved for admin access control
-- No changes needed to team_role or RLS policies