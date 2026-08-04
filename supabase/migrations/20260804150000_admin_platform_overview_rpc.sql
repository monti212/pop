/*
  # get_admin_platform_overview — true user totals + signup breakdown for /admin

  The dashboard counted user_profiles (411) as "total users"; the truth lives in
  auth.users (412 — profiles lag signups), and the signup-channel breakdown
  (email vs phone) only exists there. auth.users is not client-readable, so this
  is SECURITY DEFINER with an explicit admin gate — same role set the existing
  admin RLS policies use.

  Also bundles the knowledge-base token footprint so the dashboard gets its
  numbers in one round trip (verified against prod 2026-08-04: 156 active docs,
  101,971 standard-tier tokens, ~1.17M original-content tokens, 4 pinned docs
  at 3,594 tokens, 19 chunks / 5,840 tokens).

  Returns jsonb — additive shape, callers read keys by name.
*/

CREATE OR REPLACE FUNCTION public.get_admin_platform_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_users jsonb;
  v_monthly jsonb;
  v_kb jsonb;
BEGIN
  -- Admin gate: mirror the role set used by existing admin RLS policies.
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'admin', 'supa_admin')
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'total_users', count(*),
    'email_signups', count(*) FILTER (WHERE email IS NOT NULL),
    'phone_signups', count(*) FILTER (WHERE phone IS NOT NULL),
    'no_email_signups', count(*) FILTER (WHERE email IS NULL),
    'confirmed', count(*) FILTER (WHERE email_confirmed_at IS NOT NULL OR phone_confirmed_at IS NOT NULL),
    'active_30d', count(*) FILTER (WHERE last_sign_in_at > now() - interval '30 days'),
    'new_30d', count(*) FILTER (WHERE created_at > now() - interval '30 days'),
    'new_90d', count(*) FILTER (WHERE created_at > now() - interval '90 days')
  )
  INTO v_users
  FROM auth.users;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('month', m.month, 'signups', m.signups) ORDER BY m.month), '[]'::jsonb)
  INTO v_monthly
  FROM (
    SELECT date_trunc('month', created_at)::date AS month, count(*) AS signups
    FROM auth.users
    GROUP BY 1
  ) m;

  SELECT jsonb_build_object(
    'active_docs', count(*) FILTER (WHERE is_active),
    'standard_tokens', COALESCE(sum(standard_token_count) FILTER (WHERE is_active), 0),
    'micro_tokens', COALESCE(sum(micro_token_count) FILTER (WHERE is_active), 0),
    'original_est_tokens', COALESCE(sum(ceil(length(COALESCE(original_content, '')) / 4.0)) FILTER (WHERE is_active), 0),
    'pinned_docs', count(*) FILTER (WHERE is_active AND always_include),
    'pinned_standard_tokens', COALESCE(sum(standard_token_count) FILTER (WHERE is_active AND always_include), 0)
  )
  INTO v_kb
  FROM admin_knowledge_documents;

  RETURN jsonb_build_object('users', v_users, 'signups_monthly', v_monthly, 'kb', v_kb);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_platform_overview() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_platform_overview() TO authenticated, service_role;

COMMENT ON FUNCTION public.get_admin_platform_overview IS
  'Admin-gated (team_role check inside; SECURITY DEFINER for auth.users). True user totals, signup-channel breakdown, monthly signup series, and knowledge-base token footprint for the /admin dashboard.';
