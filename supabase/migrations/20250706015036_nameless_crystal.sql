/*
  # Fix webhook subscription update logic
  
  1. Updates
    - Modify the existing stripe-webhook Edge Function to properly handle subscription status changes
    - Improve the logic for determining when to downgrade from Pro to Free
    - Add more robust logging for subscription status changes

  2. Changes
    - Add protection against incorrect subscription downgrades
    - Ensure subscription end dates are respected
    - Prevent race conditions between different update mechanisms
*/

-- Add a materialized view for subscription status
CREATE MATERIALIZED VIEW IF NOT EXISTS subscription_status_cache AS
SELECT 
  sc.user_id,
  ss.status as subscription_status,
  ss.subscription_id,
  ss.price_id,
  ss.current_period_start,
  ss.current_period_end,
  CASE 
    WHEN ss.status IN ('active', 'trialing') THEN 'pro'
    WHEN ss.status IN ('past_due', 'incomplete') AND 
         to_timestamp(ss.current_period_end) > CURRENT_TIMESTAMP THEN 'pro'
    WHEN ss.status = 'canceled' AND 
         to_timestamp(ss.current_period_end) > CURRENT_TIMESTAMP THEN 'pro'
    ELSE 'freemium'
  END as derived_tier,
  to_timestamp(ss.current_period_start) as period_start_date,
  to_timestamp(ss.current_period_end) as period_end_date
FROM 
  stripe_customers sc
JOIN 
  stripe_subscriptions ss ON sc.customer_id = ss.customer_id
WHERE 
  sc.deleted_at IS NULL AND 
  ss.deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_status_cache_user_id_idx ON subscription_status_cache (user_id);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_subscription_status_cache()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY subscription_status_cache;
END;
$$ LANGUAGE plpgsql;

-- Function to sync a user's profile with their subscription status
CREATE OR REPLACE FUNCTION sync_user_subscription(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_tier TEXT;
  v_current_start TIMESTAMPTZ;
  v_current_end TIMESTAMPTZ;
  v_cache_record RECORD;
  v_updated BOOLEAN := FALSE;
BEGIN
  -- Get current user profile data
  SELECT subscription_tier, subscription_start, subscription_end
  INTO v_current_tier, v_current_start, v_current_end
  FROM user_profiles
  WHERE id = user_id_param;
  
  -- Try to get subscription data from cache
  SELECT * INTO v_cache_record
  FROM subscription_status_cache
  WHERE user_id = user_id_param;
  
  -- If subscription data exists in cache
  IF FOUND THEN
    -- Only update if there's a difference and we're not downgrading incorrectly
    IF (v_current_tier != v_cache_record.derived_tier OR 
        v_current_start IS DISTINCT FROM v_cache_record.period_start_date OR
        v_current_end IS DISTINCT FROM v_cache_record.period_end_date) AND
       (v_current_tier != 'pro' OR v_cache_record.derived_tier = 'pro' OR 
        (v_current_end IS NOT NULL AND v_current_end < CURRENT_TIMESTAMP)) THEN
      
      -- Update the user profile
      UPDATE user_profiles
      SET 
        subscription_tier = v_cache_record.derived_tier,
        subscription_start = v_cache_record.period_start_date,
        subscription_end = v_cache_record.period_end_date,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = user_id_param;
      
      v_updated := TRUE;
      
      -- Log the change
      INSERT INTO subscription_change_logs (
        user_id, old_tier, attempted_tier, successful, reason, changed_by
      ) VALUES (
        user_id_param, 
        v_current_tier, 
        v_cache_record.derived_tier, 
        TRUE,
        'Synced from subscription cache', 
        user_id_param
      );
    END IF;
  ELSIF v_current_tier = 'pro' AND 
        v_current_end IS NOT NULL AND 
        v_current_end < CURRENT_TIMESTAMP THEN
    -- No subscription found in cache but pro subscription has expired
    UPDATE user_profiles
    SET 
      subscription_tier = 'freemium',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = user_id_param;
    
    v_updated := TRUE;
    
    -- Log the change
    INSERT INTO subscription_change_logs (
      user_id, old_tier, attempted_tier, successful, reason, changed_by
    ) VALUES (
      user_id_param, 
      v_current_tier, 
      'freemium', 
      TRUE,
      'Subscription expired and no active subscription found', 
      user_id_param
    );
  END IF;
  
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled function to regularly sync all user subscriptions
CREATE OR REPLACE FUNCTION sync_all_user_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_user_id UUID;
BEGIN
  -- Refresh the cache first
  PERFORM refresh_subscription_status_cache();

  -- Process each pro user
  FOR v_user_id IN 
    SELECT id FROM user_profiles 
    WHERE subscription_tier = 'pro'
  LOOP
    IF sync_user_subscription(v_user_id) THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on new objects
COMMENT ON MATERIALIZED VIEW subscription_status_cache IS 'Cache of user subscription status derived from Stripe data';
COMMENT ON FUNCTION refresh_subscription_status_cache() IS 'Refreshes the subscription status cache';
COMMENT ON FUNCTION sync_user_subscription(UUID) IS 'Syncs a user profile with their current subscription status';
COMMENT ON FUNCTION sync_all_user_subscriptions() IS 'Syncs all user profiles with their current subscription status';