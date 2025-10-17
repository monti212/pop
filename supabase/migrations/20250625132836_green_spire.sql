/*
  # Update Palesa's account to Pro subscription

  1. Changes
    - Set subscription_tier to 'pro' in user_profiles
    - Set subscription dates (start now, end in 1 year)
    - Set customer ID and subscription data if needed

  This migration ensures the user with email palesa@gmail.com and ID 563a8830-e622-46f5-bb32-50b9c835886e 
  has full Pro subscription access.
*/

-- Set pro subscription for Palesa's account
DO $$
DECLARE
  v_user_id UUID := '563a8830-e622-46f5-bb32-50b9c835886e';
  v_customer_id TEXT;
  v_subscription_id TEXT;
  v_start_date TIMESTAMPTZ := NOW();
  v_end_date TIMESTAMPTZ := NOW() + INTERVAL '1 year';
BEGIN
  -- Update user profile to Pro tier
  UPDATE user_profiles
  SET 
    subscription_tier = 'pro',
    subscription_start = v_start_date,
    subscription_end = v_end_date,
    last_active_at = NOW() -- Update last active timestamp
  WHERE id = v_user_id;
  
  RAISE NOTICE 'Updated user profile to Pro tier';
  
  -- Check if customer record exists in stripe_customers
  SELECT customer_id INTO v_customer_id
  FROM stripe_customers
  WHERE user_id = v_user_id;
  
  -- Create customer record if it doesn't exist
  IF v_customer_id IS NULL THEN
    v_customer_id := 'cus_palesa_' || REPLACE(v_user_id::text, '-', '');
    
    INSERT INTO stripe_customers (
      user_id,
      customer_id,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_customer_id,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created stripe customer record';
  ELSE
    RAISE NOTICE 'Customer record already exists';
  END IF;
  
  -- Create or update subscription record
  v_subscription_id := 'sub_palesa_' || REPLACE(v_user_id::text, '-', '');
  
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
    'price_1RVD0uKhB7e46jXj5tCpGteQ', -- Pro price ID
    EXTRACT(EPOCH FROM v_start_date)::bigint,
    EXTRACT(EPOCH FROM v_end_date)::bigint,
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (customer_id) DO UPDATE
  SET
    subscription_id = EXCLUDED.subscription_id,
    price_id = EXCLUDED.price_id,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    status = EXCLUDED.status,
    updated_at = NOW();
    
  RAISE NOTICE 'Updated subscription record';
  
  -- Record a payment for the subscription
  INSERT INTO payments (
    user_id,
    amount,
    currency,
    status,
    provider,
    provider_payment_id,
    created_at
  ) VALUES (
    v_user_id,
    7.00,  -- $7.00 for Pro
    'usd',
    'succeeded',
    'stripe',
    'pi_palesa_' || REPLACE(v_user_id::text, '-', ''),
    NOW()
  );
  
  RAISE NOTICE 'Added payment record';
  
  RAISE NOTICE 'Successfully upgraded user to Pro tier with subscription valid until %', v_end_date;
END $$;