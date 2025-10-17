/*
  # Set up Gaone's employee account with sample data
  
  1. Create employee record for Gaone
    - Ensure it's linked to the correct auth user ID
    - Add employment details
  
  2. Create sample payslips for Gaone
    - Add monthly payslips for the past few months
    - Include payslip details (earnings and deductions)
  
  3. Add employment confirmation letter
    - Employment confirmation document
*/

-- Create or update Gaone's employee record
DO $$
DECLARE
  v_user_id UUID := '15eb913f-4628-4227-9dfa-70abddeac15b';
  v_email TEXT := 'gaone@orionx.xyz';
  v_employee_id UUID;
BEGIN
  -- Check if employee with this email already exists
  SELECT id INTO v_employee_id FROM employees 
  WHERE email = v_email;
  
  -- If employee doesn't exist, insert new record
  IF v_employee_id IS NULL THEN
    INSERT INTO employees (
      id,
      user_id,
      first_name,
      last_name,
      email,
      phone,
      position,
      department,
      hire_date,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      'Gaone',
      'Molefi',
      v_email,
      '+267 71234567',
      'Software Developer',
      'Engineering',
      '2025-01-15',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_employee_id;
    
    RAISE NOTICE 'Created new employee record for Gaone Molefi with ID %', v_employee_id;
  ELSE
    -- Update the existing record to ensure it has the correct user_id
    UPDATE employees
    SET 
      user_id = v_user_id,
      phone = '+267 71234567',
      position = 'Software Developer',
      department = 'Engineering',
      hire_date = '2025-01-15',
      updated_at = NOW()
    WHERE id = v_employee_id;
    
    RAISE NOTICE 'Updated existing employee record for Gaone Molefi with ID %', v_employee_id;
  END IF;

  -- Create sample payslips for the past 3 months
  FOR month_offset IN 0..2 LOOP
    DECLARE
      v_year INT;
      v_month INT;
      v_payslip_id UUID;
      v_basic_salary NUMERIC := 5000.00;
      v_allowances NUMERIC := 1200.00;
      v_deductions NUMERIC := 1350.00;
      v_net_salary NUMERIC := v_basic_salary + v_allowances - v_deductions;
    BEGIN
      -- Calculate month and year
      v_month := EXTRACT(MONTH FROM CURRENT_DATE - (month_offset * INTERVAL '1 month'));
      v_year := EXTRACT(YEAR FROM CURRENT_DATE - (month_offset * INTERVAL '1 month'));
      
      -- Insert or update payslip
      INSERT INTO payslips (
        employee_id,
        month,
        year,
        basic_salary,
        allowances,
        deductions,
        net_salary,
        generation_date,
        viewed_at,
        downloaded_at
      ) 
      VALUES (
        v_employee_id,
        v_month,
        v_year,
        v_basic_salary,
        v_allowances,
        v_deductions,
        v_net_salary,
        NOW() - (month_offset * INTERVAL '1 month'),
        CASE WHEN month_offset > 0 THEN NOW() - (month_offset * INTERVAL '1 month') + INTERVAL '2 days' ELSE NULL END,
        CASE WHEN month_offset > 1 THEN NOW() - (month_offset * INTERVAL '1 month') + INTERVAL '3 days' ELSE NULL END
      )
      ON CONFLICT (employee_id, month, year) 
      DO UPDATE SET
        basic_salary = EXCLUDED.basic_salary,
        allowances = EXCLUDED.allowances,
        deductions = EXCLUDED.deductions,
        net_salary = EXCLUDED.net_salary
      RETURNING id INTO v_payslip_id;
      
      -- Add payslip details
      DELETE FROM payslip_details WHERE payslip_id = v_payslip_id;
      
      -- Earnings
      INSERT INTO payslip_details (payslip_id, item_type, item_name, amount)
      VALUES
        (v_payslip_id, 'earning', 'Housing Allowance', 800.00),
        (v_payslip_id, 'earning', 'Transport Allowance', 400.00);
      
      -- Deductions
      INSERT INTO payslip_details (payslip_id, item_type, item_name, amount)
      VALUES
        (v_payslip_id, 'deduction', 'Income Tax', 950.00),
        (v_payslip_id, 'deduction', 'Pension Contribution', 300.00),
        (v_payslip_id, 'deduction', 'Medical Insurance', 100.00);
        
      RAISE NOTICE 'Created payslip for Gaone Molefi for period %/% with ID %', v_month, v_year, v_payslip_id;
    END;
  END LOOP;
  
  -- Add employment confirmation letter
  INSERT INTO employment_letters (
    employee_id,
    title,
    file_path,
    upload_date,
    viewed_at,
    downloaded_at
  )
  VALUES (
    v_employee_id,
    'Employment Confirmation Letter',
    'https://orionx.xyz/sample-employment-letter.pdf',
    NOW() - INTERVAL '2 months',
    NOW() - INTERVAL '1 month',
    NULL
  )
  ON CONFLICT DO NOTHING;

  -- Add probation completion letter (more recent)
  INSERT INTO employment_letters (
    employee_id,
    title,
    file_path,
    upload_date,
    viewed_at,
    downloaded_at
  )
  VALUES (
    v_employee_id,
    'Probation Period Completion',
    'https://orionx.xyz/probation-completion.pdf',
    NOW() - INTERVAL '2 weeks',
    NULL,
    NULL
  )
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Setup complete for Gaone Molefi';
END $$;