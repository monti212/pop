/*
  # Add increment_message_count function
  
  1. New Function
    - `increment_message_count`: Updates a user's daily message count
      - Resets count to 1 if last activity was on a previous day
      - Increments count by 1 if activity was today
      - Updates last_active_at timestamp
  
  This function is called when a user sends a message to track daily usage limits.
*/

CREATE OR REPLACE FUNCTION public.increment_message_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.user_profiles
  SET
    daily_message_count = CASE
      WHEN last_active_at::date < now()::date THEN 1
      ELSE daily_message_count + 1
    END,
    last_active_at = now()
  WHERE id = p_user_id;
END;
$$;