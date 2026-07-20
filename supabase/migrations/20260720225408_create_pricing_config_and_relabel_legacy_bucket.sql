-- 2a. Finance-owned pricing config (moves COGS/price out of the frontend bundle).
--     COGS is per RAW token; customer price is per CREDIT (weighting is the price differentiation).
CREATE TABLE IF NOT EXISTS public.pricing_config (
  model_key            text PRIMARY KEY REFERENCES public.uhuru_model_registry(model_key) ON UPDATE CASCADE,
  cogs_per_1m_raw      numeric(12,4) NOT NULL DEFAULT 0.2950,
  price_per_1m_credit  numeric(12,4) NOT NULL DEFAULT 8.0000,
  updated_at           timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pricing_config IS 'Per-model economics. cogs_per_1m_raw = internal cost per 1M RAW tokens; price_per_1m_credit = customer price per 1M CREDITS. Finance owns these values.';

-- Seed one row per known model with the current global constants (0.295 COGS / $8 price).
INSERT INTO public.pricing_config (model_key, cogs_per_1m_raw, price_per_1m_credit)
SELECT model_key, 0.2950, 8.0000 FROM public.uhuru_model_registry
ON CONFLICT (model_key) DO NOTHING;

-- Admin-only read (COGS/margin is sensitive). Mirrors the app's isAdmin team_roles.
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pricing_config_admin_read ON public.pricing_config;
CREATE POLICY pricing_config_admin_read ON public.pricing_config
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.team_role IN ('supa_admin','optimus_prime','admin','prime')
  ));

-- 2b. Relabel the NULL model_key bucket from 'unknown' -> 'legacy' (pre-metering rows),
--     so it doesn't collide conceptually with the "Unknown" user bug. Signature unchanged.
CREATE OR REPLACE FUNCTION public.get_model_usage_breakdown(
  p_organization_name text DEFAULT 'Pencils of Promise'::text,
  p_since timestamp with time zone DEFAULT (now() - '30 days'::interval)
)
RETURNS TABLE(
  model_key text,
  display_name text,
  category text,
  credit_weight numeric,
  request_count bigint,
  raw_tokens bigint,
  credits_charged bigint,
  unique_users bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(m.model_key, 'legacy'),
    COALESCE(r.display_name, 'Legacy (pre-metering)'),
    COALESCE(r.category, 'legacy'),
    COALESCE(r.credit_weight, 1.000),
    COUNT(*)::bigint,
    COALESCE(SUM(m.tokens_used), 0)::bigint,
    COALESCE(SUM(m.credits_charged), 0)::bigint,
    COUNT(DISTINCT m.user_id)::bigint
  FROM token_usage_metrics m
  LEFT JOIN uhuru_model_registry r ON r.model_key = m.model_key
  WHERE (m.organization_name = p_organization_name OR m.organization_name IS NULL)
    AND m.created_at >= p_since
  GROUP BY 1, 2, 3, 4
  ORDER BY 7 DESC;
END;
$function$;
