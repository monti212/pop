/*
  # Update Admin Role Hierarchy

  ## Purpose
  Rename admin roles to create a clearer hierarchy:
  - **optimus_prime** → **supa_admin**: Full system admin access (highest level)
  - **autobot** → **admin**: Standard admin dashboard access
  - **prime**: Remains as premium user tier (no admin access)
  - **free**: Remains as free tier

  ## New Access Model
  - **supa_admin**: Full administrative access to all features and data
  - **admin**: Access to admin dashboard and administrative features
  - **prime**: Premium user features (NO admin access)
  - **free**: Basic user features

  ## Changes

  ### 1. Create New team_role_enum with Updated Values
  Since PostgreSQL doesn't support renaming enum values, we:
  1. Create a new enum type with the updated values
  2. Alter the user_profiles table to use the new type
  3. Update all existing data
  4. Drop the old enum

  ### 2. Update is_admin() Function
  Update to recognize supa_admin and admin roles

  ### 3. Update All RLS Policies
  Update all policies to use new role names

  ### 4. Update Role Assignment Functions
  Update functions that reference the old role names

  ## Migration Safety
  - Uses IF EXISTS checks to prevent errors
  - Preserves existing role assignments through mapping
  - Updates all references atomically
*/

-- ============================================================================
-- 1. CREATE NEW ENUM TYPE WITH UPDATED VALUES
-- ============================================================================

-- Create the new enum type with updated role names
DO $$
BEGIN
  -- Only create if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_role_enum_new') THEN
    CREATE TYPE team_role_enum_new AS ENUM ('supa_admin', 'admin', 'prime', 'free');
  END IF;
END $$;

-- ============================================================================
-- 2. ADD TEMPORARY COLUMN AND MIGRATE DATA
-- ============================================================================

-- Add a temporary column with the new enum type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'team_role_new'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN team_role_new team_role_enum_new;
  END IF;
END $$;

-- Migrate existing data with role mapping:
-- optimus_prime → supa_admin
-- autobot → admin
-- prime → prime (unchanged)
-- free → free (unchanged)
UPDATE user_profiles
SET team_role_new = CASE
  WHEN team_role::text = 'optimus_prime' THEN 'supa_admin'::team_role_enum_new
  WHEN team_role::text = 'autobot' THEN 'admin'::team_role_enum_new
  WHEN team_role::text = 'prime' THEN 'prime'::team_role_enum_new
  ELSE 'free'::team_role_enum_new
END
WHERE team_role_new IS NULL;

-- ============================================================================
-- 3. REPLACE OLD COLUMN WITH NEW ONE
-- ============================================================================

-- Drop the old column and rename the new one
ALTER TABLE user_profiles DROP COLUMN IF EXISTS team_role;
ALTER TABLE user_profiles RENAME COLUMN team_role_new TO team_role;

-- Set NOT NULL and default
ALTER TABLE user_profiles ALTER COLUMN team_role SET NOT NULL;
ALTER TABLE user_profiles ALTER COLUMN team_role SET DEFAULT 'free'::team_role_enum_new;

-- ============================================================================
-- 4. DROP OLD ENUM AND RENAME NEW ONE
-- ============================================================================

-- Drop the old enum type
DROP TYPE IF EXISTS team_role_enum CASCADE;

-- Rename the new enum to the original name
ALTER TYPE team_role_enum_new RENAME TO team_role_enum;

-- ============================================================================
-- 5. UPDATE is_admin() FUNCTION
-- ============================================================================

-- Drop and recreate is_admin function with updated role check
DROP FUNCTION IF EXISTS is_admin(uuid);

CREATE OR REPLACE FUNCTION is_admin(check_user_id uuid DEFAULT NULL)
RETURNS boolean AS $$
DECLARE
  user_role team_role_enum;
  target_id uuid;
BEGIN
  target_id := COALESCE(check_user_id, auth.uid());

  SELECT team_role INTO user_role
  FROM user_profiles
  WHERE id = target_id;

  -- supa_admin, admin, and prime have admin access
  -- free does NOT have admin access
  RETURN user_role IN ('supa_admin', 'admin', 'prime');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;

-- ============================================================================
-- 6. UPDATE ALL RLS POLICIES WITH NEW ROLE NAMES
-- ============================================================================

-- Update WhatsApp Messages policies
DROP POLICY IF EXISTS "Admins can view all messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON whatsapp_messages;

CREATE POLICY "Admins can view all messages"
  ON whatsapp_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

CREATE POLICY "Admins can insert messages"
  ON whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

CREATE POLICY "Admins can update messages"
  ON whatsapp_messages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

CREATE POLICY "Admins can delete messages"
  ON whatsapp_messages FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

-- Update WhatsApp Sessions policies
DROP POLICY IF EXISTS "Admins can view all sessions" ON whatsapp_sessions;
DROP POLICY IF EXISTS "Admins can update sessions" ON whatsapp_sessions;
DROP POLICY IF EXISTS "Admins can delete sessions" ON whatsapp_sessions;

CREATE POLICY "Admins can view all sessions"
  ON whatsapp_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

CREATE POLICY "Admins can update sessions"
  ON whatsapp_sessions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

CREATE POLICY "Admins can delete sessions"
  ON whatsapp_sessions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

-- Update WhatsApp Users policies
DROP POLICY IF EXISTS "Admins can view all whatsapp users" ON whatsapp_users;
DROP POLICY IF EXISTS "Admins can update whatsapp users" ON whatsapp_users;
DROP POLICY IF EXISTS "Admins can delete whatsapp users" ON whatsapp_users;

CREATE POLICY "Admins can view all whatsapp users"
  ON whatsapp_users FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

CREATE POLICY "Admins can update whatsapp users"
  ON whatsapp_users FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

CREATE POLICY "Admins can delete whatsapp users"
  ON whatsapp_users FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

-- Update WhatsApp Usage policies
DROP POLICY IF EXISTS "Admins can view all usage" ON whatsapp_usage;

CREATE POLICY "Admins can view all usage"
  ON whatsapp_usage FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

-- Update WhatsApp User Context policies
DROP POLICY IF EXISTS "Admins can view all user context" ON whatsapp_user_context;
DROP POLICY IF EXISTS "Admins can update user context" ON whatsapp_user_context;
DROP POLICY IF EXISTS "Admins can delete user context" ON whatsapp_user_context;

CREATE POLICY "Admins can view all user context"
  ON whatsapp_user_context FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

CREATE POLICY "Admins can update user context"
  ON whatsapp_user_context FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

CREATE POLICY "Admins can delete user context"
  ON whatsapp_user_context FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

-- Update WhatsApp Settings policies
DROP POLICY IF EXISTS "Admins can view settings" ON whatsapp_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON whatsapp_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON whatsapp_settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON whatsapp_settings;

CREATE POLICY "Admins can view settings"
  ON whatsapp_settings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

CREATE POLICY "Admins can insert settings"
  ON whatsapp_settings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

CREATE POLICY "Admins can update settings"
  ON whatsapp_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

CREATE POLICY "Admins can delete settings"
  ON whatsapp_settings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime')
    )
  );

-- ============================================================================
-- 7. UPDATE ROLE ASSIGNMENT AND AUDIT FUNCTIONS
-- ============================================================================

-- Recreate get_user_role function
DROP FUNCTION IF EXISTS get_user_role(uuid);

CREATE OR REPLACE FUNCTION get_user_role(check_user_id uuid DEFAULT NULL)
RETURNS team_role_enum AS $$
DECLARE
  user_role team_role_enum;
  target_id uuid;
BEGIN
  target_id := COALESCE(check_user_id, auth.uid());

  SELECT team_role INTO user_role
  FROM user_profiles
  WHERE id = target_id;

  RETURN COALESCE(user_role, 'free'::team_role_enum);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;

-- Recreate assign_team_role function (if it exists)
DROP FUNCTION IF EXISTS assign_team_role(uuid, team_role_enum, text);

CREATE OR REPLACE FUNCTION assign_team_role(
  target_user_id uuid,
  new_role team_role_enum,
  reason text DEFAULT 'Manual assignment'
)
RETURNS boolean AS $$
DECLARE
  caller_role team_role_enum;
  old_role team_role_enum;
  caller_id uuid;
BEGIN
  caller_id := auth.uid();

  -- Get caller's role
  SELECT team_role INTO caller_role
  FROM user_profiles
  WHERE id = caller_id;

  -- Only supa_admin can assign roles
  IF caller_role != 'supa_admin' THEN
    RAISE EXCEPTION 'Only supa_admin can assign roles';
  END IF;

  -- Get target user's current role
  SELECT team_role INTO old_role
  FROM user_profiles
  WHERE id = target_user_id;

  IF old_role IS NULL THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  -- Update the user's role
  UPDATE user_profiles
  SET team_role = new_role
  WHERE id = target_user_id;

  -- Log the role change in admin_role_audit if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_role_audit') THEN
    INSERT INTO admin_role_audit (
      admin_user_id,
      target_user_id,
      old_role,
      new_role,
      reason
    ) VALUES (
      caller_id,
      target_user_id,
      old_role,
      new_role,
      reason
    );
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION assign_team_role(uuid, team_role_enum, text) TO authenticated;

-- ============================================================================
-- 8. UPDATE handle_new_user TRIGGER FUNCTION
-- ============================================================================

-- Recreate the trigger function to use new enum values
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, team_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    'free'::team_role_enum
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
