/*
# Fix User Signup Trigger

1. Function Update
   - Updates the `handle_new_user` function to properly create user profile records
   - Ensures the function works with Supabase Auth user creation

2. Trigger Setup
   - Creates a trigger to automatically run the function when new users register
   - Connects Auth users with public.user_profiles table
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update or create the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    display_name
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger to call the function after a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Make sure the user_profiles table has RLS enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;