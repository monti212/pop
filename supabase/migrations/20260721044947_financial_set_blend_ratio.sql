-- Lets the finance blend-ratio editor persist the input/output assumption. supa_admin only.
CREATE OR REPLACE FUNCTION public.set_financial_blend(p_input_share numeric)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND team_role='supa_admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_input_share < 0 OR p_input_share > 1 THEN
    RAISE EXCEPTION 'input_share must be between 0 and 1';
  END IF;
  UPDATE public.financial_config SET input_token_share = p_input_share, updated_at = now() WHERE id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.set_financial_blend(numeric) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_financial_blend(numeric) TO authenticated;
