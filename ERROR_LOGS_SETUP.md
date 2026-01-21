# Error Logging System Setup

This document contains the SQL commands needed to set up the error logging system in your Supabase database.

## Database Setup

Run the following SQL in your Supabase SQL Editor to create the error logging table and policies:

```sql
-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_stack text,
  error_context jsonb DEFAULT '{}'::jsonb,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  environment text NOT NULL CHECK (environment IN ('development', 'production')),
  resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_environment ON error_logs(environment);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Supa admins can view all error logs
CREATE POLICY "Supa admins can view all error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- Policy: Users can view their own error logs
CREATE POLICY "Users can view own error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Anyone (including anon) can insert error logs
CREATE POLICY "Anyone can insert error logs"
  ON error_logs
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Policy: Supa admins can update error logs (for resolving)
CREATE POLICY "Supa admins can update error logs"
  ON error_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- Policy: Supa admins can delete error logs
CREATE POLICY "Supa admins can delete error logs"
  ON error_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_error_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_error_logs_updated_at_trigger
  BEFORE UPDATE ON error_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_error_logs_updated_at();
```

## Features

### 1. Error Logging Service
Location: `/src/services/errorLogService.ts`

The service provides methods to:
- Log JavaScript errors
- Log network errors
- Log database errors
- Log authentication errors
- Get error logs with filters
- Get error statistics
- Resolve/unresolve errors
- Delete errors

### 2. Error Logs Dashboard
Location: `/src/pages/admin/ErrorLogsDashboard.tsx`

Access: `/supa-admin/error-logs`

Features:
- View all errors from development and production
- Filter by type, severity, environment, and status
- View detailed error information including stack traces
- Resolve errors with resolution notes
- Delete error logs
- Pagination support
- Real-time statistics

### 3. Automatic Error Tracking
Errors are automatically logged when:
- React Error Boundary catches an error
- JavaScript runtime errors occur
- API calls fail
- Database operations fail
- Authentication errors occur

### 4. Error Types
- `runtime` - JavaScript runtime errors
- `network` - Network/API errors
- `database` - Database operation errors
- `authentication` - Auth-related errors
- `validation` - Validation errors
- `unknown` - Unclassified errors

### 5. Severity Levels
- `critical` - System-breaking errors requiring immediate attention
- `high` - Significant errors affecting functionality
- `medium` - Notable errors that should be addressed
- `low` - Minor errors or warnings

## Usage

### Logging Errors from Code

```typescript
import { errorLogService } from '../services/errorLogService';

// Log a general error
await errorLogService.logError({
  error_type: 'network',
  error_message: 'Failed to fetch data',
  severity: 'medium',
  error_context: { endpoint: '/api/users' },
});

// Log a JavaScript error
try {
  // some code
} catch (error) {
  await errorLogService.logJSError(error as Error, 'high');
}

// Log a network error
await errorLogService.logNetworkError(
  'API request failed',
  { statusCode: 500, endpoint: '/api/users' },
  'high'
);

// Log a database error
await errorLogService.logDatabaseError(
  'Failed to insert user',
  { table: 'users', operation: 'insert' },
  'high'
);

// Log an authentication error
await errorLogService.logAuthError(
  'Invalid credentials',
  { attemptedEmail: 'user@example.com' },
  'medium'
);
```

### Accessing the Dashboard

1. Log in as a Supa Admin user
2. Navigate to the Supa Admin dashboard
3. Click on "View Error Logs" in the Quick Stats panel
4. Or directly visit `/supa-admin/error-logs`

### Managing Errors

- **View Details**: Click "View" on any error to see full details
- **Resolve**: Click "Resolve" and provide resolution notes
- **Unresolve**: Click "Unresolve" if an error needs to be reopened
- **Delete**: Click "Delete" to permanently remove an error log
- **Filter**: Use the filter panel to narrow down errors by type, severity, environment, or status

## Security

- Only Supa Admins can view all error logs
- Regular users can only view their own error logs
- Anyone can create error logs (to capture errors from unauthenticated users)
- Only Supa Admins can resolve or delete error logs
- All operations are protected by Row Level Security (RLS) policies

## Environment Detection

The system automatically detects the environment:
- `development` - When running locally or in dev mode
- `production` - When running in production

This helps separate development errors from production errors.
