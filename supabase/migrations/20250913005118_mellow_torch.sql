/*
  # Phone Verification System

  1. New Tables
    - `phone_verifications`
      - `id` (uuid, primary key)
      - `phone_number` (text, unique, not null)
      - `twilio_sid` (text, not null)
      - `status` (text, not null, default 'pending')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `phone_verifications` table
    - Add policy for public insert (for starting verification)
    - Add policy for service role to manage verification records

  3. Purpose
    - Track phone number verification attempts using Twilio Verify
    - Prevent abuse and provide audit trail
    - Support seamless WhatsApp to web platform transition
*/

CREATE TABLE IF NOT EXISTS phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  twilio_sid text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'failed', 'canceled'))
);

ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Allow public to start phone verification (insert only)
CREATE POLICY "Anyone can start phone verification"
  ON phone_verifications
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow service role to manage all verification records
CREATE POLICY "Service role can manage verifications"
  ON phone_verifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add index for performance
CREATE INDEX IF NOT EXISTS phone_verifications_phone_number_idx ON phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS phone_verifications_status_idx ON phone_verifications(status);
CREATE INDEX IF NOT EXISTS phone_verifications_created_at_idx ON phone_verifications(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_phone_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_phone_verifications_updated_at_trigger
  BEFORE UPDATE ON phone_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_verifications_updated_at();