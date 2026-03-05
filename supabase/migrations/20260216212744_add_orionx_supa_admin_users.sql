/*
  # Add OrionX Supa Admin Users

  1. Updates
    - Grant `supa_admin` role to monti@orionx.xyz
    - Grant `supa_admin` role to gaone@orionx.xyz
    
  2. Security
    - Creates trigger to automatically assign supa_admin role on signup
    - Full admin dashboard access
    - Role assignment capabilities
    - Complete system access

  3. Notes
    - Updates existing users if they already exist
    - Automatically assigns role for new signups with these emails
    - Idempotent - safe to run multiple times
*/

-- Update existing users to supa_admin if they exist
UPDATE user_profiles
SET team_role = 'supa_admin'
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'monti@orionx.xyz',
    'gaone@orionx.xyz'
  )
);

-- Create function to automatically assign supa_admin role for OrionX emails
CREATE OR REPLACE FUNCTION assign_orionx_supa_admin_role()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the new user's email matches OrionX supa_admin emails
  IF NEW.email IN ('monti@orionx.xyz', 'gaone@orionx.xyz') THEN
    -- Update their profile to supa_admin
    UPDATE user_profiles
    SET team_role = 'supa_admin'
    WHERE id = NEW.id;
    
    -- Log the assignment
    RAISE NOTICE 'Assigned supa_admin role to OrionX user: %', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS assign_orionx_supa_admin_role_trigger ON auth.users;

-- Create trigger to run after user insertion
CREATE TRIGGER assign_orionx_supa_admin_role_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_orionx_supa_admin_role();

-- Log the result for verification
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM user_profiles up
  JOIN auth.users u ON up.id = u.id
  WHERE u.email IN ('monti@orionx.xyz', 'gaone@orionx.xyz')
    AND up.team_role = 'supa_admin';
  
  RAISE NOTICE 'OrionX supa_admin users configured: % user(s) found', user_count;
END $$;
