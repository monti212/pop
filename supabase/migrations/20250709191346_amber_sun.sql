/*
  # Register existing free users on Stripe Free tier
  
  1. Data Changes
    - Finds all users with 'free' or 'freemium' subscription tier
    - Creates Stripe customer records for users who don't have them
    - Creates Stripe subscription records for the Free tier
    - Sets subscription status to 'active' with 100-year trial period
  
  This migration ensures all existing free users are properly registered
  in Stripe as having an active free subscription, which prevents automatic
  downgrades when upgrading to Plus later.
*/

DO $$
DECLARE
  v_user RECORD;
  v_customer_id TEXT;
  v_subscription_id TEXT;
  v_trial_end TIMESTAMPTZ;
  v_count INT := 0;
BEGIN
  -- Calculate trial end date (100 years from now)
  v_trial_end := NOW() + INTERVAL '100 years';
  
  -- Find all free tier users who don't have Stripe records
  FOR v_user IN 
    SELECT 
      up.id AS user_id, 
      up.display_name,
      u.email
    FROM 
      user_profiles up
    JOIN 
      auth.users u ON up.id = u.id
    WHERE 
      (up.subscription_tier = 'free' OR up.subscription_tier = 'freemium')
      AND NOT EXISTS (
        SELECT 1 FROM stripe_customers sc WHERE sc.user_id = up.id
      )
  LOOP
    v_count := v_count + 1;
    RAISE NOTICE 'Processing user %: % (%)', v_count, v_user.display_name, v_user.email;
    
    -- Generate customer ID
    v_customer_id := 'cus_free_' || REPLACE(v_user.user_id::text, '-', '');
    
    -- Create customer record
    INSERT INTO stripe_customers (
      user_id,
      customer_id,
      created_at,
      updated_at
    ) VALUES (
      v_user.user_id,
      v_customer_id,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created Stripe customer for user %', v_user.email;
    
    -- Generate subscription ID
    v_subscription_id := 'sub_free_' || REPLACE(v_user.user_id::text, '-', '');
    
    -- Create subscription record
    INSERT INTO stripe_subscriptions (
      customer_id,
      subscription_id,
      price_id,
      current_period_start,
      current_period_end,
      status,
      created_at,
      updated_at
    ) VALUES (
      v_customer_id,
      v_subscription_id,
      'price_1RVCyyKhB7e46jXjp2nUltjm', -- Free tier price ID
      EXTRACT(EPOCH FROM NOW())::bigint,
      EXTRACT(EPOCH FROM v_trial_end)::bigint,
      'active', -- Mark as active subscription
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created Stripe subscription for user %', v_user.email;
    
    -- Update user profile to set subscription dates
    UPDATE user_profiles
    SET
      subscription_start = NOW(),
      subscription_end = v_trial_end
    WHERE id = v_user.user_id;
    
    RAISE NOTICE 'Updated user profile with subscription dates for %', v_user.email;
  END LOOP;
  
  -- Now handle users who have customer records but no subscription records
  FOR v_user IN
    SELECT 
      up.id AS user_id,
      up.display_name,
      u.email,
      sc.customer_id
    FROM 
      user_profiles up
    JOIN 
      auth.users u ON up.id = u.id
    JOIN
      stripe_customers sc ON sc.user_id = up.id
    WHERE 
      (up.subscription_tier = 'free' OR up.subscription_tier = 'freemium')
      AND NOT EXISTS (
        SELECT 1 FROM stripe_subscriptions ss WHERE ss.customer_id = sc.customer_id
      )
  LOOP
    v_count := v_count + 1;
    RAISE NOTICE 'Processing user with existing customer record %: % (%)', v_count, v_user.display_name, v_user.email;
    
    -- Generate subscription ID
    v_subscription_id := 'sub_free_' || REPLACE(v_user.user_id::text, '-', '');
    
    -- Create subscription record
    INSERT INTO stripe_subscriptions (
      customer_id,
      subscription_id,
      price_id,
      current_period_start,
      current_period_end,
      status,
      created_at,
      updated_at
    ) VALUES (
      v_user.customer_id,
      v_subscription_id,
      'price_1RVCyyKhB7e46jXjp2nUltjm', -- Free tier price ID
      EXTRACT(EPOCH FROM NOW())::bigint,
      EXTRACT(EPOCH FROM v_trial_end)::bigint,
      'active', -- Mark as active subscription
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created Stripe subscription for user with existing customer %', v_user.email;
    
    -- Update user profile to set subscription dates
    UPDATE user_profiles
    SET
      subscription_start = NOW(),
      subscription_end = v_trial_end
    WHERE id = v_user.user_id;
  END LOOP;
  
  -- Update subscription status for users who already have subscriptions but status is not 'active'
  UPDATE stripe_subscriptions
  SET
    status = 'active',
    current_period_end = EXTRACT(EPOCH FROM v_trial_end)::bigint,
    updated_at = NOW()
  WHERE
    customer_id IN (
      SELECT sc.customer_id
      FROM stripe_customers sc
      JOIN user_profiles up ON sc.user_id = up.id
      WHERE (up.subscription_tier = 'free' OR up.subscription_tier = 'freemium')
    )
    AND status != 'active';
  
  RAISE NOTICE 'Migration complete. Processed % free tier users with Stripe.', v_count;
END $$;