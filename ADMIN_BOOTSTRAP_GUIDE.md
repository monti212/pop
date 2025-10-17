# Admin Bootstrap Guide

This guide explains how to assign admin roles after the security hardening implementation that removed hardcoded admin credentials.

## Overview

Previously, admin access was determined by hardcoded email checks (`@orionx.xyz` emails). This has been replaced with a secure database-driven role system using the `team_role` column in the `user_profiles` table.

## Admin Roles

The system supports four role levels:

- **`optimus_prime`** - Super admin with full access, can assign roles to others (monti@orionx.xyz only)
- **`prime`** - Admin with dashboard access and user management capabilities
- **`autobot`** - Uhuru Plus features (NO admin dashboard access)
- **`free`** - Regular user (default)

## How to Assign Your First Admin

### Option 1: Using Supabase SQL Editor (Recommended)

1. Log into your Supabase Dashboard
2. Navigate to the SQL Editor
3. Run this query (replace with your email):

```sql
SELECT assign_team_role(
  (SELECT id FROM auth.users WHERE email = 'your-admin-email@example.com'),
  'optimus_prime'::team_role_enum,
  'Initial admin bootstrap'
);
```

4. Verify the assignment:

```sql
SELECT
  u.email,
  p.team_role,
  p.created_at
FROM auth.users u
JOIN user_profiles p ON p.id = u.id
WHERE u.email = 'your-admin-email@example.com';
```

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db execute --sql "
SELECT assign_team_role(
  (SELECT id FROM auth.users WHERE email = 'your-admin-email@example.com'),
  'optimus_prime'::team_role_enum,
  'Initial admin bootstrap'
);"
```

## Assigning Additional Admins

Once you have your first `optimus_prime` admin, you can assign roles through:

### Future: Admin Management UI (To Be Implemented)

The admin dashboard will include a user management interface where `optimus_prime` users can:
- View all users and their roles
- Promote/demote users
- View role change audit logs

### Current: Direct Function Call

Create an edge function or use the database function directly:

```sql
-- Promote a user to prime admin
SELECT assign_team_role(
  (SELECT id FROM auth.users WHERE email = 'new-admin@example.com'),
  'prime'::team_role_enum,
  'Promoted to admin by [your name]'
);

-- Promote a user to autobot (Uhuru Plus user, NOT admin)
SELECT assign_team_role(
  (SELECT id FROM auth.users WHERE email = 'plus-user@example.com'),
  'autobot'::team_role_enum,
  'Upgraded to Uhuru Plus'
);

-- Demote a user back to free tier
SELECT assign_team_role(
  (SELECT id FROM auth.users WHERE email = 'former-admin@example.com'),
  'free'::team_role_enum,
  'Access revoked'
);
```

## Security Features

### Audit Logging

All role changes are automatically logged in the `admin_role_audit_log` table:

```sql
-- View role change history for a user
SELECT * FROM get_user_role_history(
  (SELECT id FROM auth.users WHERE email = 'user@example.com')
);

-- View all recent role changes (optimus_prime or prime only)
SELECT
  u.email as user_email,
  arl.old_role,
  arl.new_role,
  u2.email as changed_by,
  arl.change_reason,
  arl.changed_at
FROM admin_role_audit_log arl
JOIN auth.users u ON u.id = arl.user_id
LEFT JOIN auth.users u2 ON u2.id = arl.changed_by
ORDER BY arl.changed_at DESC
LIMIT 50;
```

### Protection Against Self-Demotion

The `assign_team_role` function prevents `optimus_prime` users from demoting themselves:

```sql
-- This will fail with an error
SELECT assign_team_role(
  auth.uid(), -- trying to change own role
  'free'::team_role_enum,
  'Attempting self-demotion'
);
-- Error: "Cannot demote yourself from optimus_prime role"
```

### Row Level Security

All admin checks now use RLS policies that reference `user_profiles.team_role`:

```sql
-- Example: Admin can view all documents
CREATE POLICY "Admins can view all documents"
  ON user_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );
```

## Helper Functions

### Check if User is Admin

```sql
SELECT is_admin((SELECT id FROM auth.users WHERE email = 'user@example.com'));
-- Returns: true or false
```

### Get User's Current Role

```sql
SELECT get_user_role((SELECT id FROM auth.users WHERE email = 'user@example.com'));
-- Returns: optimus_prime, prime, autobot, or free
```

## Troubleshooting

### "User not found" Error

Make sure the user has signed up first:

```sql
-- Check if user exists
SELECT id, email, created_at
FROM auth.users
WHERE email = 'user@example.com';
```

### Role Not Taking Effect

The user may need to refresh their session:
1. Have them log out
2. Have them log back in
3. Their new role should now be active

Or force a profile refresh from the application.

### Viewing Current Admins

```sql
-- List all users with admin roles
SELECT
  u.email,
  p.team_role,
  p.created_at as profile_created,
  p.last_active_at
FROM user_profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.team_role IN ('optimus_prime', 'prime')
ORDER BY
  CASE p.team_role
    WHEN 'optimus_prime' THEN 1
    WHEN 'prime' THEN 2
    WHEN 'autobot' THEN 3
  END;
```

## Migration from Old System

If you had users who previously had admin access via hardcoded email checks, you need to manually assign them roles:

```sql
-- Example: Assign role to all previous @orionx.xyz users
-- ONLY RUN THIS IF YOU TRUST ALL THESE USERS!
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN
    SELECT id FROM auth.users WHERE email LIKE '%@orionx.xyz'
  LOOP
    PERFORM assign_team_role(
      user_record.id,
      'autobot'::team_role_enum,
      'Migrated from legacy email-based admin system'
    );
  END LOOP;
END $$;
```

## Best Practices

1. **Principle of Least Privilege**: Only assign `optimus_prime` to trusted individuals who need full system access
2. **Use `prime` for Admins**: Most admin tasks can be accomplished with `prime` role
3. **Document Role Changes**: Always provide a meaningful `change_reason` when calling `assign_team_role`
4. **Regular Audits**: Periodically review the admin list and audit logs
5. **Rotate Admins**: When team members leave, immediately revoke their admin access

## Support

If you encounter issues with admin assignment:
1. Check the Supabase logs for error messages
2. Verify the user exists in `auth.users`
3. Ensure the `user_profiles` table has a row for the user
4. Check that migrations have been applied correctly

For additional help, check the `admin_role_audit_log` table for clues about what might have gone wrong.
