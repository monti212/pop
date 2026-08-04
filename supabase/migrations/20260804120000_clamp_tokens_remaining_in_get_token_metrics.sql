/*
  # Clamp tokens_remaining in get_token_metrics and make it refill-aware

  `get_token_metrics` returned `tokens_remaining` as a bare subtraction:

      (v_org.total_token_cap - v_org.used_text_total_ytd)::bigint

  Unclamped and blind to refills. For Pencils of Promise on 2026-08-04 that is
  10,250,000 - 15,413,590 = **-5,163,590**, returned by the database itself — while
  the very same result row reports total_plan_balance = 10,000,000, reflecting a
  live 10M refill added 2026-07-31 that this column simply ignores. Two columns in
  one result set disagreeing by 15M is a trap for whoever picks the wrong one.

  Every sibling calculation already clamps: calculate_monthly_balance,
  calculate_total_plan_balance and calculate_image_tokens_remaining all use
  GREATEST(0, ...). This column was the lone exception.

  tokens_remaining now mirrors total_plan_balance: GREATEST(0, cap - ytd) +
  unexpired refills. Overage remains fully visible through used_text_total_ytd and
  ytd_usage_percent (150.38% today), so clamping conceals nothing — it only stops
  "remaining" reporting a negative quantity of something that cannot go negative.

  This is a verbatim copy of the deployed definition (pg_get_functiondef,
  2026-08-04) with exactly ONE line changed, marked below. Volatility (STABLE),
  search_path, and the absence of SECURITY DEFINER are preserved deliberately —
  do not add SECURITY DEFINER here, the function is called with caller rights.

  Deliberately NOT changed, to keep the diff to one line — both are pre-existing
  and worth separate fixes:
    - daily_usage_percent divides by a literal 1000000 rather than daily_token_cap
    - no NULLIF guards on the percentage divisors
*/

CREATE OR REPLACE FUNCTION public.get_token_metrics(p_organization_name text DEFAULT 'Pencils of Promise'::text)
 RETURNS TABLE(organization_name text, total_token_cap bigint, used_text_today integer, used_text_this_month integer, used_text_total_ytd bigint, rollover_tokens integer, monthly_cap integer, monthly_balance integer, refill_balance integer, total_plan_balance bigint, tokens_remaining bigint, image_low_count integer, image_med_count integer, image_high_count integer, image_tokens_used integer, image_tokens_remaining integer, image_token_cap integer, daily_usage_percent numeric, monthly_usage_percent numeric, ytd_usage_percent numeric, image_usage_percent numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  SELECT * INTO v_org
  FROM organization_token_balances otb
  WHERE otb.organization_name = p_organization_name;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found: %', p_organization_name;
  END IF;

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
    -- THE ONE CHANGED LINE. Was:
    --   (v_org.total_token_cap - v_org.used_text_total_ytd)::bigint
    -- which returned -5,163,590 while total_plan_balance said 10,000,000.
    v_total_plan_balance,
    v_org.image_low_used,
    v_org.image_med_used,
    v_org.image_high_used,
    v_image_tokens_used,
    v_image_tokens_remaining,
    v_org.image_token_cap,
    ROUND((v_org.used_text_today::numeric / 1000000::numeric) * 100, 2),
    ROUND((v_org.used_text_this_month::numeric / v_monthly_cap::numeric) * 100, 2),
    ROUND((v_org.used_text_total_ytd::numeric / v_org.total_token_cap::numeric) * 100, 2),
    ROUND((v_image_tokens_used::numeric / v_org.image_token_cap::numeric) * 100, 2);
END;
$function$;

COMMENT ON FUNCTION public.get_token_metrics IS
  'Organization token metrics. tokens_remaining mirrors total_plan_balance: GREATEST(0, cap - ytd) + unexpired refills. Overage stays visible via used_text_total_ytd and ytd_usage_percent.';
