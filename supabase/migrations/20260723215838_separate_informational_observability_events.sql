-- Informational and debug events remain available without entering the active
-- incident queue. Warnings and failures continue to open actionable issues.

ALTER TABLE public.observability_issues
  DROP CONSTRAINT IF EXISTS observability_issues_status_check;
ALTER TABLE public.observability_issues
  ADD CONSTRAINT observability_issues_status_check
  CHECK (status IN ('open', 'investigating', 'resolved', 'ignored', 'observed', 'regressed'));

CREATE OR REPLACE FUNCTION observability_private.classify_new_issue()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.severity = 'low' AND NEW.status = 'open' THEN
    NEW.status := 'observed';
  END IF;
  NEW.sample_stack := (
    SELECT string_agg(
      public.sanitize_observability_text(frame, 250),
      E'\n' ORDER BY position
    )
    FROM unnest(string_to_array(NEW.sample_stack, E'\n')) WITH ORDINALITY AS frames(frame, position)
    WHERE frame ~ '^[[:space:]]*at[[:space:]]'
      AND position <= 16
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION observability_private.classify_new_issue() FROM PUBLIC;
REVOKE ALL ON FUNCTION observability_private.classify_new_issue() FROM anon, authenticated;

DROP TRIGGER IF EXISTS classify_new_observability_issue ON public.observability_issues;
CREATE TRIGGER classify_new_observability_issue
  BEFORE INSERT OR UPDATE ON public.observability_issues
  FOR EACH ROW
  EXECUTE FUNCTION observability_private.classify_new_issue();

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
