/*
  # Remove monthly subscription change limit
  
  1. Changes
    - Modify the `protect_subscription_downgrade()` function to remove the monthly limit
    - Continue to prevent downgrades before subscription period ends
    - Keep special handling for free-to-pro upgrades
    - Maintain logging of subscription changes
    
  This migration removes the restriction that users can only change their subscription
  once per month, while maintaining other protection mechanisms.
*/

-- Update the protection function to remove the monthly limit check
CREATE OR REPLACE FUNCTION protect_subscription_downgrade()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_by UUID;
  v_is_admin BOOLEAN;
  v_subscription_expired BOOLEAN;
  v_is_downgrade BOOLEAN;
  v_is_free_to_pro_upgrade BOOLEAN;
  v_reason TEXT;
  v_headers JSONB;
BEGIN
  -- Only check when subscription_tier is being changed
  IF OLD.subscription_tier = NEW.subscription_tier THEN
    RETURN NEW;
  END IF;

  -- Get the user making the change
  v_changed_by := auth.uid();
  
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
    -- Always allow free to pro upgrades
    NEW.last_subscription_change_at := CURRENT_TIMESTAMP;
    
    -- Log the special upgrade
    INSERT INTO subscription_change_logs (
      user_id, old_tier, attempted_tier, successful, reason, changed_by, request_headers
    ) VALUES (
      NEW.id, OLD.subscription_tier, NEW.subscription_tier, TRUE, 
      'Free to Pro upgrade allowed', v_changed_by, v_headers
    );
    
    RETURN NEW;
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

-- Update the trigger comment to reflect the modified protection
COMMENT ON FUNCTION protect_subscription_downgrade() IS 'Prevents subscription downgrades before the subscription period ends, but allows free to pro upgrades anytime';