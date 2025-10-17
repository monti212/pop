/*
  # Add API usage stats function

  1. New Functions
    - `get_api_usage_stats`: Calculates API usage statistics for a user
      - Returns total request count, tokens used, and last used timestamp

  This stored procedure allows the front-end to efficiently get usage statistics
  for displaying in the API keys management UI.
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