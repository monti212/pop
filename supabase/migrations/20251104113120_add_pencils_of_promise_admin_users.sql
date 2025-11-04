/*
  # Add Pencils of Promise Admin Users

  ## Purpose
  Add three Pencils of Promise team members as admin users in the system.

  ## Users to Add
  - skpo@pencilsofpromise.org
  - sklu@pencilsofpromise.org
  - ddavordzi@pencilsofpromise.org

  ## Implementation
  This migration updates existing user profiles to admin role if they exist,
  or prepares the system to automatically assign admin role when they sign up.

  ## Safety
  - Uses UPDATE with WHERE clause to only affect specific emails
  - Only updates team_role, leaves other profile data intact
  - Idempotent - safe to run multiple times
*/

-- ============================================================================
-- UPDATE EXISTING USERS TO ADMIN ROLE
-- ============================================================================

-- Update user profiles for Pencils of Promise team members
-- This will only update users who have already signed up
UPDATE user_profiles
SET team_role = 'admin'::team_role_enum
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'skpo@pencilsofpromise.org',
    'sklu@pencilsofpromise.org',
    'ddavordzi@pencilsofpromise.org'
  )
);

-- ============================================================================
-- CREATE FUNCTION TO AUTO-ASSIGN ADMIN ROLE FOR PENCILS OF PROMISE EMAILS
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS assign_pencils_of_promise_admin_role();

-- Create function to check and assign admin role for Pencils of Promise emails
CREATE OR REPLACE FUNCTION assign_pencils_of_promise_admin_role()
RETURNS trigger AS $$
BEGIN
  -- Check if the new user's email is from Pencils of Promise admin list
  IF NEW.email IN (
    'skpo@pencilsofpromise.org',
    'sklu@pencilsofpromise.org',
    'ddavordzi@pencilsofpromise.org'
  ) THEN
    -- Update the user_profiles table to set admin role
    UPDATE user_profiles
    SET team_role = 'admin'::team_role_enum
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE TRIGGER TO AUTO-ASSIGN ROLE ON USER CREATION
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS assign_pencils_admin_role_trigger ON auth.users;

-- Create trigger that runs after a new user is inserted
CREATE TRIGGER assign_pencils_admin_role_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_pencils_of_promise_admin_role();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Log the admin role assignments (for verification in logs)
DO $$
DECLARE
  admin_count integer;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM user_profiles up
  JOIN auth.users u ON up.id = u.id
  WHERE u.email IN (
    'skpo@pencilsofpromise.org',
    'sklu@pencilsofpromise.org',
    'ddavordzi@pencilsofpromise.org'
  )
  AND up.team_role = 'admin'::team_role_enum;

  RAISE NOTICE 'Pencils of Promise admin users configured: % existing users updated to admin role', admin_count;
END $$;
