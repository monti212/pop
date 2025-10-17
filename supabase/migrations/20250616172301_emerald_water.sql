-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  position TEXT,
  department TEXT,
  hire_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create payslips table
CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  basic_salary NUMERIC NOT NULL,
  allowances NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  net_salary NUMERIC NOT NULL,
  generation_date TIMESTAMPTZ DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  UNIQUE(employee_id, month, year)
);

-- Create employment_letters table
CREATE TABLE IF NOT EXISTS employment_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  upload_date TIMESTAMPTZ DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ
);

-- Create employee_access_logs table
CREATE TABLE IF NOT EXISTS employee_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  document_type TEXT,
  document_id UUID,
  timestamp TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT
);

-- Add payslip details table for itemized earnings and deductions
CREATE TABLE IF NOT EXISTS payslip_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id UUID REFERENCES payslips(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('earning', 'deduction')),
  item_name TEXT NOT NULL,
  amount NUMERIC NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslip_details ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employees
CREATE POLICY "Employees can view their own data"
  ON employees
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Employees can update their own data"
  ON employees
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for payslips
CREATE POLICY "Employees can view their own payslips"
  ON payslips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = payslips.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Create RLS policies for employment letters
CREATE POLICY "Employees can view their own employment letters"
  ON employment_letters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employment_letters.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Create RLS policies for access logs
CREATE POLICY "Employees can view their own access logs"
  ON employee_access_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_access_logs.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Create RLS policies for payslip details
CREATE POLICY "Employees can view their own payslip details"
  ON payslip_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payslips
      JOIN employees ON employees.id = payslips.employee_id
      WHERE payslips.id = payslip_details.payslip_id
      AND employees.user_id = auth.uid()
    )
  );

-- Create admin policies for all tables
CREATE POLICY "Admins can do everything with employees"
  ON employees
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users auth_users
      WHERE auth_users.id = auth.uid()
      AND auth_users.email LIKE '%@orionx.xyz'
    )
  );

CREATE POLICY "Admins can do everything with payslips"
  ON payslips
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users auth_users
      WHERE auth_users.id = auth.uid()
      AND auth_users.email LIKE '%@orionx.xyz'
    )
  );

CREATE POLICY "Admins can do everything with employment letters"
  ON employment_letters
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users auth_users
      WHERE auth_users.id = auth.uid()
      AND auth_users.email LIKE '%@orionx.xyz'
    )
  );

CREATE POLICY "Admins can do everything with access logs"
  ON employee_access_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users auth_users
      WHERE auth_users.id = auth.uid()
      AND auth_users.email LIKE '%@orionx.xyz'
    )
  );

CREATE POLICY "Admins can do everything with payslip details"
  ON payslip_details
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users auth_users
      WHERE auth_users.id = auth.uid()
      AND auth_users.email LIKE '%@orionx.xyz'
    )
  );

-- Fix the function for employee access logging to properly handle record changes
CREATE OR REPLACE FUNCTION log_payslip_view()
RETURNS TRIGGER AS $$
BEGIN
  -- Check the condition that was previously in the WHEN clause
  IF (TG_OP = 'UPDATE' AND OLD.viewed_at IS NULL AND NEW.viewed_at IS NOT NULL) THEN
    INSERT INTO employee_access_logs (
      employee_id,
      action,
      document_type,
      document_id,
      ip_address
    )
    VALUES (
      NEW.employee_id,
      'viewed',
      'payslip',
      NEW.id,
      current_setting('request.headers', true)::json->>'x-forwarded-for'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_payslip_download()
RETURNS TRIGGER AS $$
BEGIN
  -- Check the condition that was previously in the WHEN clause
  IF (TG_OP = 'UPDATE' AND OLD.downloaded_at IS NULL AND NEW.downloaded_at IS NOT NULL) THEN
    INSERT INTO employee_access_logs (
      employee_id,
      action,
      document_type,
      document_id,
      ip_address
    )
    VALUES (
      NEW.employee_id,
      'downloaded',
      'payslip',
      NEW.id,
      current_setting('request.headers', true)::json->>'x-forwarded-for'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_letter_view()
RETURNS TRIGGER AS $$
BEGIN
  -- Check the condition that was previously in the WHEN clause
  IF (TG_OP = 'UPDATE' AND OLD.viewed_at IS NULL AND NEW.viewed_at IS NOT NULL) THEN
    INSERT INTO employee_access_logs (
      employee_id,
      action,
      document_type,
      document_id,
      ip_address
    )
    VALUES (
      NEW.employee_id,
      'viewed',
      'letter',
      NEW.id,
      current_setting('request.headers', true)::json->>'x-forwarded-for'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_letter_download()
RETURNS TRIGGER AS $$
BEGIN
  -- Check the condition that was previously in the WHEN clause
  IF (TG_OP = 'UPDATE' AND OLD.downloaded_at IS NULL AND NEW.downloaded_at IS NOT NULL) THEN
    INSERT INTO employee_access_logs (
      employee_id,
      action,
      document_type,
      document_id,
      ip_address
    )
    VALUES (
      NEW.employee_id,
      'downloaded',
      'letter',
      NEW.id,
      current_setting('request.headers', true)::json->>'x-forwarded-for'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for access logging with separate functions
-- Remove the WHEN condition and put the logic in the functions instead
CREATE TRIGGER log_payslip_view_trigger
AFTER UPDATE ON payslips
FOR EACH ROW
EXECUTE FUNCTION log_payslip_view();

CREATE TRIGGER log_payslip_download_trigger
AFTER UPDATE ON payslips
FOR EACH ROW
EXECUTE FUNCTION log_payslip_download();

CREATE TRIGGER log_letter_view_trigger
AFTER UPDATE ON employment_letters
FOR EACH ROW
EXECUTE FUNCTION log_letter_view();

CREATE TRIGGER log_letter_download_trigger
AFTER UPDATE ON employment_letters
FOR EACH ROW
EXECUTE FUNCTION log_letter_download();

-- Add table and column comments
COMMENT ON TABLE employees IS 'Stores employee information for the self-service portal';
COMMENT ON TABLE payslips IS 'Stores monthly payslip information for employees';
COMMENT ON TABLE employment_letters IS 'Stores employment confirmation letters uploaded by admins';
COMMENT ON TABLE employee_access_logs IS 'Tracks employee access to documents for auditing';
COMMENT ON TABLE payslip_details IS 'Stores itemized earnings and deductions for payslips';

COMMENT ON COLUMN payslips.month IS 'Month number (1-12)';
COMMENT ON COLUMN payslips.year IS 'Year (e.g., 2025)';
COMMENT ON COLUMN payslip_details.item_type IS 'Type of item: earning or deduction';
COMMENT ON COLUMN employment_letters.file_path IS 'Storage path for the uploaded letter file';