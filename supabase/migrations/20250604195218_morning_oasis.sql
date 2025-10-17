/*
  # Fix for increment_message_count function

  This migration fixes the parameter name conflict in the previous function definition.
  It properly drops the existing function first and then recreates it with the correct
  parameter name to avoid the error.
*/

-- First drop the existing function
DROP FUNCTION IF EXISTS public.increment_message_count(uuid);

-- Create or replace the function that increments the user's daily message count
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