/*
  # Grant Table Permissions to Authenticated Role

  1. Security
    - Grant SELECT permissions on public.users table to authenticated role
    - Grant SELECT permissions on public.user_profiles table to authenticated role
    - Ensure authenticated users can access their own data through RLS policies

  This migration fixes the "permission denied for table users" error by granting
  the necessary base table permissions to the authenticated role.
*/

-- Grant SELECT permission on public.users table to authenticated role
GRANT SELECT ON public.users TO authenticated;

-- Grant SELECT permission on public.user_profiles table to authenticated role
GRANT SELECT ON public.user_profiles TO authenticated;

-- Grant INSERT permission on public.user_profiles for profile creation
GRANT INSERT ON public.user_profiles TO authenticated;

-- Grant UPDATE permission on public.user_profiles for profile updates
GRANT UPDATE ON public.user_profiles TO authenticated;

-- Ensure the authenticated role can use the gen_random_uuid() function if needed
GRANT EXECUTE ON FUNCTION gen_random_uuid() TO authenticated;

-- Refresh the RLS policies to ensure they work with the new permissions
-- (This is just a comment - the existing RLS policies should now work properly)