/*
  # Pinned context (Pencils of Promise + syllabus) + cache-aware metering

  Requirement: U4.0 and U4.3 must ALWAYS carry the Pencils of Promise documents,
  plus the syllabus relevant to the teacher's grade/subject — and that constant
  prefix must be cacheable.

  ## Why this is a separate migration from 20260720000000

  It is additive and stands alone, so it applies cleanly whether or not the model
  registry migration has already been run. (Same rule we're following throughout:
  never edit a migration that may already be applied.)

  ## Fixes a real defect in the existing retrieval path

  `get_relevant_knowledge_base` checks the token budget BEFORE the critical-priority
  check, and uses `EXIT` — so once the budget is hit the ENTIRE loop aborts and every
  remaining document is dropped silently, including 'critical' ones. `priority_level`
  only exempts a doc from the *relevance* threshold, never from the *budget*.
  With max_token_budget defaulting to 1500, one syllabus doc can evict everything.

  `get_pinned_context()` below fixes that:
    - `CONTINUE` instead of `EXIT`  -> one oversized doc cannot evict the rest
    - degrades to a smaller summary tier before dropping a document
    - reports `truncated` / `dropped_count` instead of failing silently
    - gets its own generous budget, so pinned content never competes with
      query-relevant RAG chunks

  ## Cache design

  Prompt caching matches on a stable PREFIX; it breaks at the first differing byte.
  Ordering is therefore load-bearing:

      [ system rules ] [ PoP docs (global) ] [ syllabus (grade/subject) ]  <- cacheable
      [ RAG chunks ] [ user personalisation ] [ date, conversation ]       <- variable

  Globally-constant PoP documents are emitted FIRST so the shared prefix is as long
  as possible across all users; grade-scoped syllabus follows, yielding one cache
  entry per grade+subject cohort. Ordering is fully deterministic
  (always_include DESC, pinned_order, id) so the prefix is byte-stable.

  `fingerprint` lets the edge function detect when an admin edit changes the prefix
  (an expected, explainable cache miss) rather than guessing why hit-rate dropped.

  NOTE: do NOT inject a per-second timestamp before the cache boundary. Day-level
  granularity only, and only in the variable segment.
*/

-- ============================================================================
-- 1. PINNED FLAGS ON KNOWLEDGE DOCUMENTS
--    There was previously no way to mark "this is a Pencils of Promise core doc".
-- ============================================================================

ALTER TABLE admin_knowledge_documents
  ADD COLUMN IF NOT EXISTS always_include boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_order   integer NOT NULL DEFAULT 100;

COMMENT ON COLUMN admin_knowledge_documents.always_include IS
  'Core Pencils of Promise documents: injected into EVERY request regardless of relevance scoring. Kept in the cacheable prompt prefix.';
COMMENT ON COLUMN admin_knowledge_documents.pinned_order IS
  'Deterministic ordering within the pinned block. Stable ordering is required for prompt-cache prefix stability.';

CREATE INDEX IF NOT EXISTS admin_knowledge_documents_pinned_idx
  ON admin_knowledge_documents (always_include, pinned_order, id)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS admin_knowledge_documents_syllabus_scope_idx
  ON admin_knowledge_documents (document_type, grade_level, subject)
  WHERE is_active;

-- ============================================================================
-- 2. PINNED CONTEXT RETRIEVAL
--    Guaranteed inclusion, graceful degradation, explicit truncation reporting.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pinned_context(
  p_grade_level text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_max_tokens integer DEFAULT 12000
)
RETURNS jsonb AS $$
DECLARE
  v_rec           record;
  v_docs          jsonb := '[]'::jsonb;
  v_total         integer := 0;
  v_dropped       integer := 0;
  v_degraded      integer := 0;
  v_content       text;
  v_tokens        integer;
  v_tier          text;
  v_fp_input      text := '';
BEGIN
  FOR v_rec IN
    SELECT
      d.id, d.title, d.document_type, d.grade_level, d.subject, d.updated_at,
      d.always_include, d.pinned_order,
      d.standard_summary, d.standard_token_count,
      d.micro_summary,    d.micro_token_count,
      d.ai_summary,       d.original_content
    FROM admin_knowledge_documents d
    WHERE d.is_active
      AND (
            d.always_include                                    -- PoP core: global
         OR (
              d.document_type = 'syllabus'                       -- syllabus: scoped
              AND (p_grade_level IS NULL OR d.grade_level IS NULL
                   OR d.grade_level IN ('All', p_grade_level))
              AND (p_subject IS NULL OR d.subject IS NULL
                   OR d.subject IN ('All', p_subject))
            )
      )
    -- Deterministic + cache-optimal: globally-constant PoP docs first, so the
    -- prefix shared across ALL users is as long as possible.
    ORDER BY d.always_include DESC, d.pinned_order ASC, d.id ASC
  LOOP
    -- Prefer condensed tiers: a pinned block rides on every request, so size matters.
    IF v_rec.standard_summary IS NOT NULL AND length(v_rec.standard_summary) > 0 THEN
      v_content := v_rec.standard_summary;
      v_tokens  := COALESCE(v_rec.standard_token_count, CEIL(length(v_rec.standard_summary) / 4.0)::integer);
      v_tier    := 'standard';
    ELSIF v_rec.micro_summary IS NOT NULL AND length(v_rec.micro_summary) > 0 THEN
      v_content := v_rec.micro_summary;
      v_tokens  := COALESCE(v_rec.micro_token_count, CEIL(length(v_rec.micro_summary) / 4.0)::integer);
      v_tier    := 'micro';
    ELSIF v_rec.ai_summary IS NOT NULL AND length(v_rec.ai_summary) > 0 THEN
      v_content := v_rec.ai_summary;
      v_tokens  := CEIL(length(v_rec.ai_summary) / 4.0)::integer;
      v_tier    := 'ai_summary';
    ELSE
      v_content := COALESCE(v_rec.original_content, '');
      v_tokens  := CEIL(length(COALESCE(v_rec.original_content, '')) / 4.0)::integer;
      v_tier    := 'original';
    END IF;

    -- Over budget: degrade to micro before giving up on the document.
    IF v_total + v_tokens > p_max_tokens
       AND v_tier <> 'micro'
       AND v_rec.micro_summary IS NOT NULL
       AND length(v_rec.micro_summary) > 0 THEN
      v_content  := v_rec.micro_summary;
      v_tokens   := COALESCE(v_rec.micro_token_count, CEIL(length(v_rec.micro_summary) / 4.0)::integer);
      v_tier     := 'micro';
      v_degraded := v_degraded + 1;
    END IF;

    -- Still over budget: skip THIS doc only. Never EXIT — that is the bug in
    -- get_relevant_knowledge_base which silently discards everything downstream.
    IF v_total + v_tokens > p_max_tokens THEN
      v_dropped := v_dropped + 1;
      CONTINUE;
    END IF;

    v_total := v_total + v_tokens;

    v_docs := v_docs || jsonb_build_object(
      'id',            v_rec.id,
      'title',         v_rec.title,
      'document_type', v_rec.document_type,
      'grade_level',   v_rec.grade_level,
      'subject',       v_rec.subject,
      'pinned',        v_rec.always_include,
      'tier',          v_tier,
      'tokens',        v_tokens,
      'content',       v_content
    );

    -- Fingerprint covers identity AND revision, so an admin edit is a visible,
    -- explainable cache bust rather than an unexplained hit-rate drop.
    v_fp_input := v_fp_input || v_rec.id::text || ':' || v_tier || ':'
                  || COALESCE(EXTRACT(EPOCH FROM v_rec.updated_at)::bigint::text, '0') || '|';
  END LOOP;

  RETURN jsonb_build_object(
    'documents',     v_docs,
    'document_count', jsonb_array_length(v_docs),
    'total_tokens',  v_total,
    'max_tokens',    p_max_tokens,
    'truncated',     v_dropped > 0,
    'dropped_count', v_dropped,
    'degraded_count', v_degraded,
    'fingerprint',   md5(v_fp_input),
    'scope', jsonb_build_object('grade_level', p_grade_level, 'subject', p_subject)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION get_pinned_context(text, text, integer) TO service_role, authenticated;

COMMENT ON FUNCTION get_pinned_context IS
  'Returns the always-on prompt prefix: global Pencils of Promise documents + grade/subject-scoped syllabus. Deterministically ordered for prompt-cache stability. Degrades tier before dropping, and reports truncation instead of failing silently.';

-- ============================================================================
-- 3. CACHE-AWARE METERING
--    Cached input tokens are billed far cheaper upstream. Without this the
--    always-on pinned prefix would be charged at full rate on every request.
-- ============================================================================

ALTER TABLE uhuru_model_registry
  ADD COLUMN IF NOT EXISTS cached_credit_weight numeric(6,3) NOT NULL DEFAULT 0.100
    CHECK (cached_credit_weight >= 0);

COMMENT ON COLUMN uhuru_model_registry.cached_credit_weight IS
  'Multiplier applied ON TOP of credit_weight for prompt-cache-hit input tokens. 0.100 = cached input costs 10% of fresh input. Tune to your provider''s cache-read price.';

ALTER TABLE token_usage_metrics
  ADD COLUMN IF NOT EXISTS cached_tokens integer NOT NULL DEFAULT 0 CHECK (cached_tokens >= 0);

COMMENT ON COLUMN token_usage_metrics.cached_tokens IS
  'Portion of tokens_used served from the upstream prompt cache. Billed at credit_weight * cached_credit_weight.';

-- Recreate the recorder with a cached-token dimension.
-- Safe to drop: introduced in 20260720000000 and not yet in production use.
DROP FUNCTION IF EXISTS record_uhuru_token_usage_v2(uuid, integer, text, text, text, uuid, text);

CREATE OR REPLACE FUNCTION record_uhuru_token_usage_v2(
  p_user_id uuid,
  p_tokens_used integer,
  p_model_key text,
  p_organization_name text DEFAULT 'Pencils of Promise',
  p_request_type text DEFAULT 'chat',
  p_conversation_id uuid DEFAULT NULL,
  p_image_quality text DEFAULT NULL,
  p_cached_tokens integer DEFAULT 0
)
RETURNS jsonb AS $$
DECLARE
  v_tokens        integer := GREATEST(COALESCE(p_tokens_used, 0), 0);
  v_cached        integer;
  v_fresh         integer;
  v_weight        numeric := 1.000;
  v_cached_weight numeric := 0.100;
  v_credits       integer;
  v_full_credits  integer;
  v_is_image      boolean := (COALESCE(p_request_type, 'chat') = 'image');
  v_quality       text := LOWER(COALESCE(p_image_quality, ''));
  v_today         date := CURRENT_DATE;
  v_month         date := date_trunc('month', CURRENT_DATE)::date;
  v_prev_unused   integer;
  v_monthly_cap   bigint;
BEGIN
  IF v_tokens <= 0 THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'no_tokens');
  END IF;

  -- Cached can never exceed total.
  v_cached := LEAST(GREATEST(COALESCE(p_cached_tokens, 0), 0), v_tokens);
  v_fresh  := v_tokens - v_cached;

  SELECT credit_weight, cached_credit_weight
  INTO v_weight, v_cached_weight
  FROM uhuru_model_registry WHERE model_key = p_model_key;
  IF v_weight IS NULL THEN v_weight := 1.000; END IF;
  IF v_cached_weight IS NULL THEN v_cached_weight := 0.100; END IF;

  -- Cached input is discounted relative to fresh, at the same model weighting.
  v_credits      := CEIL((v_fresh * v_weight) + (v_cached * v_weight * v_cached_weight))::integer;
  v_full_credits := CEIL(v_tokens * v_weight)::integer;   -- what it would have cost uncached

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
    UPDATE organization_token_balances
    SET
      used_text_today      = used_text_today      + v_credits,
      used_text_this_month = used_text_this_month + v_credits,
      used_text_total_ytd  = used_text_total_ytd  + v_credits,
      updated_at           = now()
    WHERE organization_name = p_organization_name;
  END IF;

  INSERT INTO token_usage_metrics
    (user_id, conversation_id, tokens_used, cached_tokens, credits_charged,
     model_used, model_key, organization_name, request_type)
  VALUES
    (p_user_id, p_conversation_id, v_tokens, v_cached, v_credits,
     COALESCE(p_model_key, 'unknown'), p_model_key, p_organization_name,
     COALESCE(p_request_type, 'chat'));

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
    'fresh_tokens', v_fresh,
    'cached_tokens', v_cached,
    'credit_weight', v_weight,
    'cached_credit_weight', v_cached_weight,
    'credits_charged', v_credits,
    'credits_saved_by_cache', GREATEST(0, v_full_credits - v_credits),
    'attributed', p_user_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION record_uhuru_token_usage_v2(uuid, integer, text, text, text, uuid, text, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_uhuru_token_usage_v2(uuid, integer, text, text, text, uuid, text, integer) TO service_role;

-- ============================================================================
-- 4. CACHE EFFECTIVENESS REPORTING
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cache_effectiveness(
  p_organization_name text DEFAULT 'Pencils of Promise',
  p_since timestamptz DEFAULT (now() - interval '7 days')
)
RETURNS TABLE (
  model_key text,
  request_count bigint,
  raw_tokens bigint,
  cached_tokens bigint,
  cache_hit_rate numeric,
  credits_charged bigint,
  credits_saved bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(m.model_key, 'unknown'),
    COUNT(*)::bigint,
    COALESCE(SUM(m.tokens_used), 0)::bigint,
    COALESCE(SUM(m.cached_tokens), 0)::bigint,
    CASE WHEN COALESCE(SUM(m.tokens_used), 0) = 0 THEN 0
         ELSE ROUND(100.0 * SUM(m.cached_tokens) / SUM(m.tokens_used), 2) END,
    COALESCE(SUM(m.credits_charged), 0)::bigint,
    COALESCE(SUM(
      CEIL(m.cached_tokens * COALESCE(r.credit_weight, 1.0))
      - CEIL(m.cached_tokens * COALESCE(r.credit_weight, 1.0) * COALESCE(r.cached_credit_weight, 0.1))
    ), 0)::bigint
  FROM token_usage_metrics m
  LEFT JOIN uhuru_model_registry r ON r.model_key = m.model_key
  WHERE (m.organization_name = p_organization_name OR m.organization_name IS NULL)
    AND m.created_at >= p_since
  GROUP BY 1
  ORDER BY 3 DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION get_cache_effectiveness(text, timestamptz) TO service_role, authenticated;
