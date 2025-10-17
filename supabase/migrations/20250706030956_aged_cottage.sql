/*
  # Enhance Subscription Protection Mechanism
  
  1. Changes
    - Modify `protect_subscription_downgrade()` to apply rules universally
    - Enforce the once-per-month rule for all subscription changes
    - Block downgrades until subscription period ends
    - RAISE EXCEPTION to fail transactions for invalid changes
    - Prevent any subscription changes within the monthly cooldown period
  
  2. Security
    - Removes admin exception that bypassed the protection rules
    - Makes protection mechanism truly database-level with no app bypass
    - Returns clear error messages when changes are rejected
*/

-- Update the protection function to enforce subscription rules universally
CREATE OR REPLACE FUNCTION protect_subscription_downgrade()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_by UUID;
  v_subscription_expired BOOLEAN;
  v_is_downgrade BOOLEAN;
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
  
  -- Check if subscription has expired
  v_subscription_expired := (
    OLD.subscription_end IS NOT NULL AND 
    OLD.subscription_end < CURRENT_TIMESTAMP
  );
  
  -- Enforce the once-per-month rule for all changes
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

-- Update the trigger comment to reflect the enhanced protection
COMMENT ON FUNCTION protect_subscription_downgrade() IS 'Prevents unauthorized subscription downgrades';