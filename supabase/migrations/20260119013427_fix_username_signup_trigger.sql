/*
  # Fix Username Signup Trigger

  1. Problem
    - Separate username trigger conflicts with user creation
    - Race condition between triggers

  2. Solution
    - Remove separate username trigger
    - Update existing handle_new_user function to include username
    - Extract username from auth metadata during profile creation

  3. Security
    - Maintains SECURITY DEFINER for bypassing RLS
    - Username automatically populated during signup
*/

-- Drop the conflicting username trigger
DROP TRIGGER IF EXISTS on_auth_user_username_created ON auth.users;
DROP FUNCTION IF EXISTS get_username_from_auth();

-- Update handle_new_user to include username extraction
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    display_name, 
    team_role,
    username
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    'free'::team_role_enum,
    CASE 
      WHEN NEW.raw_user_meta_data->>'username' IS NOT NULL 
      THEN LOWER(NEW.raw_user_meta_data->>'username')
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
