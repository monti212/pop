/*
  # Fix user profile creation trigger
  
  1. Updates
    - Fix handle_new_user() function to explicitly reference public schema
    - Ensures the trigger can find user_profiles table during signup
  
  2. Changes
    - Updated trigger function with explicit schema reference
    - Added better error handling
*/

-- Drop and recreate the trigger function with explicit schema reference
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into user_profiles with explicit schema reference
  INSERT INTO public.user_profiles (id, display_name, team_role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'name',
    'free'::team_role_enum
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN new;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
