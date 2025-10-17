/*
  # Add rate limit function

  1. New Functions
    - `check_api_rate_limit`: Checks if a user has exceeded their daily API request limit
      - Takes a user ID parameter
      - Returns a record with `is_limited` boolean and request count
      - Used by API functions to enforce rate limits

  2. Security
    - Function is marked as SECURITY DEFINER to ensure it can access the api_usage table
    - Designed to be called from edge functions with appropriate authorization
*/

-- Create function to check if a user has exceeded their API rate limit
CREATE OR REPLACE FUNCTION check_api_rate_limit(
  user_id_param UUID,
  daily_limit INT DEFAULT 50
)
RETURNS TABLE (
  is_limited BOOLEAN,
  request_count BIGINT,
  limit_value INT
) AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_count BIGINT;
  v_tier TEXT;
BEGIN
  -- Get the user's subscription tier
  SELECT subscription_tier INTO v_tier
  FROM user_profiles
  WHERE id = user_id_param;
  
  -- Adjust limit based on subscription tier
  IF v_tier = 'pro' THEN
    daily_limit := daily_limit; -- Keep default for Pro users
  ELSE
    daily_limit := 10; -- Lower limit for non-Pro users (shouldn't happen in practice)
  END IF;
  
  -- Count API calls made today
  SELECT COUNT(*) INTO v_count
  FROM api_usage
  WHERE 
    user_id = user_id_param AND
    DATE(timestamp) = v_today;
  
  -- Return the result
  RETURN QUERY
  SELECT 
    (v_count >= daily_limit) AS is_limited,
    v_count AS request_count,
    daily_limit AS limit_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION check_api_rate_limit(UUID, INT) IS 
  'Checks if a user has exceeded their daily API request limit, returning is_limited, request_count, and limit_value';