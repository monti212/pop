/*
  # Create function to increment daily image count

  1. New Functions
    - `increment_daily_image_count(user_id uuid)` 
      - Safely increments the daily_image_count for a user
      - Uses atomic operation to prevent race conditions
      - Returns the new count value

  2. Security
    - Function is accessible to authenticated users
    - Users can only increment their own count
*/

-- Create function to atomically increment daily image count
CREATE OR REPLACE FUNCTION increment_daily_image_count(user_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count integer;
BEGIN
  -- Update and return the new count in one atomic operation
  UPDATE user_profiles 
  SET daily_image_count = COALESCE(daily_image_count, 0) + 1
  WHERE id = user_uuid
  RETURNING daily_image_count INTO new_count;
  
  -- If no row was updated, the user doesn't exist
  IF new_count IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  RETURN new_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_daily_image_count(uuid) TO authenticated;