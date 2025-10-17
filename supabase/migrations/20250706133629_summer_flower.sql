/*
  # Create Pro Subscription for hello@orionx.xyz
  
  1. User Setup
    - Set subscription_tier to 'pro' for user with email hello@orionx.xyz
    - Set subscription dates (start now, end in 1 year)
    - Create required Stripe customer and subscription records
    - Add payment record for tracking
  
  Note: This migration assumes the user has been or will be created through the Supabase Auth API or UI,
  as we cannot directly insert records into auth.users through migrations.
*/

DO $$
DECLARE
  v_user_id UUID;
  v_customer_id TEXT;
  v_subscription_id TEXT;
  v_start_date TIMESTAMPTZ := NOW();
  v_end_date TIMESTAMPTZ := NOW() + INTERVAL '1 year';
  v_user_exists BOOLEAN;
  v_email TEXT := 'hello@orionx.xyz';
BEGIN
  -- First check if the user exists in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = v_email
  ) INTO v_user_exists;

  IF v_user_exists THEN
    -- Get the user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    
    RAISE NOTICE 'Found user with ID: %', v_user_id;
    
    -- Update user profile to Pro tier
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
      'Hello OrionX',
      'pro',
      v_start_date,
      v_end_date,
      0,
      NOW(),
      NOW()
    ) 
    ON CONFLICT (id) DO UPDATE 
    SET 
      subscription_tier = 'pro',
      subscription_start = v_start_date,
      subscription_end = v_end_date,
      last_active_at = NOW();
    
    RAISE NOTICE 'Updated user profile to Pro tier';
    
    -- Create customer record in stripe_customers
    v_customer_id := 'cus_hello_' || REPLACE(v_user_id::text, '-', '');
    
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
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      customer_id = EXCLUDED.customer_id,
      updated_at = NOW();
    
    RAISE NOTICE 'Created/updated stripe customer record';
    
    -- Create subscription record in stripe_subscriptions
    v_subscription_id := 'sub_hello_' || REPLACE(v_user_id::text, '-', '');
    
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
      
    RAISE NOTICE 'Created/updated subscription record';
    
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
      'pi_hello_' || REPLACE(v_user_id::text, '-', ''),
      NOW()
    );
    
    RAISE NOTICE 'Added payment record';
    
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
    
    RAISE NOTICE 'Successfully upgraded user to Pro tier with subscription valid until %', v_end_date;
  ELSE
    -- If user doesn't exist, log a notice
    RAISE NOTICE 'User with email % not found in auth.users. Please create this user through the Supabase Auth API or UI first.', v_email;
    RAISE NOTICE 'After creating the user, run this migration again to set up the Pro subscription.';
    
    -- You can also add instructions on how to create the user via the Supabase CLI or REST API
    RAISE NOTICE 'Create the user with these credentials:';
    RAISE NOTICE 'Email: %', v_email;
    RAISE NOTICE 'Password: Templerun2@';
  END IF;
END $$;