/*
  # Create increment daily message count function

  1. New Functions
    - `increment_daily_message_count` - Safely increments user's daily message count
  
  2. Purpose
    - Provides atomic increment operation for daily message tracking
    - Handles edge cases where user profile might not exist
    - Used by LLM proxy to track usage
*/

CREATE OR REPLACE FUNCTION increment_daily_message_count(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Increment the daily message count for the user
  UPDATE user_profiles 
  SET daily_message_count = COALESCE(daily_message_count, 0) + 1,
      last_active_at = NOW()
  WHERE id = user_id;
  
  -- If no rows were updated (user profile doesn't exist), insert a new profile
  IF NOT FOUND THEN
    INSERT INTO user_profiles (id, daily_message_count, last_active_at)
    VALUES (user_id, 1, NOW())
    ON CONFLICT (id) DO UPDATE SET
      daily_message_count = COALESCE(user_profiles.daily_message_count, 0) + 1,
      last_active_at = NOW();
  END IF;
END;
$$;