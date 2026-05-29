/*
  # Increase Daily Token Limit to 1,000,000

  Updates get_token_metrics daily_usage_percent calculation from 30,000 to 1,000,000.
*/

CREATE OR REPLACE FUNCTION get_token_metrics(
  p_organization_name text DEFAULT 'Pencils of Promise'
)
RETURNS TABLE (
  organization_name text,
  total_token_cap bigint,
  used_text_today integer,
  used_text_this_month integer,
  used_text_total_ytd bigint,
  rollover_tokens integer,
  monthly_cap integer,
  monthly_balance integer,
  refill_balance integer,
  total_plan_balance bigint,
  tokens_remaining bigint,
  image_low_count integer,
  image_med_count integer,
  image_high_count integer,
  image_tokens_used integer,
  image_tokens_remaining integer,
  image_token_cap integer,
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
    (v_org.total_token_cap - v_org.used_text_total_ytd)::bigint,
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
$$ LANGUAGE plpgsql STABLE;

ALTER FUNCTION get_token_metrics SET search_path = public, pg_temp;
