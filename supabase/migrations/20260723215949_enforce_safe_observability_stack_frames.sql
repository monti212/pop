-- Enforce stack-frame-only storage at the database boundary. This protects the
-- inbox even if an authenticated client bypasses the application sanitizer.

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
