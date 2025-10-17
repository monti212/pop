/*
  # Add API usage statistics function
  
  1. New Functions
    - `get_api_usage_stats`: Returns API usage statistics for a specific user
      - Total request count
      - Total token usage
      - Last usage timestamp
  
  This function is used by the API key management UI to show usage statistics.
*/

-- Create function to get API usage statistics
CREATE OR REPLACE FUNCTION get_api_usage_stats(user_id_param UUID)
RETURNS TABLE (
  request_count BIGINT,
  total_tokens BIGINT,
  last_used TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS request_count,
    SUM(tokens_input + tokens_output)::BIGINT AS total_tokens,
    MAX(timestamp) AS last_used
  FROM api_usage
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION get_api_usage_stats(UUID) TO authenticated;

-- Add more context to the API keys table
COMMENT ON TABLE api_keys IS 'Stores API keys for users to access OrionX services';