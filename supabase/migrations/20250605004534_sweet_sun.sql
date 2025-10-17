/*
  # Add payment-related indexes and constraints

  This migration adds important indexes to the payments table to improve query performance
  and adds constraints to ensure data integrity.
  
  1. Changes:
    - Add index on user_id to speed up user payment history lookups
    - Add index on provider_payment_id to enable fast payment lookups by external ID
    - Add combined index on status and created_at for payment reporting
*/

-- Add index for faster user payment history queries
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments (user_id);

-- Add index for external payment ID lookups
CREATE INDEX IF NOT EXISTS payments_provider_payment_id_idx ON payments (provider_payment_id);

-- Add combined index for payment status reporting
CREATE INDEX IF NOT EXISTS payments_status_created_at_idx ON payments (status, created_at);

-- Add check constraint to enforce payment providers
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_provider_check;
ALTER TABLE payments ADD CONSTRAINT payments_provider_check 
  CHECK (provider IN ('stripe', 'paypal', 'manual', 'bank_transfer'));