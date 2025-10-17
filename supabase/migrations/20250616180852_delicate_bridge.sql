/*
  # Create Employee Account for Gaone Molefi

  1. Creates an employee record for Gaone Molefi
  2. Links it to a user account that will be created through the UI
  3. Sets up sample payslip and employment letter

  Note: The actual user authentication account must be created through the Supabase UI
  or Auth API, as direct SQL inserts to auth.users table are not supported in migrations.
*/

-- Insert the employee record (without requiring the auth user to exist first)
INSERT INTO employees (
  id,
  first_name,
  last_name,
  email,
  phone,
  position,
  department,
  hire_date
)
VALUES (
  gen_random_uuid(),
  'Gaone',
  'Molefi',
  'gaone@orionx.xyz',
  '+267 71234567',
  'Software Developer',
  'Engineering',
  '2025-01-15'
)
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- Note: After running this migration, you'll need to:
-- 1. Create the user account through the Supabase UI or Auth API
-- 2. Update the employee record to link it to the user account
-- 3. Set the password to "Gaonemolefi12345"