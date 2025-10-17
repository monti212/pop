/*
  # Prevent automatic subscription downgrades
  
  1. New Function
    - `protect_subscription_downgrade`: Prevents subscription tier from being downgraded without explicit conditions
    - Only allows downgrade if:
      - The subscription_end date has passed
      - An admin with orionx.xyz email is making the change
      - The tier is being upgraded (not downgraded)
  
  2. New Trigger
    - Executes before any update to user_profiles.subscription_tier
    - Blocks unauthorized downgrades from 'pro' to 'freemium'
    - Logs attempted downgrades for auditing
*/

-- Create a table to log subscription change attempts
CREATE TABLE IF NOT EXISTS subscription_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  old_tier TEXT NOT NULL,
  attempted_tier TEXT NOT NULL,
  successful BOOLEAN NOT NULL,
  reason TEXT,
  changed_by UUID, -- The auth.uid() that attempted the change
  request_headers JSONB, -- Store request headers for debugging
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Function to protect against unauthorized subscription downgrades
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
  
  -- If it's not a downgrade, allow the change
  IF NOT v_is_downgrade THEN
    -- Log the upgrade
    INSERT INTO subscription_change_logs (
      user_id, old_tier, attempted_tier, successful, reason, changed_by, request_headers
    ) VALUES (
      NEW.id, OLD.subscription_tier, NEW.subscription_tier, TRUE, 
      'Subscription upgrade allowed', v_changed_by, v_headers
    );
    
    RETURN NEW;
  END IF;
  
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
  
  -- Determine if we should block the change
  IF v_is_downgrade THEN
    -- Block the downgrade unless admin or expired
    IF v_is_admin THEN
      v_block_change := FALSE;
      v_reason := 'Downgrade allowed - performed by admin';
    ELSIF v_subscription_expired THEN
      v_block_change := FALSE;
      v_reason := 'Downgrade allowed - subscription expired';
    ELSE
      v_block_change := TRUE;
      v_reason := 'Attempted unauthorized downgrade from pro to freemium';
    END IF;
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
    RAISE LOG 'Blocked subscription downgrade for user %: %', NEW.id, v_reason;
    NEW.subscription_tier := OLD.subscription_tier;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on user_profiles table
DROP TRIGGER IF EXISTS prevent_subscription_downgrade_trigger ON user_profiles;

CREATE TRIGGER prevent_subscription_downgrade_trigger
  BEFORE UPDATE OF subscription_tier ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_subscription_downgrade();

-- Add a utility function to check if a user's subscription should be downgraded
CREATE OR REPLACE FUNCTION should_downgrade_subscription(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_subscription_tier TEXT;
  v_subscription_end TIMESTAMPTZ;
  v_should_downgrade BOOLEAN := FALSE;
BEGIN
  -- Get the user's current subscription info
  SELECT subscription_tier, subscription_end
  INTO v_subscription_tier, v_subscription_end
  FROM user_profiles
  WHERE id = user_id_param;
  
  -- Check if this is a pro subscription with an end date that has passed
  IF v_subscription_tier = 'pro' AND 
     v_subscription_end IS NOT NULL AND 
     v_subscription_end < CURRENT_TIMESTAMP THEN
    v_should_downgrade := TRUE;
  ELSE
    v_should_downgrade := FALSE;
  END IF;
  
  RETURN v_should_downgrade;
END;
$$ LANGUAGE plpgsql;

-- Add table and column comments
COMMENT ON TABLE subscription_change_logs IS 'Logs attempts to change subscription tiers';
COMMENT ON FUNCTION protect_subscription_downgrade() IS 'Prevents unauthorized subscription downgrades';
COMMENT ON FUNCTION should_downgrade_subscription(UUID) IS 'Checks if a user subscription should be downgraded based on expiration';