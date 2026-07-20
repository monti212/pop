-- COGS/margin is supa-admin-only (only surfaced on /supa-admin/token-cost). The original policy
-- (from 20260720225408) also allowed 'admin'/'prime', which would let an org admin read pricing via
-- the API even though they have no page for it. Tighten to supa_admin only, to match the intended
-- access model (admin never sees what supa-admin sees).
DROP POLICY IF EXISTS pricing_config_admin_read ON public.pricing_config;
CREATE POLICY pricing_config_supa_admin_read ON public.pricing_config
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.team_role = 'supa_admin'
  ));
