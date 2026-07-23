-- Keep the authorization helper out of the exposed API schema and cover all
-- observability foreign keys used during account cleanup.

CREATE SCHEMA IF NOT EXISTS observability_private;
REVOKE ALL ON SCHEMA observability_private FROM PUBLIC;
REVOKE ALL ON SCHEMA observability_private FROM anon;
GRANT USAGE ON SCHEMA observability_private TO authenticated;

CREATE OR REPLACE FUNCTION observability_private.is_admin()
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

REVOKE ALL ON FUNCTION observability_private.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION observability_private.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION observability_private.is_admin() TO authenticated;

DROP POLICY IF EXISTS "Supa admins can read observability issues" ON public.observability_issues;
CREATE POLICY "Supa admins can read observability issues"
  ON public.observability_issues
  FOR SELECT
  TO authenticated
  USING ((SELECT observability_private.is_admin()));

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
  IF NOT observability_private.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_status NOT IN ('open', 'investigating', 'resolved', 'ignored', 'observed', 'regressed') THEN
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

DROP FUNCTION IF EXISTS public.is_observability_admin();

CREATE INDEX IF NOT EXISTS observability_issues_latest_user_idx
  ON public.observability_issues (latest_user_id);
CREATE INDEX IF NOT EXISTS observability_issues_resolved_by_idx
  ON public.observability_issues (resolved_by);
