/*
  # Token Calculation Functions

  ## Summary
  Creates database functions for calculating token balances, rollover amounts, and enforcement limits.
  These functions implement the formulas specified for the Pencils of Promise token tracking system.

  ## Functions Created

  1. **calculate_rollover_tokens** - Calculate rollover from previous month (max 833,333)
  2. **calculate_monthly_cap** - Calculate monthly cap (833,333 + rollover)
  3. **calculate_monthly_balance** - Calculate remaining monthly balance
  4. **calculate_refill_balance** - Calculate total refill balance from unexpired refills
  5. **calculate_total_plan_balance** - Calculate total available tokens
  6. **calculate_image_tokens_used** - Calculate image tokens used based on counts
  7. **calculate_image_tokens_remaining** - Calculate remaining image tokens
  8. **get_token_metrics** - Get all metrics for an organization in one call
  9. **get_user_token_usage_details** - Get detailed user token usage
  10. **add_token_refill** - Add a new token refill (supa_admin only)
  11. **adjust_token_cap** - Adjust organization token cap (supa_admin only)
*/

-- ============================================================================
-- 1. CALCULATE ROLLOVER TOKENS
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_rollover_tokens(
  p_organization_name text
)
RETURNS integer AS $$
DECLARE
  v_prev_month_unused integer;
BEGIN
  SELECT prev_month_unused
  INTO v_prev_month_unused
  FROM organization_token_balances
  WHERE organization_name = p_organization_name;
  
  -- Rollover is minimum of prev_month_unused and 833,333
  RETURN LEAST(COALESCE(v_prev_month_unused, 0), 833333);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 2. CALCULATE MONTHLY CAP
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_monthly_cap(
  p_organization_name text
)
RETURNS integer AS $$
DECLARE
  v_rollover_in integer;
BEGIN
  v_rollover_in := calculate_rollover_tokens(p_organization_name);
  
  -- Monthly cap = 833,333 + rollover_in
  RETURN 833333 + v_rollover_in;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 3. CALCULATE MONTHLY BALANCE
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_monthly_balance(
  p_organization_name text
)
RETURNS integer AS $$
DECLARE
  v_monthly_cap integer;
  v_used_this_month integer;
BEGIN
  v_monthly_cap := calculate_monthly_cap(p_organization_name);
  
  SELECT used_text_this_month
  INTO v_used_this_month
  FROM organization_token_balances
  WHERE organization_name = p_organization_name;
  
  -- Monthly balance = max(0, monthly_cap - used_this_month)
  RETURN GREATEST(0, v_monthly_cap - COALESCE(v_used_this_month, 0));
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. CALCULATE REFILL BALANCE
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_refill_balance(
  p_organization_name text
)
RETURNS integer AS $$
DECLARE
  v_total_refill integer;
BEGIN
  -- Sum all unexpired refills (amount - consumed)
  SELECT COALESCE(SUM(amount - consumed), 0)
  INTO v_total_refill
  FROM token_refills
  WHERE organization_name = p_organization_name
    AND expires_at > now()
    AND consumed < amount;
  
  RETURN v_total_refill;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. CALCULATE TOTAL PLAN BALANCE
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_total_plan_balance(
  p_organization_name text
)
RETURNS bigint AS $$
DECLARE
  v_total_cap bigint;
  v_used_ytd bigint;
  v_refill_balance integer;
  v_ytd_remaining bigint;
BEGIN
  -- Get total cap and used YTD
  SELECT total_token_cap, used_text_total_ytd
  INTO v_total_cap, v_used_ytd
  FROM organization_token_balances
  WHERE organization_name = p_organization_name;
  
  -- Get refill balance
  v_refill_balance := calculate_refill_balance(p_organization_name);
  
  -- YTD remaining
  v_ytd_remaining := GREATEST(0, COALESCE(v_total_cap, 10250000) - COALESCE(v_used_ytd, 0));
  
  -- Total plan balance = max(0, total_cap - used_ytd) + refill_balance
  RETURN v_ytd_remaining + v_refill_balance;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 6. CALCULATE IMAGE TOKENS USED
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_image_tokens_used(
  p_organization_name text
)
RETURNS integer AS $$
DECLARE
  v_low_used integer;
  v_med_used integer;
  v_high_used integer;
BEGIN
  SELECT image_low_used, image_med_used, image_high_used
  INTO v_low_used, v_med_used, v_high_used
  FROM organization_token_balances
  WHERE organization_name = p_organization_name;
  
  -- All images are low quality (50 tokens each)
  -- Formula: (low * 50) + (med * 125) + (high * 500)
  RETURN (COALESCE(v_low_used, 0) * 50) + 
         (COALESCE(v_med_used, 0) * 125) + 
         (COALESCE(v_high_used, 0) * 500);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 7. CALCULATE IMAGE TOKENS REMAINING
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_image_tokens_remaining(
  p_organization_name text
)
RETURNS integer AS $$
DECLARE
  v_image_cap integer;
  v_image_used integer;
BEGIN
  SELECT image_token_cap
  INTO v_image_cap
  FROM organization_token_balances
  WHERE organization_name = p_organization_name;
  
  v_image_used := calculate_image_tokens_used(p_organization_name);
  
  -- Image tokens remaining = max(0, cap - used)
  RETURN GREATEST(0, COALESCE(v_image_cap, 250000) - v_image_used);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 8. GET TOKEN METRICS (ALL IN ONE CALL)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_token_metrics(
  p_organization_name text DEFAULT 'Pencils of Promise'
)
RETURNS TABLE (
  -- Organization Info
  organization_name text,
  total_token_cap bigint,
  
  -- Text Token Metrics
  used_text_today integer,
  used_text_this_month integer,
  used_text_total_ytd bigint,
  
  -- Calculated Balances
  rollover_tokens integer,
  monthly_cap integer,
  monthly_balance integer,
  refill_balance integer,
  total_plan_balance bigint,
  tokens_remaining bigint,
  
  -- Image Metrics
  image_low_count integer,
  image_med_count integer,
  image_high_count integer,
  image_tokens_used integer,
  image_tokens_remaining integer,
  image_token_cap integer,
  
  -- Percentage Metrics
  daily_usage_percent numeric,
  monthly_usage_percent numeric,
  ytd_usage_percent numeric,
  image_usage_percent numeric
) AS $$
DECLARE
  v_org organization_token_balances%ROWTYPE;
  v_rollover integer;
  v_monthly_cap integer;
  v_monthly_balance integer;
  v_refill_balance integer;
  v_total_plan_balance bigint;
  v_image_tokens_used integer;
  v_image_tokens_remaining integer;
BEGIN
  -- Get organization record
  SELECT * INTO v_org
  FROM organization_token_balances otb
  WHERE otb.organization_name = p_organization_name;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found: %', p_organization_name;
  END IF;
  
  -- Calculate derived metrics
  v_rollover := calculate_rollover_tokens(p_organization_name);
  v_monthly_cap := calculate_monthly_cap(p_organization_name);
  v_monthly_balance := calculate_monthly_balance(p_organization_name);
  v_refill_balance := calculate_refill_balance(p_organization_name);
  v_total_plan_balance := calculate_total_plan_balance(p_organization_name);
  v_image_tokens_used := calculate_image_tokens_used(p_organization_name);
  v_image_tokens_remaining := calculate_image_tokens_remaining(p_organization_name);
  
  RETURN QUERY SELECT
    v_org.organization_name,
    v_org.total_token_cap,
    v_org.used_text_today,
    v_org.used_text_this_month,
    v_org.used_text_total_ytd,
    v_rollover,
    v_monthly_cap,
    v_monthly_balance,
    v_refill_balance,
    v_total_plan_balance,
    (v_org.total_token_cap - v_org.used_text_total_ytd)::bigint,
    v_org.image_low_used,
    v_org.image_med_used,
    v_org.image_high_used,
    v_image_tokens_used,
    v_image_tokens_remaining,
    v_org.image_token_cap,
    ROUND((v_org.used_text_today::numeric / 30000::numeric) * 100, 2),
    ROUND((v_org.used_text_this_month::numeric / v_monthly_cap::numeric) * 100, 2),
    ROUND((v_org.used_text_total_ytd::numeric / v_org.total_token_cap::numeric) * 100, 2),
    ROUND((v_image_tokens_used::numeric / v_org.image_token_cap::numeric) * 100, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 9. GET USER TOKEN USAGE DETAILS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_token_usage_details(
  p_organization_name text DEFAULT 'Pencils of Promise',
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  user_id uuid,
  user_email text,
  used_text_this_month integer,
  used_text_total_ytd bigint,
  image_count_craft1 integer,
  image_count_craft2 integer,
  total_image_tokens integer,
  last_active_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    utu.user_id,
    COALESCE(up.email, 'Unknown') as user_email,
    utu.used_text_this_month,
    utu.used_text_total_ytd,
    utu.image_count_craft1,
    utu.image_count_craft2,
    ((utu.image_count_craft1 + utu.image_count_craft2) * 50)::integer as total_image_tokens,
    utu.last_active_at
  FROM user_token_usage utu
  LEFT JOIN user_profiles up ON utu.user_id = up.id
  WHERE utu.organization_name = p_organization_name
  ORDER BY utu.used_text_this_month DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 10. ADD TOKEN REFILL (SUPA ADMIN ONLY)
-- ============================================================================

CREATE OR REPLACE FUNCTION add_token_refill(
  p_organization_name text,
  p_amount integer,
  p_expires_at timestamptz,
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_refill_id uuid;
  v_admin_email text;
BEGIN
  -- Verify user is supa_admin
  SELECT email INTO v_admin_email
  FROM auth.users
  JOIN user_profiles ON auth.users.id = user_profiles.id
  WHERE auth.users.id = auth.uid()
    AND user_profiles.team_role = 'supa_admin';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only supa_admin can add token refills';
  END IF;
  
  -- Insert refill
  INSERT INTO token_refills (
    organization_name,
    amount,
    consumed,
    expires_at,
    added_by_user_id,
    notes
  )
  VALUES (
    p_organization_name,
    p_amount,
    0,
    p_expires_at,
    auth.uid(),
    p_notes
  )
  RETURNING id INTO v_refill_id;
  
  -- Log action
  INSERT INTO token_cap_audit_log (
    organization_name,
    action_type,
    admin_user_id,
    admin_email,
    new_value,
    details
  )
  VALUES (
    p_organization_name,
    'refill_added',
    auth.uid(),
    v_admin_email,
    p_amount,
    jsonb_build_object(
      'refill_id', v_refill_id,
      'amount', p_amount,
      'expires_at', p_expires_at,
      'notes', p_notes
    )
  );
  
  RETURN v_refill_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. ADJUST TOKEN CAP (SUPA ADMIN ONLY)
-- ============================================================================

CREATE OR REPLACE FUNCTION adjust_token_cap(
  p_organization_name text,
  p_new_cap bigint
)
RETURNS boolean AS $$
DECLARE
  v_old_cap bigint;
  v_admin_email text;
BEGIN
  -- Verify user is supa_admin
  SELECT email INTO v_admin_email
  FROM auth.users
  JOIN user_profiles ON auth.users.id = user_profiles.id
  WHERE auth.users.id = auth.uid()
    AND user_profiles.team_role = 'supa_admin';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only supa_admin can adjust token cap';
  END IF;
  
  -- Get old cap
  SELECT total_token_cap INTO v_old_cap
  FROM organization_token_balances
  WHERE organization_name = p_organization_name;
  
  -- Update cap
  UPDATE organization_token_balances
  SET total_token_cap = p_new_cap
  WHERE organization_name = p_organization_name;
  
  -- Log action
  INSERT INTO token_cap_audit_log (
    organization_name,
    action_type,
    admin_user_id,
    admin_email,
    old_value,
    new_value,
    details
  )
  VALUES (
    p_organization_name,
    'cap_adjustment',
    auth.uid(),
    v_admin_email,
    v_old_cap,
    p_new_cap,
    jsonb_build_object(
      'old_cap', v_old_cap,
      'new_cap', p_new_cap
    )
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 12. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION calculate_rollover_tokens IS 'Calculate rollover tokens from previous month (max 833,333)';
COMMENT ON FUNCTION calculate_monthly_cap IS 'Calculate monthly cap: 833,333 + rollover';
COMMENT ON FUNCTION calculate_monthly_balance IS 'Calculate remaining monthly balance';
COMMENT ON FUNCTION calculate_refill_balance IS 'Sum of all unexpired refills (amount - consumed)';
COMMENT ON FUNCTION calculate_total_plan_balance IS 'Total available: max(0, cap - ytd) + refills';
COMMENT ON FUNCTION calculate_image_tokens_used IS 'Image tokens: (low*50) + (med*125) + (high*500)';
COMMENT ON FUNCTION calculate_image_tokens_remaining IS 'Image tokens remaining: max(0, 250000 - used)';
COMMENT ON FUNCTION get_token_metrics IS 'Get all token metrics in one call';
COMMENT ON FUNCTION get_user_token_usage_details IS 'Get detailed user token usage with email';
COMMENT ON FUNCTION add_token_refill IS 'Add token refill (supa_admin only)';
COMMENT ON FUNCTION adjust_token_cap IS 'Adjust organization token cap (supa_admin only)';