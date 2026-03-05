/*
  # Fix Team Role Type Mismatch

  1. Problem
    - Trigger tries to insert 'free'::team_role_enum
    - But team_role column is of type text
    - This causes "Database error saving new user"

  2. Solution
    - Remove enum cast from trigger
    - Insert plain text value 'free'

  3. Security
    - Maintains SECURITY DEFINER
    - Preserves all existing functionality
*/

-- Fix handle_new_user to use correct type
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
    'free',
    CASE 
      WHEN NEW.raw_user_meta_data->>'username' IS NOT NULL 
      THEN LOWER(NEW.raw_user_meta_data->>'username')
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
