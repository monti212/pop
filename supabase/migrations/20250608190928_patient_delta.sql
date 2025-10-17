/*
  # Add Stripe customer ID field to user profiles
  
  1. Table Updates
    - Add to `user_profiles`:
      - `stripe_customer_id` (text) - Stores the Stripe customer ID for the user
  
  This migration adds a field to track the user's Stripe customer ID for subscription management.
*/

-- Add Stripe customer ID to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add comment for clarity
COMMENT ON COLUMN user_profiles.stripe_customer_id IS 'Stripe customer ID for subscription management';