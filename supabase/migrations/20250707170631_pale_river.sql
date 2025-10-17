/*
  # Add key_hash field to api_keys table
  
  1. Table Updates
    - Add `key_hash` column to `api_keys` table to store secure hash of API keys
    - This allows for secure validation of API keys without storing raw keys
  
  2. Changes
    - Add SHA-256 hash field for API key validation
    - Update comments to reflect that API keys are available to all users
    - Create index on key_hash for faster lookups
*/

-- Add key_hash column to api_keys table
ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS key_hash TEXT;

-- Create index on key_hash for faster lookups
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash);

-- Update table comment to reflect availability to all users
COMMENT ON TABLE api_keys IS 'Stores API keys for users to access OrionX services. Available to all users with a daily limit of 50 requests.';

-- Function to check daily API request count
CREATE OR REPLACE FUNCTION get_daily_api_requests(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Count API requests made today
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM api_usage
  WHERE 
    user_id = user_id_param AND
    DATE(timestamp) = v_today;
    
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_daily_api_requests(UUID) TO authenticated;