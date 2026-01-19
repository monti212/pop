/*
  # Add gaone@orionx.xyz as Supa Admin and Update Role Constraints

  ## Purpose
  1. Update the team_role check constraint to include new role names (supa_admin, admin)
  2. Add gaone@orionx.xyz as a supa_admin user in the system
  
  ## User to Add
  - gaone@orionx.xyz

  ## Role Mapping
  Old roles still supported for backward compatibility:
  - optimus_prime → supa_admin (but optimus_prime still works)
  - autobot → admin (but autobot still works)
  - prime → prime (unchanged)
  - free → free (unchanged)

  ## Implementation
  This migration:
  1. Drops and recreates the check constraint to include all valid role values
  2. Updates existing user profile to supa_admin role if they exist
  3. Creates trigger to auto-assign supa_admin role when they sign up

  ## Security
  - Only affects gaone@orionx.xyz email
  - Assigns highest privilege level (supa_admin)
  - Idempotent - safe to run multiple times
  - Password must be set via Supabase Auth signup/reset (not stored in migration)

  ## Access
  gaone@orionx.xyz will be able to:
  - Use the platform as a normal user
  - Access all supa_admin dashboard pages
  - Add token refills (add_token_refill function)
  - Adjust token caps (adjust_token_cap function)
  - Assign user roles (assign_team_role function)
  - View all monitoring and analytics data
  - Access all 61 database tables
*/

-- ============================================================================
-- 1. UPDATE CHECK CONSTRAINT TO INCLUDE NEW ROLE NAMES
-- ============================================================================

-- Drop existing check constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_team_role_check;

-- Add new check constraint that includes both old and new role names
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_team_role_check 
CHECK (team_role IN ('supa_admin', 'admin', 'optimus_prime', 'prime', 'autobot', 'free'));

-- ============================================================================
-- 2. UPDATE EXISTING USER TO SUPA_ADMIN ROLE
-- ============================================================================

-- Update user profile for gaone@orionx.xyz if they already exist
UPDATE user_profiles
SET team_role = 'supa_admin'
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email = 'gaone@orionx.xyz'
);

-- ============================================================================
-- 3. CREATE FUNCTION TO AUTO-ASSIGN SUPA_ADMIN ROLE FOR GAONE
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS assign_gaone_supa_admin_role();

-- Create function to check and assign supa_admin role for gaone@orionx.xyz
CREATE OR REPLACE FUNCTION assign_gaone_supa_admin_role()
RETURNS trigger AS $$
BEGIN
  -- Check if the new user's email is gaone@orionx.xyz
  IF NEW.email = 'gaone@orionx.xyz' THEN
    -- Update the user_profiles table to set supa_admin role
    UPDATE user_profiles
    SET team_role = 'supa_admin'
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. CREATE TRIGGER TO AUTO-ASSIGN ROLE ON USER CREATION
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS assign_gaone_supa_admin_role_trigger ON auth.users;

-- Create trigger that runs after a new user is inserted
CREATE TRIGGER assign_gaone_supa_admin_role_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_gaone_supa_admin_role();

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

-- Log the supa_admin role assignment (for verification in logs)
DO $$
DECLARE
  user_exists boolean;
  user_role text;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = 'gaone@orionx.xyz'
  ) INTO user_exists;

  IF user_exists THEN
    SELECT team_role INTO user_role
    FROM user_profiles up
    JOIN auth.users u ON up.id = u.id
    WHERE u.email = 'gaone@orionx.xyz';
    
    RAISE NOTICE 'gaone@orionx.xyz exists in database with role: %', user_role;
  ELSE
    RAISE NOTICE 'gaone@orionx.xyz will be assigned supa_admin role upon signup';
  END IF;
END $$;
