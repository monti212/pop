/*
  # Fix Phone Verifications Schema - Add Missing Columns

  1. Changes to `phone_verifications` table
    - Add `expires_at` (timestamptz) - tracks when verification code expires
    - Add `attempted_at` (timestamptz) - tracks when verification was last attempted
    - Add `verification_code` (text, nullable) - stores the actual 6-digit code (hashed)
    - Add `verification_attempts` (integer, default 0) - tracks failed verification attempts

  2. Data Migration
    - Populate `attempted_at` with `created_at` for existing records
    - Set `expires_at` to 15 minutes after `created_at` for existing records

  3. Indexes
    - Add index on `expires_at` for efficient expiration queries
    - Add index on `attempted_at` for rate limiting queries

  4. Purpose
    - Fix the database schema to match what the Edge Functions expect
    - Enable local code verification to reduce dependency on Twilio API
    - Support better rate limiting and security features
*/

-- Add missing columns to phone_verifications table
DO $$
BEGIN
  -- Add expires_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'phone_verifications' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE phone_verifications ADD COLUMN expires_at timestamptz;
  END IF;

  -- Add attempted_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'phone_verifications' AND column_name = 'attempted_at'
  ) THEN
    ALTER TABLE phone_verifications ADD COLUMN attempted_at timestamptz;
  END IF;

  -- Add verification_code column if it doesn't exist (for future enhancement)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'phone_verifications' AND column_name = 'verification_code'
  ) THEN
    ALTER TABLE phone_verifications ADD COLUMN verification_code text;
  END IF;

  -- Add verification_attempts column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'phone_verifications' AND column_name = 'verification_attempts'
  ) THEN
    ALTER TABLE phone_verifications ADD COLUMN verification_attempts integer DEFAULT 0;
  END IF;
END $$;

-- Migrate existing data: set attempted_at to created_at for existing records
UPDATE phone_verifications
SET attempted_at = created_at
WHERE attempted_at IS NULL;

-- Migrate existing data: set expires_at to 15 minutes after created_at
UPDATE phone_verifications
SET expires_at = created_at + INTERVAL '15 minutes'
WHERE expires_at IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS phone_verifications_expires_at_idx ON phone_verifications(expires_at);
CREATE INDEX IF NOT EXISTS phone_verifications_attempted_at_idx ON phone_verifications(attempted_at DESC);

-- Drop the old unique constraint on phone_number to allow multiple verifications
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'phone_verifications_phone_number_key'
  ) THEN
    ALTER TABLE phone_verifications DROP CONSTRAINT phone_verifications_phone_number_key;
  END IF;
END $$;

-- Create a partial unique index: only one pending verification per phone number
CREATE UNIQUE INDEX IF NOT EXISTS phone_verifications_phone_pending_unique 
ON phone_verifications(phone_number) 
WHERE status = 'pending';

-- Add comment explaining the schema
COMMENT ON COLUMN phone_verifications.expires_at IS 'Timestamp when the verification code expires (15 minutes from creation)';
COMMENT ON COLUMN phone_verifications.attempted_at IS 'Timestamp when verification was last requested (for rate limiting)';
COMMENT ON COLUMN phone_verifications.verification_code IS 'Hashed verification code (optional, for local verification)';
COMMENT ON COLUMN phone_verifications.verification_attempts IS 'Number of failed verification attempts (max 5)';
