-- Financial command center RPCs. All SECURITY DEFINER, each raises unless the caller is a supa_admin.
-- Legacy (NULL model_key) is priced against the 'u2.0' pricing row. Credits drive revenue; raw tokens
-- drive COGS. Effective credits = credits_charged when set, else raw_tokens * credit_weight (legacy rows
-- have credits_charged = 0 pre-metering but consumed at weight 1.0) — this reconstructs the real
-- consumption that matches organization_token_balances. (The as-applied history split this across two
-- migrations; consolidated here to the final definitions for clarity/replay.)

CREATE OR REPLACE FUNCTION public.get_financial_overview(
  p_organization_name text DEFAULT 'Pencils of Promise',
  p_since timestamptz DEFAULT (now() - interval '30 days')
)
RETURNS TABLE(
  model_key text, display_name text,
  requests bigint, raw_tokens bigint, credits bigint,
  blended_cogs_per_1m numeric, cogs_usd numeric,
  consumption_value_usd numeric, gross_margin_usd numeric, margin_pct numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE v_share numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND team_role='supa_admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT COALESCE(input_token_share,0.30) INTO v_share FROM public.financial_config WHERE id;
  v_share := COALESCE(v_share,0.30);

  RETURN QUERY
  WITH usage AS (
    SELECT COALESCE(m.model_key,'legacy') AS mk,
           COUNT(*)::bigint AS reqs,
           COALESCE(SUM(m.tokens_used),0)::bigint AS raw,
           COALESCE(SUM(CASE WHEN m.credits_charged > 0 THEN m.credits_charged
                             ELSE m.tokens_used * COALESCE(r.credit_weight,1.0) END),0)::bigint AS cred
    FROM token_usage_metrics m
    LEFT JOIN uhuru_model_registry r ON r.model_key = m.model_key
    WHERE (m.organization_name = p_organization_name OR m.organization_name IS NULL)
      AND m.created_at >= p_since
    GROUP BY 1
  ),
  econ AS (
    SELECT u.mk, u.reqs, u.raw, u.cred,
      COALESCE(reg.display_name, CASE WHEN u.mk='legacy' THEN 'Legacy (pre-metering)' ELSE u.mk END) AS dname,
      COALESCE(v_share*pc.cogs_input_per_1m + (1-v_share)*pc.cogs_output_per_1m, 0)::numeric AS blended,
      COALESCE(pc.price_per_1m_credit,100)::numeric AS price
    FROM usage u
    LEFT JOIN pricing_config pc ON pc.model_key = (CASE WHEN u.mk='legacy' THEN 'u2.0' ELSE u.mk END)
    LEFT JOIN uhuru_model_registry reg ON reg.model_key = u.mk
  )
  SELECT e.mk, e.dname, e.reqs, e.raw, e.cred,
    e.blended,
    ((e.raw/1000000.0)*e.blended)::numeric,
    ((e.cred/1000000.0)*e.price)::numeric,
    ((e.cred/1000000.0)*e.price - (e.raw/1000000.0)*e.blended)::numeric,
    (((e.cred/1000000.0)*e.price - (e.raw/1000000.0)*e.blended) / NULLIF((e.cred/1000000.0)*e.price,0) * 100)::numeric
  FROM econ e
  ORDER BY ((e.cred/1000000.0)*e.price) DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.get_cash_summary(
  p_organization_name text DEFAULT 'Pencils of Promise'
)
RETURNS TABLE(purchase_date date, tokens_purchased integer, amount_paid numeric, currency text, notes text, is_complimentary boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND team_role='supa_admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT ph.purchase_date, ph.tokens_purchased, ph.amount_paid, ph.currency, ph.notes, (ph.amount_paid = 0)
  FROM token_purchase_history ph
  WHERE ph.organization_name = p_organization_name
  ORDER BY ph.purchase_date;
END; $$;

CREATE OR REPLACE FUNCTION public.get_financial_projection(
  p_organization_name text DEFAULT 'Pencils of Promise',
  p_window_days integer DEFAULT 30
)
RETURNS TABLE(
  window_days integer,
  credits_per_day numeric, requests_per_day numeric, active_users_window bigint,
  proj_monthly_credits numeric, proj_monthly_value_usd numeric, proj_monthly_cogs_usd numeric, proj_monthly_margin_usd numeric,
  credits_remaining bigint, days_to_exhaustion numeric, usd_to_reup numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE v_share numeric; v_days numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND team_role='supa_admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT COALESCE(input_token_share,0.30) INTO v_share FROM public.financial_config WHERE id;
  v_share := COALESCE(v_share,0.30);
  v_days := GREATEST(p_window_days,1);

  RETURN QUERY
  WITH win AS (
    SELECT m.tokens_used, m.user_id,
           (CASE WHEN m.credits_charged > 0 THEN m.credits_charged
                 ELSE m.tokens_used * COALESCE(r.credit_weight,1.0) END) AS eff_credits,
           (CASE WHEN m.model_key IS NULL THEN 'u2.0' ELSE m.model_key END) AS pk
    FROM token_usage_metrics m
    LEFT JOIN uhuru_model_registry r ON r.model_key = m.model_key
    WHERE (m.organization_name = p_organization_name OR m.organization_name IS NULL)
      AND m.created_at >= now() - (v_days || ' days')::interval
  ),
  agg AS (
    SELECT
      COALESCE(SUM(w.eff_credits),0)::numeric AS cred,
      COUNT(*)::numeric AS reqs,
      COUNT(DISTINCT w.user_id)::bigint AS users,
      COALESCE(SUM((w.tokens_used/1000000.0)*(v_share*pc.cogs_input_per_1m + (1-v_share)*pc.cogs_output_per_1m)),0)::numeric AS cogs,
      COALESCE(SUM((w.eff_credits/1000000.0)*pc.price_per_1m_credit),0)::numeric AS value
    FROM win w LEFT JOIN pricing_config pc ON pc.model_key = w.pk
  ),
  bal AS (
    SELECT GREATEST(0, total_token_cap - used_text_total_ytd)::bigint AS remaining
    FROM organization_token_balances WHERE organization_name = p_organization_name
  )
  SELECT
    p_window_days,
    (agg.cred/v_days), (agg.reqs/v_days), agg.users,
    (agg.cred/v_days*30),
    (agg.value/v_days*30),
    (agg.cogs/v_days*30),
    ((agg.value-agg.cogs)/v_days*30),
    COALESCE(bal.remaining,0),
    CASE WHEN agg.cred/v_days > 0 THEN COALESCE(bal.remaining,0)/(agg.cred/v_days) ELSE NULL END,
    (agg.cred/v_days*30/1000000.0*100)::numeric
  FROM agg LEFT JOIN bal ON true;
END; $$;

CREATE OR REPLACE FUNCTION public.get_financial_trend(
  p_organization_name text DEFAULT 'Pencils of Promise',
  p_days integer DEFAULT 90,
  p_bucket text DEFAULT 'week'
)
RETURNS TABLE(period date, credits bigint, raw_tokens bigint, value_usd numeric, cogs_usd numeric, margin_usd numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE v_share numeric; v_bucket text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND team_role='supa_admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT COALESCE(input_token_share,0.30) INTO v_share FROM public.financial_config WHERE id;
  v_share := COALESCE(v_share,0.30);
  v_bucket := CASE WHEN p_bucket IN ('day','week','month') THEN p_bucket ELSE 'week' END;

  RETURN QUERY
  WITH win AS (
    SELECT date_trunc(v_bucket, m.created_at)::date AS period,
           m.tokens_used,
           (CASE WHEN m.credits_charged > 0 THEN m.credits_charged
                 ELSE m.tokens_used * COALESCE(r.credit_weight,1.0) END) AS eff_credits,
           (CASE WHEN m.model_key IS NULL THEN 'u2.0' ELSE m.model_key END) AS pk
    FROM token_usage_metrics m
    LEFT JOIN uhuru_model_registry r ON r.model_key = m.model_key
    WHERE (m.organization_name = p_organization_name OR m.organization_name IS NULL)
      AND m.created_at >= now() - (GREATEST(p_days,1) || ' days')::interval
  )
  SELECT w.period,
    SUM(w.eff_credits)::bigint,
    SUM(w.tokens_used)::bigint,
    SUM((w.eff_credits/1000000.0)*pc.price_per_1m_credit)::numeric,
    SUM((w.tokens_used/1000000.0)*(v_share*pc.cogs_input_per_1m + (1-v_share)*pc.cogs_output_per_1m))::numeric,
    (SUM((w.eff_credits/1000000.0)*pc.price_per_1m_credit) - SUM((w.tokens_used/1000000.0)*(v_share*pc.cogs_input_per_1m + (1-v_share)*pc.cogs_output_per_1m)))::numeric
  FROM win w LEFT JOIN pricing_config pc ON pc.model_key = w.pk
  GROUP BY w.period ORDER BY w.period;
END; $$;

REVOKE EXECUTE ON FUNCTION public.get_financial_overview(text, timestamptz)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_cash_summary(text)                     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_financial_projection(text, integer)    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_financial_trend(text, integer, text)   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_financial_overview(text, timestamptz)  TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_cash_summary(text)                     TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_financial_projection(text, integer)    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_financial_trend(text, integer, text)   TO authenticated;
