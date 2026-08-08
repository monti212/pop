/*
  # Harden is_admin() / is_supa_admin(): app_metadata only

  ## Problem
  Both functions resolved team_role with:

    COALESCE(auth.jwt() -> 'user_metadata' ->> 'team_role',
             auth.jwt() -> 'app_metadata'  ->> 'team_role', '')

  user_metadata is USER-WRITABLE (supabase.auth.updateUser). Because it was read
  FIRST, any authenticated user could self-grant team_role = 'admin' — or
  'supa_admin' — and satisfy every RLS policy gated on these functions. That
  defeats the stated intent of 20260119005729_sync_team_role_to_jwt_metadata,
  which deliberately wrote to app_metadata "so users cannot modify their own role".

  ## Fix
  Read app_metadata ONLY. app_metadata is writable exclusively by the service role
  and is kept current by the sync_team_role_to_jwt() trigger on user_profiles.

  ## Safety
  Verified before applying: every user_profiles row has a matching
  raw_app_meta_data->>'team_role' in auth.users (404 free, 5 prime, 3 supa_admin,
  2 admin — 414/414 synced). No account loses access it legitimately had.

  Role lists are unchanged: is_admin() stays ('supa_admin','admin'); 'prime' is a
  subscription tier, not a staff role, and is intentionally excluded.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'team_role', '')
         IN ('supa_admin', 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_supa_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'team_role', '') = 'supa_admin';
$$;
