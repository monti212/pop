/*
  # Sync Team Role to JWT Metadata

  ## Problem
  The `is_admin()` and `is_supa_admin()` functions check JWT metadata for team_role,
  but the team_role is only stored in user_profiles table and not synced to JWT.
  This causes RLS policies to fail, blocking access to token usage data.

  ## Solution
  1. Create trigger to sync team_role to auth.users raw_app_metadata
  2. Sync all existing user profiles to JWT metadata
  3. Ensure new users get team_role in JWT on signup

  ## Security
  - Uses app_metadata (not user_metadata) so users cannot modify their own role
  - Trigger runs with SECURITY DEFINER for proper permissions
  - Only updates auth.users metadata, doesn't change authentication
*/

-- ============================================================================
-- 1. CREATE FUNCTION TO SYNC TEAM ROLE TO JWT METADATA
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_team_role_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's app_metadata in auth.users to include team_role
  -- This makes team_role available in JWT for is_admin() checks
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('team_role', NEW.team_role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. CREATE TRIGGER ON USER_PROFILES
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_team_role_to_jwt_trigger ON user_profiles;

-- Create trigger that runs after insert or update of team_role
CREATE TRIGGER sync_team_role_to_jwt_trigger
  AFTER INSERT OR UPDATE OF team_role ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_team_role_to_jwt();

-- ============================================================================
-- 3. SYNC ALL EXISTING USER PROFILES
-- ============================================================================

-- Update all existing users to have their team_role in JWT metadata
DO $$
DECLARE
  user_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  FOR user_record IN 
    SELECT up.id, up.team_role
    FROM user_profiles up
    WHERE up.team_role IS NOT NULL
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('team_role', user_record.team_role)
    WHERE id = user_record.id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Synced team_role to JWT metadata for % users', updated_count;
END $$;

-- ============================================================================
-- 4. UPDATE HANDLE_NEW_USER TO SET TEAM ROLE IN JWT
-- ============================================================================

-- Update handle_new_user to ensure new users get team_role in JWT
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  default_role text := 'free';
BEGIN
  -- Insert into user_profiles with default role
  INSERT INTO user_profiles (id, display_name, team_role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'name',
    default_role
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Sync team_role to JWT metadata
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('team_role', default_role)
  WHERE id = new.id;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  users_with_metadata INTEGER;
  total_users INTEGER;
BEGIN
  -- Count users with team_role in metadata
  SELECT COUNT(*) INTO users_with_metadata
  FROM auth.users
  WHERE raw_app_meta_data ? 'team_role';
  
  -- Count total users
  SELECT COUNT(*) INTO total_users
  FROM user_profiles;
  
  RAISE NOTICE 'JWT Metadata sync complete: % out of % users have team_role in JWT', 
    users_with_metadata, total_users;
END $$;
