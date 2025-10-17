/*
  # Add user message count incrementing function
  
  1. New Functions
    - `increment_message_count`: Updates a user's daily message count based on activity date
      - Resets count to 1 if user hasn't been active today
      - Increments count if user has been active today
      - Updates the last_active_at timestamp
*/

-- First drop the existing function if it exists
DROP FUNCTION IF EXISTS public.increment_message_count(uuid);

-- Create the function that increments the user's daily message count
CREATE FUNCTION public.increment_message_count(user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the user's profile
  -- If the user hasn't been active today, reset their count to 1
  -- Otherwise increment their current count
  UPDATE public.user_profiles
  SET
    daily_message_count = CASE
      WHEN last_active_at::date < now()::date THEN 1
      ELSE daily_message_count + 1
    END,
    last_active_at = now()
  WHERE id = user_id;
END;
$$;