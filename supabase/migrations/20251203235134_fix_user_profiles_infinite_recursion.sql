/*
  # Fix Infinite Recursion in user_profiles RLS Policy
  
  The "Admin full access" policy was querying user_profiles to check admin status,
  which created infinite recursion. This migration fixes it by:
  
  1. Creating a SECURITY DEFINER function that bypasses RLS to check admin status
  2. Using this function in the admin policy to break the circular dependency
  
  ## Changes
  - Creates is_admin() function with SECURITY DEFINER
  - Replaces problematic admin policy with non-recursive version
*/

-- Create a security definer function to check if current user is admin
-- This bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
    AND team_role IN ('supa_admin', 'admin')
  );
END;
$$;

-- Drop and recreate the admin policy using the security definer function
DROP POLICY IF EXISTS "Admin full access" ON public.user_profiles;

CREATE POLICY "Admin full access"
  ON public.user_profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;