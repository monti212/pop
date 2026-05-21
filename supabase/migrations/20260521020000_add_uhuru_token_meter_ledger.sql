/*
  # Uhuru Token Meter Ledger

  Records completed text and image requests into the token meter tables in one
  transaction. The edge function calls this after successful upstream responses.
*/

CREATE TABLE IF NOT EXISTS organization_token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text REFERENCES organization_token_balances(organization_name) ON DELETE CASCADE NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  tokens_used integer DEFAULT 0 NOT NULL CHECK (tokens_used >= 0),
  text_tokens_used integer DEFAULT 0 NOT NULL CHECK (text_tokens_used >= 0),
  image_tokens_used integer DEFAULT 0 NOT NULL CHECK (image_tokens_used >= 0),
  request_count integer DEFAULT 0 NOT NULL CHECK (request_count >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (organization_name, usage_date)
);

CREATE INDEX IF NOT EXISTS organization_token_usage_org_date_idx
  ON organization_token_usage(organization_name, usage_date DESC);

ALTER TABLE organization_token_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view organization token usage" ON organization_token_usage;
CREATE POLICY "Admins can view organization token usage"
  ON organization_token_usage FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'admin', 'supa_admin')
    )
  );

CREATE OR REPLACE FUNCTION record_uhuru_token_usage(
  p_user_id uuid,
  p_tokens_used integer,
  p_organization_name text DEFAULT 'Pencils of Promise',
  p_model_used text DEFAULT 'uhuru-2.0',
  p_request_type text DEFAULT 'chat',
  p_conversation_id uuid DEFAULT NULL,
  p_image_quality text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_month date := date_trunc('month', CURRENT_DATE)::date;
  v_tokens integer := GREATEST(COALESCE(p_tokens_used, 0), 0);
  v_is_image boolean := p_request_type = 'image';
  v_quality text := COALESCE(p_image_quality, 'low');
  v_prev_month_unused integer;
BEGIN
  IF p_user_id IS NULL OR v_tokens <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO organization_token_balances (organization_name)
  VALUES (p_organization_name)
  ON CONFLICT (organization_name) DO NOTHING;

  SELECT GREATEST(0, 833333 - used_text_this_month)
  INTO v_prev_month_unused
  FROM organization_token_balances
  WHERE organization_name = p_organization_name
    AND current_month < v_month;

  UPDATE organization_token_balances
  SET
    used_text_today = CASE
      WHEN last_reset_date < v_today THEN 0
      ELSE used_text_today
    END,
    used_text_this_month = CASE
      WHEN current_month < v_month THEN 0
      ELSE used_text_this_month
    END,
    prev_month_unused = CASE
      WHEN current_month < v_month THEN LEAST(COALESCE(v_prev_month_unused, 0), 833333)
      ELSE prev_month_unused
    END,
    current_month = GREATEST(current_month, v_month),
    last_reset_date = v_today,
    updated_at = now()
  WHERE organization_name = p_organization_name;

  IF v_is_image THEN
    UPDATE organization_token_balances
    SET
      image_low_used = image_low_used + CASE WHEN v_quality = 'low' THEN 1 ELSE 0 END,
      image_med_used = image_med_used + CASE WHEN v_quality IN ('med', 'medium') THEN 1 ELSE 0 END,
      image_high_used = image_high_used + CASE WHEN v_quality = 'high' THEN 1 ELSE 0 END,
      updated_at = now()
    WHERE organization_name = p_organization_name;

    INSERT INTO image_generation_log (
      user_id,
      organization_name,
      model_used,
      quality_level,
      tokens_used
    )
    VALUES (
      p_user_id,
      p_organization_name,
      COALESCE(NULLIF(p_model_used, ''), 'craft-1'),
      CASE WHEN v_quality = 'medium' THEN 'med' ELSE v_quality END,
      v_tokens
    );
  ELSE
    UPDATE organization_token_balances
    SET
      used_text_today = used_text_today + v_tokens,
      used_text_this_month = used_text_this_month + v_tokens,
      used_text_total_ytd = used_text_total_ytd + v_tokens,
      updated_at = now()
    WHERE organization_name = p_organization_name;

    INSERT INTO token_usage_metrics (
      user_id,
      conversation_id,
      tokens_used,
      model_used,
      request_type
    )
    VALUES (
      p_user_id,
      p_conversation_id,
      v_tokens,
      p_model_used,
      p_request_type
    );
  END IF;

  INSERT INTO user_token_usage (
    user_id,
    organization_name,
    used_text_today,
    used_text_this_month,
    used_text_total_ytd,
    image_count_craft1,
    image_count_craft2,
    last_active_at
  )
  VALUES (
    p_user_id,
    p_organization_name,
    CASE WHEN v_is_image THEN 0 ELSE v_tokens END,
    CASE WHEN v_is_image THEN 0 ELSE v_tokens END,
    CASE WHEN v_is_image THEN 0 ELSE v_tokens END,
    CASE WHEN v_is_image AND p_model_used <> 'craft-2' THEN 1 ELSE 0 END,
    CASE WHEN v_is_image AND p_model_used = 'craft-2' THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (user_id, organization_name) DO UPDATE
  SET
    used_text_today = CASE
      WHEN user_token_usage.updated_at::date < v_today THEN EXCLUDED.used_text_today
      ELSE user_token_usage.used_text_today + EXCLUDED.used_text_today
    END,
    used_text_this_month = CASE
      WHEN date_trunc('month', user_token_usage.updated_at)::date < v_month THEN EXCLUDED.used_text_this_month
      ELSE user_token_usage.used_text_this_month + EXCLUDED.used_text_this_month
    END,
    used_text_total_ytd = user_token_usage.used_text_total_ytd + EXCLUDED.used_text_total_ytd,
    image_count_craft1 = user_token_usage.image_count_craft1 + EXCLUDED.image_count_craft1,
    image_count_craft2 = user_token_usage.image_count_craft2 + EXCLUDED.image_count_craft2,
    last_active_at = now(),
    updated_at = now();

  INSERT INTO organization_token_usage (
    organization_name,
    usage_date,
    tokens_used,
    text_tokens_used,
    image_tokens_used,
    request_count
  )
  VALUES (
    p_organization_name,
    v_today,
    v_tokens,
    CASE WHEN v_is_image THEN 0 ELSE v_tokens END,
    CASE WHEN v_is_image THEN v_tokens ELSE 0 END,
    1
  )
  ON CONFLICT (organization_name, usage_date) DO UPDATE
  SET
    tokens_used = organization_token_usage.tokens_used + EXCLUDED.tokens_used,
    text_tokens_used = organization_token_usage.text_tokens_used + EXCLUDED.text_tokens_used,
    image_tokens_used = organization_token_usage.image_tokens_used + EXCLUDED.image_tokens_used,
    request_count = organization_token_usage.request_count + 1,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION record_uhuru_token_usage(uuid, integer, text, text, text, uuid, text) TO service_role;

COMMENT ON FUNCTION record_uhuru_token_usage IS 'Atomic token usage ledger writer for completed Uhuru text and image requests.';
