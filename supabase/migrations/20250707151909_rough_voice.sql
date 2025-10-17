/*
  # Make API access free for all users
  
  1. Changes
    - Remove Pro tier requirement from API access
    - Keep the daily limit of 50 requests per user
    - Update any relevant documentation comments
  
  This migration ensures all users can access the API with a fair usage limit,
  regardless of their subscription tier.
*/

-- Update any existing comments or documentation
COMMENT ON TABLE api_keys IS 'Stores API keys for users to access OrionX services. Available to all users with a daily limit of 50 requests.';

-- If needed, we can update any functions that check subscription requirements
-- For example, if there's a function that validates API access permissions:

CREATE OR REPLACE FUNCTION check_api_access_allowed(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Previously would have checked subscription tier
  -- Now just verify the user exists
  RETURN EXISTS (
    SELECT 1 FROM user_profiles WHERE id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or update a function to track API usage
CREATE OR REPLACE FUNCTION track_api_usage(
  user_id_param UUID,
  endpoint_param TEXT,
  tokens_input_param INTEGER,
  tokens_output_param INTEGER,
  model_param TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO api_usage (
    user_id,
    endpoint,
    tokens_input,
    tokens_output,
    model,
    timestamp
  ) VALUES (
    user_id_param,
    endpoint_param,
    tokens_input_param,
    tokens_output_param,
    model_param,
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on these functions to authenticated users
GRANT EXECUTE ON FUNCTION check_api_access_allowed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION track_api_usage(UUID, TEXT, INTEGER, INTEGER, TEXT) TO authenticated;