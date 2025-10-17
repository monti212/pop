/*
  # Add last_subscription_change_at field and enhance protection trigger
  
  1. Schema Changes:
    - Add `last_subscription_change_at` column to `user_profiles` table
    - This tracks when a user last changed their subscription tier
  
  2. Trigger Updates:
    - Enhance `protect_subscription_downgrade()` function to enforce:
      - Maximum one subscription change per month
      - Downgrades only at end of billing period
    - Log all change attempts to `subscription_change_logs`
*/

-- Add the last_subscription_change_at column to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS last_subscription_change_at TIMESTAMPTZ DEFAULT now();

-- Add a comment to explain the column's purpose
COMMENT ON COLUMN user_profiles.last_subscription_change_at IS 'Timestamp of last subscription tier change';

-- Update the protection function to enforce once-per-month rule
CREATE OR REPLACE FUNCTION protect_subscription_downgrade()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_by UUID;
  v_is_admin BOOLEAN;
  v_subscription_expired BOOLEAN;
  v_is_downgrade BOOLEAN;
  v_block_change BOOLEAN := FALSE;
  v_reason TEXT;
  v_headers JSONB;
  v_one_month_ago TIMESTAMPTZ;
  v_can_change_again BOOLEAN;
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
  
  -- Check if user is an admin
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = v_changed_by AND email LIKE '%@orionx.xyz'
  ) INTO v_is_admin;
  
  -- Check if subscription has expired
  v_subscription_expired := (
    OLD.subscription_end IS NOT NULL AND 
    OLD.subscription_end < CURRENT_TIMESTAMP
  );
  
  -- Handle admin-initiated changes (always allowed)
  IF v_is_admin THEN
    -- Admin changes are always allowed
    v_block_change := FALSE;
    v_reason := 'Change allowed - performed by admin';
    
    -- Update the last_subscription_change_at timestamp
    NEW.last_subscription_change_at := CURRENT_TIMESTAMP;
    
    -- Log the change
    INSERT INTO subscription_change_logs (
      user_id, old_tier, attempted_tier, successful, reason, changed_by, request_headers
    ) VALUES (
      NEW.id, OLD.subscription_tier, NEW.subscription_tier, TRUE, 
      v_reason, v_changed_by, v_headers
    );
    
    RETURN NEW;
  END IF;
  
  -- Handle regular user changes with time restriction
  IF NOT v_can_change_again THEN
    -- Block the change due to the once-per-month restriction
    v_block_change := TRUE;
    v_reason := format('Subscription was already changed on %s - only one change per month is allowed', 
                       to_char(OLD.last_subscription_change_at, 'YYYY-MM-DD'));
  ELSIF v_is_downgrade THEN
    -- Handle downgrade attempts
    IF v_subscription_expired THEN
      -- Allow downgrade if the subscription has already expired
      v_block_change := FALSE;
      v_reason := 'Downgrade allowed - subscription already expired';
      NEW.last_subscription_change_at := CURRENT_TIMESTAMP;
    ELSE
      -- Block immediate downgrades, only allow at period end
      v_block_change := TRUE;
      v_reason := format('Attempted unauthorized downgrade - subscription active until %s', 
                       to_char(OLD.subscription_end, 'YYYY-MM-DD'));
    END IF;
  ELSE
    -- Handle upgrade (always allowed if within the time restriction)
    v_block_change := FALSE;
    v_reason := 'Upgrade allowed';
    NEW.last_subscription_change_at := CURRENT_TIMESTAMP;
  END IF;

  -- Log all subscription tier changes
  INSERT INTO subscription_change_logs (
    user_id, old_tier, attempted_tier, successful, reason, changed_by, request_headers
  ) VALUES (
    NEW.id, OLD.subscription_tier, NEW.subscription_tier, NOT v_block_change, 
    v_reason, v_changed_by, v_headers
  );
  
  -- If we should block, revert to the old subscription tier
  IF v_block_change THEN
    RAISE LOG 'Blocked subscription change for user %: %', NEW.id, v_reason;
    NEW.subscription_tier := OLD.subscription_tier;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is correctly set up
DROP TRIGGER IF EXISTS prevent_subscription_downgrade_trigger ON user_profiles;

CREATE TRIGGER prevent_subscription_downgrade_trigger
  BEFORE UPDATE OF subscription_tier ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_subscription_downgrade();