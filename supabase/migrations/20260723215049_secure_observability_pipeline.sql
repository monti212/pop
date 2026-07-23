-- Privacy-safe, aggregated application observability for the Supa Admin console.
-- Raw console arguments are never stored. The RPC accepts a bounded event contract,
-- sanitizes text again server-side, and aggregates repeated occurrences by fingerprint.

CREATE TABLE IF NOT EXISTS public.observability_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL,
  title text NOT NULL,
  summary text,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category text NOT NULL CHECK (category IN (
    'runtime', 'network', 'database', 'authentication', 'validation', 'performance', 'system', 'unknown'
  )),
  source text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('development', 'production')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'ignored', 'observed', 'regressed')),
  occurrence_count bigint NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  latest_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  latest_route text,
  latest_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  sample_stack text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fingerprint, environment)
);

CREATE INDEX IF NOT EXISTS observability_issues_triage_idx
  ON public.observability_issues (status, severity, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS observability_issues_source_idx
  ON public.observability_issues (source, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS observability_issues_assigned_idx
  ON public.observability_issues (assigned_to, status);

ALTER TABLE public.observability_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observability_issues FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_observability_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND team_role = 'supa_admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_observability_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_observability_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_observability_admin() TO authenticated;

DROP POLICY IF EXISTS "Supa admins can read observability issues" ON public.observability_issues;
CREATE POLICY "Supa admins can read observability issues"
  ON public.observability_issues
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_observability_admin()));

REVOKE ALL ON public.observability_issues FROM anon;
REVOKE ALL ON public.observability_issues FROM authenticated;
GRANT SELECT ON public.observability_issues TO authenticated;

CREATE OR REPLACE FUNCTION public.sanitize_observability_text(
  p_value text,
  p_limit integer DEFAULT 1000
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_value text;
BEGIN
  IF p_value IS NULL THEN
    RETURN NULL;
  END IF;

  v_value := left(p_value, greatest(0, least(coalesce(p_limit, 1000), 4000)));
  v_value := regexp_replace(v_value, '(?i)bearer[[:space:]]+[A-Za-z0-9._~+/=-]+', '[credential redacted]', 'g');
  v_value := regexp_replace(v_value, 'eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}', '[credential redacted]', 'g');
  v_value := regexp_replace(v_value, '(?i)(token|secret|password|api[_ -]?key|authorization)[[:space:]]*[:=][[:space:]]*[^[:space:],;]+', '\1=[redacted]', 'g');
  v_value := regexp_replace(v_value, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}', '[email redacted]', 'g');
  v_value := regexp_replace(v_value, 'https?://[^[:space:]]+', '[internal location redacted]', 'g');
  v_value := regexp_replace(v_value, '(?i)(supabase|sentry|openai|anthropic|google|azure|aws)', 'Uhuru Cloud', 'g');
  RETURN v_value;
END;
$$;

REVOKE ALL ON FUNCTION public.sanitize_observability_text(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sanitize_observability_text(text, integer) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_observability_issue(
  p_fingerprint text,
  p_title text,
  p_summary text,
  p_severity text,
  p_category text,
  p_source text,
  p_environment text,
  p_route text DEFAULT NULL,
  p_context jsonb DEFAULT '{}'::jsonb,
  p_stack text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_id uuid;
  v_context jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF length(coalesce(p_fingerprint, '')) < 8 OR length(p_fingerprint) > 96 THEN
    RAISE EXCEPTION 'invalid event fingerprint';
  END IF;
  IF p_severity NOT IN ('low', 'medium', 'high', 'critical')
    OR p_category NOT IN ('runtime', 'network', 'database', 'authentication', 'validation', 'performance', 'system', 'unknown')
    OR p_environment NOT IN ('development', 'production') THEN
    RAISE EXCEPTION 'invalid event classification';
  END IF;

  -- Bound distinct-issue creation per actor. Repeated occurrences still aggregate.
  IF NOT EXISTS (
    SELECT 1 FROM public.observability_issues
    WHERE fingerprint = p_fingerprint AND environment = p_environment
  ) AND (
    SELECT count(*)
    FROM public.observability_issues
    WHERE latest_user_id = v_actor
      AND first_seen_at > now() - interval '1 hour'
  ) >= 60 THEN
    RETURN NULL;
  END IF;

  v_context := jsonb_strip_nulls(jsonb_build_object(
    'action', public.sanitize_observability_text(p_context->>'action', 120),
    'component', public.sanitize_observability_text(p_context->>'component', 120),
    'errorName', public.sanitize_observability_text(p_context->>'errorName', 80),
    'httpStatus', CASE
      WHEN (p_context->>'httpStatus') ~ '^[0-9]{3}$' THEN (p_context->>'httpStatus')::integer
      ELSE NULL
    END,
    'release', public.sanitize_observability_text(p_context->>'release', 80),
    'viewport', public.sanitize_observability_text(p_context->>'viewport', 40)
  ));

  INSERT INTO public.observability_issues (
    fingerprint, title, summary, severity, category, source, environment,
    latest_user_id, latest_route, latest_context, sample_stack
  ) VALUES (
    left(p_fingerprint, 96),
    coalesce(public.sanitize_observability_text(p_title, 180), 'Application issue'),
    public.sanitize_observability_text(p_summary, 600),
    p_severity,
    p_category,
    coalesce(public.sanitize_observability_text(p_source, 100), 'application'),
    p_environment,
    v_actor,
    public.sanitize_observability_text(p_route, 200),
    v_context,
    public.sanitize_observability_text(p_stack, 3000)
  )
  ON CONFLICT (fingerprint, environment) DO UPDATE SET
    occurrence_count = public.observability_issues.occurrence_count + 1,
    last_seen_at = now(),
    latest_user_id = excluded.latest_user_id,
    latest_route = excluded.latest_route,
    latest_context = excluded.latest_context,
    sample_stack = coalesce(excluded.sample_stack, public.observability_issues.sample_stack),
    severity = CASE
      WHEN array_position(ARRAY['low','medium','high','critical'], excluded.severity)
        > array_position(ARRAY['low','medium','high','critical'], public.observability_issues.severity)
      THEN excluded.severity
      ELSE public.observability_issues.severity
    END,
    status = CASE
      WHEN public.observability_issues.status = 'resolved'
        AND public.observability_issues.resolved_at < now() - interval '10 minutes'
      THEN 'regressed'
      ELSE public.observability_issues.status
    END,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_observability_issue(text,text,text,text,text,text,text,text,jsonb,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_observability_issue(text,text,text,text,text,text,text,text,jsonb,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_observability_issue(text,text,text,text,text,text,text,text,jsonb,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.manage_observability_issue(
  p_id uuid,
  p_status text,
  p_resolution_notes text DEFAULT NULL,
  p_assignment text DEFAULT 'keep'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF NOT public.is_observability_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_status NOT IN ('open', 'investigating', 'resolved', 'ignored', 'regressed') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  IF p_assignment NOT IN ('keep', 'claim', 'unassign') THEN
    RAISE EXCEPTION 'invalid assignment';
  END IF;

  UPDATE public.observability_issues
  SET status = p_status,
      assigned_to = CASE
        WHEN p_assignment = 'claim' THEN v_actor
        WHEN p_assignment = 'unassign' THEN NULL
        ELSE assigned_to
      END,
      resolution_notes = public.sanitize_observability_text(p_resolution_notes, 1200),
      resolved_by = CASE WHEN p_status = 'resolved' THEN v_actor ELSE NULL END,
      resolved_at = CASE WHEN p_status = 'resolved' THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.manage_observability_issue(uuid,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.manage_observability_issue(uuid,text,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.manage_observability_issue(uuid,text,text,text) TO authenticated;

COMMENT ON TABLE public.observability_issues IS
  'Privacy-safe aggregated operational issues. Readable and manageable only by Supa Admin.';
