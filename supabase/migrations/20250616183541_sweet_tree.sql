/*
  # Create employee profile for Gaone
  
  1. New Entries
    - Add employee profile for Gaone with user_id 15eb913f-4628-4227-9dfa-70abddeac15b
    - Link to existing auth.users account
    
  This migration creates a profile for Gaone in the employees table to fix login issues.
*/

-- Check if employee already exists and insert if not
DO $$
DECLARE
  v_user_id UUID := '15eb913f-4628-4227-9dfa-70abddeac15b';
  v_email TEXT := 'gaone@orionx.xyz';
  v_count INT;
BEGIN
  -- Check if employee with this user_id already exists
  SELECT COUNT(*) INTO v_count FROM employees 
  WHERE user_id = v_user_id OR email = v_email;
  
  -- Only insert if employee doesn't exist
  IF v_count = 0 THEN
    INSERT INTO employees (
      user_id,
      first_name,
      last_name,
      email,
      position,
      department,
      hire_date,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      'Gaone',
      'Molefi',
      v_email,
      'Team Member',
      'General',
      CURRENT_DATE,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Employee profile for Gaone created successfully';
  ELSE
    RAISE NOTICE 'Employee profile for Gaone already exists';
  END IF;
END $$;