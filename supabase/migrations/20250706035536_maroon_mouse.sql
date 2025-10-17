/*
  # Allow Free users to upgrade to Pro anytime
  
  1. Modifications
    - Update subscription protection function to allow free→pro upgrades anytime
    - Keep once-per-month restriction for other subscription changes
    - Maintain downgrade restrictions (only after period end)
    - Improve logging for better tracking
    
  2. Changes
    - Modify protect_subscription_downgrade() to check for free→pro upgrades
    - Add additional condition to bypass the monthly restriction check
    - Keep tracking of last_subscription_change_at timestamp
    - Maintain detailed logging for auditing and troubleshooting
*/

-- Update the protection function to allow free to pro upgrades anytime
CREATE OR REPLACE FUNCTION protect_subscription_downgrade()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_by UUID;
  v_subscription_expired BOOLEAN;
  v_is_downgrade BOOLEAN;
  v_is_free_to_pro_upgrade BOOLEAN;
  v_one_month_ago TIMESTAMPTZ;
  v_can_change_again BOOLEAN;
  v_reason TEXT;
  v_headers JSONB;
BEGIN
  -- Only check when subscription_tier is being changed
  IF OLD.subscription_tier = NEW.subscription_tier THEN
    RETURN NEW;
  END IF;

  -- Get the user making the change
  v_changed_by := auth.uid();
  
  -- Calculate one month ago for the cooldown check
  v_one_month_ago := (CURRENT_TIMESTAMP - INTERVAL '1 month');
  
  -- Check if the user has changed subscription within the last month
  v_can_change_again := (
    OLD.last_subscription_change_at IS NULL OR 
    OLD.last_subscription_change_at < v_one_month_ago
  );
  
  -- Capture request headers for debugging
  BEGIN
    v_headers := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_headers := jsonb_build_object('error', 'Failed to capture headers');
  END;
  
  -- Check if this is a downgrade
  v_is_downgrade := (OLD.subscription_tier = 'pro' AND NEW.subscription_tier = 'freemium');
  
  -- Check if this is a free to pro upgrade (SPECIAL CASE: ALWAYS ALLOWED)
  v_is_free_to_pro_upgrade := (
    (OLD.subscription_tier = 'freemium' OR OLD.subscription_tier = 'free') AND 
    NEW.subscription_tier = 'pro'
  );
  
  -- Check if subscription has expired
  v_subscription_expired := (
    OLD.subscription_end IS NOT NULL AND 
    OLD.subscription_end < CURRENT_TIMESTAMP
  );
  
  -- Special handling for free to pro upgrades - ALWAYS ALLOW
  IF v_is_free_to_pro_upgrade THEN
    -- Always allow free to pro upgrades regardless of the once-per-month rule
    NEW.last_subscription_change_at := CURRENT_TIMESTAMP;
    
    -- Log the special upgrade
    INSERT INTO subscription_change_logs (
      user_id, old_tier, attempted_tier, successful, reason, changed_by, request_headers
    ) VALUES (
      NEW.id, OLD.subscription_tier, NEW.subscription_tier, TRUE, 
      'Free to Pro upgrade allowed (special rule)', v_changed_by, v_headers
    );
    
    RETURN NEW;
  END IF;
  
  -- For all other changes, enforce the once-per-month rule
  IF NOT v_can_change_again THEN
    v_reason := format('Subscription was already changed on %s - only one change per month is allowed', 
                     to_char(OLD.last_subscription_change_at, 'YYYY-MM-DD'));
                     
    -- Log the rejected change attempt
    INSERT INTO subscription_change_logs (
      user_id, old_tier, attempted_tier, successful, reason, changed_by, request_headers
    ) VALUES (
      NEW.id, OLD.subscription_tier, NEW.subscription_tier, FALSE, 
      v_reason, v_changed_by, v_headers
    );
    
    -- RAISE EXCEPTION to abort the transaction
    RAISE EXCEPTION 'Subscription change rejected: %', v_reason;
  END IF;
  
  -- For downgrades, enforce waiting until period end
  IF v_is_downgrade AND NOT v_subscription_expired THEN
    v_reason := format('Downgrades are only allowed after the subscription period ends on %s', 
                     to_char(OLD.subscription_end, 'YYYY-MM-DD'));
    
    -- Log the rejected downgrade attempt
    INSERT INTO subscription_change_logs (
      user_id, old_tier, attempted_tier, successful, reason, changed_by, request_headers
    ) VALUES (
      NEW.id, OLD.subscription_tier, NEW.subscription_tier, FALSE, 
      v_reason, v_changed_by, v_headers
    );
    
    -- RAISE EXCEPTION to abort the transaction
    RAISE EXCEPTION 'Subscription downgrade rejected: %', v_reason;
  END IF;
  
  -- If we reach here, the change is allowed - update the timestamp
  NEW.last_subscription_change_at := CURRENT_TIMESTAMP;
  
  -- Log the successful change
  INSERT INTO subscription_change_logs (
    user_id, old_tier, attempted_tier, successful, reason, changed_by, request_headers
  ) VALUES (
    NEW.id, OLD.subscription_tier, NEW.subscription_tier, TRUE, 
    'Subscription change allowed', v_changed_by, v_headers
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger comment to reflect the enhanced protection with special case for free→pro
COMMENT ON FUNCTION protect_subscription_downgrade() IS 'Prevents unauthorized subscription downgrades while allowing free to pro upgrades anytime';