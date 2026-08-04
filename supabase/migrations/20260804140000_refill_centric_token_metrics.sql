/*
  # Refill-centric token economics in get_token_metrics

  Requested change (2026-08-04): overage beyond the plan cap must NET against
  active refills instead of being clamped away, and the dashboard needs the
  refill pool and lifetime purchases as first-class numbers.

  For Pencils of Promise today (verified by dry-run SELECT against prod
  before installing):

      plan cap           10,250,000
      used YTD           15,413,590   -> overage 5,163,590
      active refill      10,000,000   (purchased 2026-07-31)
      ------------------------------------------------------
      tokens_remaining    4,836,410   = refill - overage  (was clamped to 10,000,000)
      active_refill_pool 10,000,000   = SUM(amount) of unexpired refills still positive
      lifetime_purchased 30,250,000   = cap + SUM(token_purchase_history.tokens_purchased)
      remaining_percent       48.36   = remaining / pool

  Model:
  - overage       = GREATEST(0, ytd - cap), netted against unexpired refills
                    OLDEST FIRST; a refill fully consumed by overage drops out
                    of the pool.
  - pool          = SUM(amount) over unexpired refills whose netted remainder
                    is still positive. Denominator for the balance percentage.
                    Falls back to the plan cap when no refill qualifies (fresh
                    org under cap), so the percentage never divides by zero.
  - tokens_remaining = plan headroom (if under cap) + netted refill remainder.
                    Worked example (matches the requested behaviour): remaining
                    3M on a 10M refill, org buys another 10M -> pool 20M,
                    remaining 13M, 65%.
  - total_plan_balance now equals tokens_remaining (it feeds /supa-admin/live
    as "remaining"; the clamp-then-add semantics it had were what made a 10M
    top-up show as 10M remaining while the org was 5.16M over).
  - lifetime_purchased counts cap + token_purchase_history ONLY. The 2026-07-31
    token_refills row is the operational form of the 2026-06-01 paid pack, not
    an additional purchase - counting refills as well would double-count.
  - ytd_usage_percent deliberately KEEPS its used-vs-cap meaning (150.38%
    today): it is the honest overage indicator. remaining_percent is the new
    balance gauge.

  Return type gains three columns, so DROP + CREATE (CREATE OR REPLACE cannot
  change an OUT table). Columns are appended last; PostgREST clients read by
  name and are unaffected. Function stays STABLE, caller-rights (NO SECURITY
  DEFINER), search_path pinned - same posture as the definition it replaces.
*/

DROP FUNCTION IF EXISTS public.get_token_metrics(text);

CREATE FUNCTION public.get_token_metrics(p_organization_name text DEFAULT 'Pencils of Promise'::text)
 RETURNS TABLE(organization_name text, total_token_cap bigint, used_text_today integer, used_text_this_month integer, used_text_total_ytd bigint, rollover_tokens integer, monthly_cap integer, monthly_balance integer, refill_balance integer, total_plan_balance bigint, tokens_remaining bigint, image_low_count integer, image_med_count integer, image_high_count integer, image_tokens_used integer, image_tokens_remaining integer, image_token_cap integer, daily_usage_percent numeric, monthly_usage_percent numeric, ytd_usage_percent numeric, image_usage_percent numeric, active_refill_pool bigint, lifetime_purchased bigint, remaining_percent numeric)
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
  v_image_tokens_used integer;
  v_image_tokens_remaining integer;
  v_overage bigint;
  v_plan_headroom bigint;
  v_pool bigint;
  v_refill_remaining bigint;
  v_remaining bigint;
  v_lifetime bigint;
  v_denominator bigint;
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
  v_image_tokens_used := calculate_image_tokens_used(p_organization_name);
  v_image_tokens_remaining := calculate_image_tokens_remaining(p_organization_name);

  v_overage       := GREATEST(0, v_org.used_text_total_ytd - v_org.total_token_cap);
  v_plan_headroom := GREATEST(0, v_org.total_token_cap - v_org.used_text_total_ytd);

  -- Net the overage against unexpired refills, oldest first. A refill whose
  -- netted remainder is zero has been fully consumed and leaves the pool.
  SELECT
    COALESCE(SUM(r.amount) FILTER (WHERE r.eff_remaining > 0), 0),
    COALESCE(SUM(r.eff_remaining), 0)
  INTO v_pool, v_refill_remaining
  FROM (
    SELECT tr.amount,
           -- Tie-break beyond purchased_at: two refills inserted in one transaction
           -- share now(), and without a total order the pool (and its percentage)
           -- would depend on physical row order. The summed remainder is
           -- order-independent; the FILTERed pool is not.
           GREATEST(0, tr.amount - GREATEST(0, v_overage
             - COALESCE(SUM(tr.amount) OVER (ORDER BY tr.purchased_at, tr.created_at, tr.id
                 ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0)))::bigint
             AS eff_remaining
    FROM token_refills tr
    WHERE tr.organization_name = p_organization_name
      AND tr.expires_at > now()
  ) r;

  v_remaining := v_plan_headroom + v_refill_remaining;

  SELECT v_org.total_token_cap + COALESCE(SUM(tph.tokens_purchased), 0)
  INTO v_lifetime
  FROM token_purchase_history tph
  WHERE tph.organization_name = p_organization_name;

  v_denominator := CASE WHEN v_pool > 0 THEN v_pool ELSE v_org.total_token_cap END;

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
    v_remaining,
    v_remaining,
    v_org.image_low_used,
    v_org.image_med_used,
    v_org.image_high_used,
    v_image_tokens_used,
    v_image_tokens_remaining,
    v_org.image_token_cap,
    ROUND((v_org.used_text_today::numeric / 1000000::numeric) * 100, 2),
    ROUND((v_org.used_text_this_month::numeric / v_monthly_cap::numeric) * 100, 2),
    ROUND((v_org.used_text_total_ytd::numeric / v_org.total_token_cap::numeric) * 100, 2),
    ROUND((v_image_tokens_used::numeric / v_org.image_token_cap::numeric) * 100, 2),
    v_pool,
    v_lifetime,
    ROUND(100.0 * v_remaining / NULLIF(v_denominator, 0), 2);
END;
$function$;

COMMENT ON FUNCTION public.get_token_metrics IS
  'Refill-centric token metrics. tokens_remaining/total_plan_balance = plan headroom + refills netted against overage (oldest first). active_refill_pool = unexpired refills still positive (percentage denominator). lifetime_purchased = cap + token_purchase_history. ytd_usage_percent keeps used-vs-cap semantics as the overage indicator.';
