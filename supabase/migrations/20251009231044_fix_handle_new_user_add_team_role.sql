/*
  # Fix handle_new_user trigger to include team_role field
  
  ## Summary
  This migration fixes the database error during user sign-up by updating the 
  handle_new_user() trigger function to properly set the team_role field when 
  creating new user profiles.
  
  ## Issue
  The previous migration (20251009164839) redefined the handle_new_user() function
  but omitted the team_role field, causing database constraint violations during
  sign-up since the user_profiles table requires this field.
  
  ## Changes
  1. Updates handle_new_user() function to include team_role with default 'free'
  2. Maintains all existing fields (display_name, email, teaching_preferences)
  3. Adds safer null handling with COALESCE
  4. Preserves SECURITY DEFINER and explicit schema references
  
  ## Fields Set
  - id: from NEW.id
  - display_name: from user metadata or email
  - email: from NEW.email
  - team_role: defaults to 'free'
  - teaching_preferences: created in separate insert
*/

-- Drop and recreate the handle_new_user function with team_role included
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into user_profiles with all required fields including team_role
  INSERT INTO public.user_profiles (id, display_name, email, team_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    'free'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default teaching preferences if the table exists
  BEGIN
    INSERT INTO public.teaching_preferences (teacher_id)
    VALUES (NEW.id)
    ON CONFLICT (teacher_id) DO NOTHING;
  EXCEPTION
    WHEN undefined_table THEN
      -- teaching_preferences table doesn't exist yet, skip
      NULL;
    WHEN OTHERS THEN
      -- Log other errors but don't fail user creation
      RAISE WARNING 'Error creating teaching preferences: %', SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
