/*
  # Enable API Access for palesa@gmail.com
  
  1. New Records
    - Updates user_profiles to set subscription_tier to 'pro'
    - Creates API key for this user
    - Ensures Stripe records exist to validate subscription
    - Sets appropriate privacy preferences

  This migration enables full API access for the palesa@gmail.com user account
  by upgrading them to Pro tier and generating an API key.
*/

DO $$
DECLARE
  v_user_id UUID;
  v_customer_id TEXT;
  v_subscription_id TEXT;
  v_start_date TIMESTAMPTZ := NOW();
  v_end_date TIMESTAMPTZ := NOW() + INTERVAL '1 year';
  v_user_exists BOOLEAN;
  v_email TEXT := 'palesa@gmail.com';
  v_api_key_exists BOOLEAN;
  v_api_key TEXT;
BEGIN
  -- First check if the user exists in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = v_email
  ) INTO v_user_exists;

  IF v_user_exists THEN
    -- Get the user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    
    RAISE NOTICE 'Found user with ID: %', v_user_id;
    
    -- Check if user already has an API key
    SELECT EXISTS (
      SELECT 1 FROM api_keys 
      WHERE user_id = v_user_id 
      AND revoked = FALSE 
      AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO v_api_key_exists;
    
    -- Update user profile to Pro tier
    UPDATE user_profiles
    SET 
      subscription_tier = 'pro',
      subscription_start = v_start_date,
      subscription_end = v_end_date,
      last_active_at = NOW() -- Update last active timestamp
    WHERE id = v_user_id;
    
    -- If no rows were updated, insert a new profile
    IF NOT FOUND THEN
      INSERT INTO user_profiles (
        id, 
        display_name, 
        subscription_tier, 
        subscription_start, 
        subscription_end, 
        daily_message_count, 
        last_active_at, 
        created_at
      ) VALUES (
        v_user_id,
        'Palesa',
        'pro',
        v_start_date,
        v_end_date,
        0,
        NOW(),
        NOW()
      );
    END IF;
    
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
    
    -- Create privacy preferences
    INSERT INTO privacy_preferences (
      user_id,
      share_data,
      save_history,
      data_collection,
      personalized_responses,
      third_party_sharing,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      false, -- Default to privacy-safe options
      true,
      true,
      true,
      false,
      NOW(),
      NOW()
    ) ON CONFLICT (user_id) DO NOTHING;
    
    -- Generate a readable but secure API key
    v_api_key := 'uhuru_' || encode(gen_random_bytes(16), 'hex');
    
    -- Create an API key if one doesn't exist
    IF NOT v_api_key_exists THEN
      INSERT INTO api_keys (
        user_id,
        service,
        key_value,
        created_at,
        expires_at,
        revoked
      ) VALUES (
        v_user_id,
        'alke',
        v_api_key,
        NOW(),
        NOW() + INTERVAL '1 year',
        FALSE
      );
      
      RAISE NOTICE 'Created new API key: %', v_api_key;
    ELSE
      RAISE NOTICE 'User already has an active API key';
    END IF;
    
    RAISE NOTICE '==================================';
    RAISE NOTICE 'API ACCESS SETUP COMPLETE';
    RAISE NOTICE 'User: %', v_email;
    RAISE NOTICE 'Subscription: Pro tier until %', v_end_date;
    IF NOT v_api_key_exists THEN
      RAISE NOTICE 'API Key: %', v_api_key;
      RAISE NOTICE 'IMPORTANT: Save this API key as it will not be shown again';
    END IF;
    RAISE NOTICE '==================================';
    
  ELSE
    -- If user doesn't exist, log a notice
    RAISE NOTICE 'User with email % not found in auth.users. Please check the email address is correct.', v_email;
  END IF;
END $$;