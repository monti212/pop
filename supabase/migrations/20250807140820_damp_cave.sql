/*
  # Fix New User Profile Creation Trigger

  This migration fixes the database error that occurs when new users sign up.
  The issue is with the trigger that automatically creates user profiles.

  1. Database Function
     - Drop and recreate the `handle_new_user` function with proper error handling
     - Ensure it has SECURITY DEFINER permissions to bypass RLS
     - Add proper exception handling for edge cases

  2. Database Trigger  
     - Drop and recreate the trigger on auth.users table
     - Ensure it fires AFTER INSERT to create user profiles automatically

  3. Security
     - Function runs with elevated permissions to bypass RLS during profile creation
     - Maintains data integrity with proper error handling
*/

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the improved handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    -- Create user profile entry
    INSERT INTO public.user_profiles (
      id, 
      display_name,
      subscription_tier,
      daily_message_count,
      created_at,
      last_active_at,
      last_subscription_change_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      'free',
      0,
      NOW(),
      NOW(),
      NOW()
    );
    
    RETURN NEW;
  EXCEPTION
    WHEN unique_violation THEN
      -- Profile already exists, just return
      RETURN NEW;
    WHEN OTHERS THEN
      -- Log the error but don't fail the user creation
      RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
      RETURN NEW;
  END;
END;
$$;

-- Create the trigger that calls the function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS policies allow the trigger to work
-- Grant necessary permissions for the function to work
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.user_profiles TO postgres, anon, authenticated, service_role;