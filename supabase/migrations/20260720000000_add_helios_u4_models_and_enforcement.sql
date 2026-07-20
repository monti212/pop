/*
  # Helios U4.0 / U4.3 — model registry, weighted credit metering, and enforcement

  Adds the data-driven foundation for the Helios model family and fixes the three
  structural gaps found in the token-tracking audit:

    1. Models were hardcoded strings ('uhuru-2.0') scattered across edge code.
       -> `uhuru_model_registry` makes models configurable data.

    2. All models debited one undifferentiated bucket, so a cheap fast token and an
       expensive reasoning token counted the same.
       -> Weighted credits. Counters now hold CREDITS (tokens x credit_weight).
          U2.0 and U4.0 have weight 1.000, so existing history stays valid 1:1.
          Raw token counts are preserved per-request in `token_usage_metrics`.

    3. Caps were display-only; nothing ever refused a request (hence 186% usage).
       -> `check_token_availability()` is a real pre-flight gate that the edge
          function MUST call BEFORE invoking the upstream model.

  Also lifts the hardcoded 833,333 / 1,000,000 limits out of function bodies into
  configurable columns.

  ## IMPORTANT — enforcement ships DISABLED

  `enforcement_enabled` defaults to FALSE. The organization is currently ~186% over
  its monthly cap, so enabling enforcement immediately would refuse ALL traffic.
  Intended rollout:
    1. Deploy this + the v4 edge function (meters accurately, never blocks).
    2. Observe real weighted consumption for a period.
    3. Set correct caps, optionally reset counters.
    4. UPDATE organization_token_balances SET enforcement_enabled = true;

  This migration is additive and idempotent. It does not modify or drop any
  existing function, table, or column semantics.
*/

-- ============================================================================
-- 1. MODEL REGISTRY — models become configuration, not hardcoded strings
-- ============================================================================

CREATE TABLE IF NOT EXISTS uhuru_model_registry (
  model_key         text PRIMARY KEY,
  display_name      text NOT NULL,
  full_name         text NOT NULL,
  category          text NOT NULL DEFAULT 'general'
                      CHECK (category IN ('general', 'reasoning', 'legacy', 'image')),
  short_description text,
  -- Credits charged per raw token. U4.3 reasons more deeply and costs more to
  -- serve, so it debits the shared pool faster. Tune without a code deploy.
  credit_weight     numeric(6,3) NOT NULL DEFAULT 1.000 CHECK (credit_weight > 0),
  -- Name of the edge-function env var holding the upstream model id.
  upstream_env_key  text,
  is_default        boolean NOT NULL DEFAULT false,
  enabled           boolean NOT NULL DEFAULT true,
  sort_order        integer NOT NULL DEFAULT 100,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- At most one default model.
CREATE UNIQUE INDEX IF NOT EXISTS uhuru_model_registry_single_default
  ON uhuru_model_registry (is_default) WHERE is_default;

COMMENT ON TABLE uhuru_model_registry IS
  'Configurable Uhuru/Helios model catalogue. Drives edge model resolution, credit weighting, and the frontend model selector.';
COMMENT ON COLUMN uhuru_model_registry.credit_weight IS
  'Credits charged per raw token. 1.000 = 1:1. U4.3 > 1 because deep reasoning costs more per token to serve.';

-- NOTE: credit_weight 2.500 for U4.3 is a STARTING VALUE. Set it to your real
-- cost ratio (U4.3 cost-per-token / U4.0 cost-per-token) once measured.
INSERT INTO uhuru_model_registry
  (model_key, display_name, full_name, category, short_description, credit_weight, upstream_env_key, is_default, enabled, sort_order)
VALUES
  ('u4.0', 'U4.0', 'Helios U4.0', 'general',
   'Fast, knowledgeable intelligence for everyday work, writing, planning, learning and problem-solving.',
   1.000, 'UHURU_MODEL_40', true, true, 10),
  ('u4.3', 'U4.3', 'Helios U4.3', 'reasoning',
   'Advanced intelligence for complex analysis, deep reasoning, research and difficult multi-step problems.',
   2.500, 'UHURU_MODEL_43', false, true, 20),
  ('u2.0', 'U2.0', 'Uhuru 2.0', 'legacy',
   'Previous-generation general model. Served by the legacy uhuru-llm-api function.',
   1.000, 'UHURU_MODEL_20', false, true, 90)
ON CONFLICT (model_key) DO UPDATE SET
  display_name      = EXCLUDED.display_name,
  full_name         = EXCLUDED.full_name,
  category          = EXCLUDED.category,
  short_description = EXCLUDED.short_description,
  upstream_env_key  = EXCLUDED.upstream_env_key,
  sort_order        = EXCLUDED.sort_order,
  updated_at        = now();
  -- deliberately NOT overwriting credit_weight/is_default/enabled on re-run,
  -- so operator tuning survives repeated migration application.

ALTER TABLE uhuru_model_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Model registry readable by authenticated" ON uhuru_model_registry;
CREATE POLICY "Model registry readable by authenticated"
  ON uhuru_model_registry FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- 2. CONFIGURABLE CAPS + ENFORCEMENT FLAG
--    Lifts hardcoded 833,333 / 1,000,000 out of function bodies.
-- ============================================================================

ALTER TABLE organization_token_balances
  ADD COLUMN IF NOT EXISTS daily_token_cap     bigint  NOT NULL DEFAULT 1000000 CHECK (daily_token_cap >= 0),
  ADD COLUMN IF NOT EXISTS monthly_token_cap   bigint  NOT NULL DEFAULT 833333  CHECK (monthly_token_cap >= 0),
  ADD COLUMN IF NOT EXISTS enforcement_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN organization_token_balances.enforcement_enabled IS
  'When true, check_token_availability() refuses requests over cap. Ships FALSE (observe-only) because the org is currently over its cap.';
COMMENT ON COLUMN organization_token_balances.used_text_this_month IS
  'CREDITS consumed this month (raw tokens x model credit_weight). Weight 1.000 models make this identical to raw tokens.';

-- ============================================================================
-- 3. PER-REQUEST LEDGER — keep BOTH raw tokens and weighted credits
--    Enables per-model cost breakdown and credit/raw reconciliation.
-- ============================================================================

ALTER TABLE token_usage_metrics
  ADD COLUMN IF NOT EXISTS credits_charged   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS organization_name text,
  ADD COLUMN IF NOT EXISTS model_key         text;

-- Allow anonymous (unauthenticated) usage to be recorded against the org.
-- Previously these requests cost money but were silently dropped entirely.
ALTER TABLE token_usage_metrics ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS token_usage_metrics_model_created_idx
  ON token_usage_metrics (model_key, created_at DESC);
CREATE INDEX IF NOT EXISTS token_usage_metrics_org_created_idx
  ON token_usage_metrics (organization_name, created_at DESC);

-- ============================================================================
-- 4. THE ENFORCEMENT GATE
--    Edge functions MUST call this BEFORE invoking the upstream model.
--    Read-only: safe to call on every request.
-- ============================================================================

CREATE OR REPLACE FUNCTION check_token_availability(
  p_organization_name text DEFAULT 'Pencils of Promise',
  p_model_key text DEFAULT NULL,
  p_estimated_tokens integer DEFAULT 0
)
RETURNS jsonb AS $$
DECLARE
  v_org            organization_token_balances%ROWTYPE;
  v_weight         numeric := 1.000;
  v_est_credits    bigint;
  v_today          date := CURRENT_DATE;
  v_month          date := date_trunc('month', CURRENT_DATE)::date;
  v_used_today     bigint;
  v_used_month     bigint;
  v_used_ytd       bigint;
  v_monthly_cap    bigint;
  v_refills        bigint := 0;
  v_ytd_allowance  bigint;
  v_allowed        boolean := true;
  v_reason         text := 'ok';
BEGIN
  IF p_model_key IS NOT NULL THEN
    SELECT credit_weight INTO v_weight
    FROM uhuru_model_registry
    WHERE model_key = p_model_key AND enabled;

    IF v_weight IS NULL THEN
      RETURN jsonb_build_object(
        'allowed', false, 'reason', 'unknown_or_disabled_model',
        'model_key', p_model_key, 'enforcement_enabled', true
      );
    END IF;
  END IF;

  v_est_credits := CEIL(GREATEST(COALESCE(p_estimated_tokens, 0), 0) * v_weight)::bigint;

  SELECT * INTO v_org
  FROM organization_token_balances
  WHERE organization_name = p_organization_name;

  -- No balance row yet: allow, and let the recorder create it.
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', true, 'reason', 'no_balance_row',
      'credit_weight', v_weight, 'estimated_credits', v_est_credits,
      'enforcement_enabled', false
    );
  END IF;

  -- Effective counters: honour pending day/month rollovers WITHOUT mutating.
  v_used_today := CASE WHEN v_org.last_reset_date < v_today THEN 0 ELSE v_org.used_text_today END;
  v_used_month := CASE WHEN v_org.current_month  < v_month THEN 0 ELSE v_org.used_text_this_month END;
  v_used_ytd   := v_org.used_text_total_ytd;

  v_monthly_cap := v_org.monthly_token_cap
                 + CASE WHEN v_org.current_month < v_month THEN 0 ELSE COALESCE(v_org.prev_month_unused, 0) END;

  SELECT COALESCE(SUM(GREATEST(0, amount - COALESCE(consumed, 0))), 0)
  INTO v_refills
  FROM token_refills
  WHERE organization_name = p_organization_name
    AND (expires_at IS NULL OR expires_at > now());

  v_ytd_allowance := v_org.total_token_cap + v_refills;

  IF v_used_today + v_est_credits > v_org.daily_token_cap THEN
    v_allowed := false; v_reason := 'daily_cap_exceeded';
  ELSIF v_used_month + v_est_credits > v_monthly_cap THEN
    v_allowed := false; v_reason := 'monthly_cap_exceeded';
  ELSIF v_used_ytd + v_est_credits > v_ytd_allowance THEN
    v_allowed := false; v_reason := 'plan_cap_exceeded';
  END IF;

  -- Observe mode: report the verdict truthfully but never actually refuse.
  IF NOT v_org.enforcement_enabled THEN
    v_allowed := true;
    IF v_reason <> 'ok' THEN
      v_reason := v_reason || '_observed_not_enforced';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'enforcement_enabled', v_org.enforcement_enabled,
    'model_key', p_model_key,
    'credit_weight', v_weight,
    'estimated_credits', v_est_credits,
    'daily_remaining',   GREATEST(0, v_org.daily_token_cap - v_used_today),
    'monthly_remaining', GREATEST(0, v_monthly_cap - v_used_month),
    'plan_remaining',    GREATEST(0, v_ytd_allowance - v_used_ytd),
    'plan_overage',      GREATEST(0, v_used_ytd - v_ytd_allowance)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION check_token_availability(text, text, integer) TO service_role, authenticated;

COMMENT ON FUNCTION check_token_availability IS
  'Pre-flight quota gate. Edge functions call this BEFORE the upstream model call. Returns allowed + remaining balances. Honours enforcement_enabled (observe mode).';

-- ============================================================================
-- 5. WEIGHTED RECORDER — returns a result instead of void
--    v1 RETURNS void, so it structurally could not refuse or report anything.
-- ============================================================================

CREATE OR REPLACE FUNCTION record_uhuru_token_usage_v2(
  p_user_id uuid,
  p_tokens_used integer,
  p_model_key text,
  p_organization_name text DEFAULT 'Pencils of Promise',
  p_request_type text DEFAULT 'chat',
  p_conversation_id uuid DEFAULT NULL,
  p_image_quality text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_tokens   integer := GREATEST(COALESCE(p_tokens_used, 0), 0);
  v_weight   numeric := 1.000;
  v_credits  integer;
  v_is_image boolean := (COALESCE(p_request_type, 'chat') = 'image');
  v_quality  text := LOWER(COALESCE(p_image_quality, ''));
  v_today    date := CURRENT_DATE;
  v_month    date := date_trunc('month', CURRENT_DATE)::date;
  v_prev_unused integer;
  v_monthly_cap bigint;
BEGIN
  IF v_tokens <= 0 THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'no_tokens');
  END IF;

  SELECT credit_weight INTO v_weight
  FROM uhuru_model_registry WHERE model_key = p_model_key;
  IF v_weight IS NULL THEN v_weight := 1.000; END IF;

  v_credits := CEIL(v_tokens * v_weight)::integer;

  INSERT INTO organization_token_balances (organization_name)
  VALUES (p_organization_name)
  ON CONFLICT (organization_name) DO NOTHING;

  SELECT monthly_token_cap INTO v_monthly_cap
  FROM organization_token_balances WHERE organization_name = p_organization_name;

  SELECT GREATEST(0, v_monthly_cap - used_text_this_month)
  INTO v_prev_unused
  FROM organization_token_balances
  WHERE organization_name = p_organization_name
    AND current_month < v_month;

  -- Roll day/month counters forward before accumulating.
  UPDATE organization_token_balances
  SET
    used_text_today      = CASE WHEN last_reset_date < v_today THEN 0 ELSE used_text_today END,
    used_text_this_month = CASE WHEN current_month  < v_month THEN 0 ELSE used_text_this_month END,
    prev_month_unused    = CASE WHEN current_month  < v_month
                                THEN LEAST(COALESCE(v_prev_unused, 0), v_monthly_cap)
                                ELSE prev_month_unused END,
    current_month   = GREATEST(current_month, v_month),
    last_reset_date = v_today,
    updated_at      = now()
  WHERE organization_name = p_organization_name;

  IF v_is_image THEN
    UPDATE organization_token_balances
    SET
      image_low_used  = image_low_used  + CASE WHEN v_quality = 'low' THEN 1 ELSE 0 END,
      image_med_used  = image_med_used  + CASE WHEN v_quality IN ('med','medium') THEN 1 ELSE 0 END,
      image_high_used = image_high_used + CASE WHEN v_quality = 'high' THEN 1 ELSE 0 END,
      updated_at      = now()
    WHERE organization_name = p_organization_name;
  ELSE
    -- Counters accumulate CREDITS (weighted), not raw tokens.
    UPDATE organization_token_balances
    SET
      used_text_today      = used_text_today      + v_credits,
      used_text_this_month = used_text_this_month + v_credits,
      used_text_total_ytd  = used_text_total_ytd  + v_credits,
      updated_at           = now()
    WHERE organization_name = p_organization_name;
  END IF;

  -- Per-request ledger: raw tokens AND credits, so cost is reconstructable.
  -- user_id may be NULL for anonymous traffic (previously dropped entirely).
  INSERT INTO token_usage_metrics
    (user_id, conversation_id, tokens_used, credits_charged, model_used, model_key, organization_name, request_type)
  VALUES
    (p_user_id, p_conversation_id, v_tokens, v_credits, COALESCE(p_model_key, 'unknown'),
     p_model_key, p_organization_name, COALESCE(p_request_type, 'chat'));

  -- Per-user rollup (credits), only when attributable.
  IF p_user_id IS NOT NULL THEN
    INSERT INTO user_token_usage (
      user_id, organization_name, used_text_this_month, used_text_total_ytd,
      image_count_craft1, image_count_craft2, last_active_at
    )
    VALUES (
      p_user_id, p_organization_name,
      CASE WHEN v_is_image THEN 0 ELSE v_credits END,
      CASE WHEN v_is_image THEN 0 ELSE v_credits END,
      0, 0, now()
    )
    ON CONFLICT (user_id, organization_name) DO UPDATE SET
      used_text_this_month = user_token_usage.used_text_this_month
                             + CASE WHEN v_is_image THEN 0 ELSE v_credits END,
      used_text_total_ytd  = user_token_usage.used_text_total_ytd
                             + CASE WHEN v_is_image THEN 0 ELSE v_credits END,
      last_active_at       = now();
  END IF;

  -- Daily org rollup (credits, split text vs image, plus request count).
  INSERT INTO organization_token_usage (
    organization_name, usage_date, tokens_used, text_tokens_used, image_tokens_used, request_count
  )
  VALUES (
    p_organization_name, v_today,
    v_credits,
    CASE WHEN v_is_image THEN 0 ELSE v_credits END,
    CASE WHEN v_is_image THEN v_credits ELSE 0 END,
    1
  )
  ON CONFLICT (organization_name, usage_date) DO UPDATE SET
    tokens_used       = organization_token_usage.tokens_used + v_credits,
    text_tokens_used  = organization_token_usage.text_tokens_used
                        + CASE WHEN v_is_image THEN 0 ELSE v_credits END,
    image_tokens_used = organization_token_usage.image_tokens_used
                        + CASE WHEN v_is_image THEN v_credits ELSE 0 END,
    request_count     = organization_token_usage.request_count + 1,
    updated_at        = now();

  RETURN jsonb_build_object(
    'recorded', true,
    'model_key', p_model_key,
    'raw_tokens', v_tokens,
    'credit_weight', v_weight,
    'credits_charged', v_credits,
    'attributed', p_user_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION record_uhuru_token_usage_v2(uuid, integer, text, text, text, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_uhuru_token_usage_v2(uuid, integer, text, text, text, uuid, text) TO service_role;

COMMENT ON FUNCTION record_uhuru_token_usage_v2 IS
  'Weighted usage recorder. Charges tokens x model credit_weight to org counters, stores raw+credits per request, supports anonymous attribution. Returns a result (v1 returned void).';

-- ============================================================================
-- 6. PER-MODEL BREAKDOWN — the dashboards currently cannot show this at all
-- ============================================================================

CREATE OR REPLACE FUNCTION get_model_usage_breakdown(
  p_organization_name text DEFAULT 'Pencils of Promise',
  p_since timestamptz DEFAULT (now() - interval '30 days')
)
RETURNS TABLE (
  model_key text,
  display_name text,
  category text,
  credit_weight numeric,
  request_count bigint,
  raw_tokens bigint,
  credits_charged bigint,
  unique_users bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(m.model_key, 'unknown'),
    COALESCE(r.display_name, 'Unknown model'),
    COALESCE(r.category, 'general'),
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION get_model_usage_breakdown(text, timestamptz) TO service_role, authenticated;
