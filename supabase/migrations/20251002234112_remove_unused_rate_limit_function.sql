/*
  # Remove unused rate limit function

  1. Changes
    - Drop the `check_api_rate_limit` function as it's not being used anywhere in the codebase
    - This function was checking daily limits but we're moving to a new limit system
  
  2. Reason
    - Cleaning up unused code before implementing new limits
    - The function was never called from any edge function or client code
*/

-- Drop the unused rate limit function
DROP FUNCTION IF EXISTS check_api_rate_limit(UUID, INT);
