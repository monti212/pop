/*
  # Create user data deletion request system
  
  This migration creates a table for tracking user data deletion requests as required 
  for GDPR compliance and user privacy rights.
  
  1. New Tables:
    - `deletion_requests`: Stores and tracks user requests for data deletion
  
  2. Security:
    - Enable RLS on deletion_requests table
    - Users can create and view their own requests
    - Admins can manage all requests
*/

-- Create deletion_requests table
CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  request_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_date TIMESTAMPTZ,
  data_types TEXT[] NOT NULL,
  notes TEXT
);

-- Create indexes on user_id and status
CREATE INDEX IF NOT EXISTS deletion_requests_user_id_idx ON deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS deletion_requests_status_idx ON deletion_requests(status);

-- Enable RLS
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can insert their own deletion requests"
  ON deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own deletion requests"
  ON deletion_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin policy
CREATE POLICY "Admins can manage all deletion requests"
  ON deletion_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users auth_users
      WHERE auth_users.id = auth.uid()
      AND auth_users.email LIKE '%@orionx.xyz'
    )
  );

-- Add comments
COMMENT ON TABLE deletion_requests IS 'Stores user requests for data deletion (GDPR compliance)';
COMMENT ON COLUMN deletion_requests.status IS 'Status of the deletion request: pending, processing, completed, or rejected';
COMMENT ON COLUMN deletion_requests.data_types IS 'Types of data to be deleted (e.g., profile, conversations, preferences)';
COMMENT ON COLUMN deletion_requests.notes IS 'Additional notes or reason for rejection';