/*
  # Create payments table for Stripe integration

  1. New Tables
    - `payments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users(id))
      - `amount` (numeric, not null)
      - `currency` (text, not null)
      - `status` (text, not null)
      - `provider` (text, not null)
      - `provider_payment_id` (text)
      - `created_at` (timestamptz, default now())
  
  2. Add columns to user_profiles
    - `subscription_start` (timestamptz)
    - `subscription_end` (timestamptz)
  
  3. Security
    - Enable RLS on payments table
    - Add policies for users to see their own payments and admin to manage payments
*/

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add subscription dates to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ;

-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments
CREATE POLICY "Users can view their own payments"
  ON payments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all payments"
  ON payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@orionx.xyz'
    )
  );

-- Function to check subscription expiry and downgrade users
CREATE OR REPLACE FUNCTION check_subscription_expiry()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET subscription_tier = 'freemium'
  WHERE subscription_tier = 'pro'
    AND subscription_end IS NOT NULL
    AND subscription_end < now();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE payments IS 'Stores payment records for subscription upgrades';
COMMENT ON COLUMN payments.user_id IS 'References the user who made the payment';
COMMENT ON COLUMN payments.provider IS 'Payment processor (e.g., Stripe)';
COMMENT ON COLUMN payments.provider_payment_id IS 'ID from the payment provider';
COMMENT ON COLUMN user_profiles.subscription_start IS 'When the current subscription started';
COMMENT ON COLUMN user_profiles.subscription_end IS 'When the current subscription will end';