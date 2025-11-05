# Admin Users Setup

## Confirmed Admin Access

### Super Admin (supa_admin)
Previously known as `optimus_prime`, this is the highest privilege level.

**Access:**
- ✅ Admin Dashboard
- ✅ All administrative features
- ✅ Role assignment capabilities
- ✅ Full system access

### Admin Users (admin)
Previously known as `autobot`, standard administrative access.

**Pencils of Promise Team Members:**
1. **skpo@pencilsofpromise.org**
2. **sklu@pencilsofpromise.org**
3. **ddavordzi@pencilsofpromise.org**

**Access:**
- ✅ Admin Dashboard
- ✅ Administrative features
- ❌ Cannot assign roles (only supa_admin can)

### Premium Users (prime)
Premium user tier with admin dashboard access.

**Access:**
- ✅ Admin Dashboard
- ✅ Administrative features
- ✅ Premium user features
- ❌ Cannot assign roles (only supa_admin can)

---

## How Admin Assignment Works

### For Existing Users
When the migration runs, any existing users with these emails will automatically have their role updated to `admin`.

### For New Signups
A database trigger automatically assigns the `admin` role when any of the three Pencils of Promise email addresses sign up.

**The trigger:**
```sql
CREATE TRIGGER assign_pencils_admin_role_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_pencils_of_promise_admin_role();
```

---

## Verifying Admin Access

After the migration, you can verify admin assignments with this SQL query:

```sql
SELECT
  u.email,
  up.display_name,
  up.team_role,
  up.created_at
FROM user_profiles up
JOIN auth.users u ON up.id = u.id
WHERE u.email IN (
  'skpo@pencilsofpromise.org',
  'sklu@pencilsofpromise.org',
  'ddavordzi@pencilsofpromise.org'
)
ORDER BY u.email;
```

Expected result: All three users should show `team_role = 'admin'`

---

## Adding More Admin Users

To add additional admin users in the future:

### Option 1: Update the Migration File
Add the new email to the migration file before deployment:

```sql
UPDATE user_profiles
SET team_role = 'admin'::team_role_enum
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'skpo@pencilsofpromise.org',
    'sklu@pencilsofpromise.org',
    'ddavordzi@pencilsofpromise.org',
    'newemail@pencilsofpromise.org'  -- Add new email here
  )
);
```

### Option 2: Manual Update (if already deployed)
Run this SQL in your Supabase SQL editor:

```sql
UPDATE user_profiles
SET team_role = 'admin'::team_role_enum
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email = 'newemail@pencilsofpromise.org'
);
```

### Option 3: Use the assign_team_role Function
If you have `supa_admin` access, you can use the built-in function:

```sql
SELECT assign_team_role(
  (SELECT id FROM auth.users WHERE email = 'newemail@pencilsofpromise.org'),
  'admin'::team_role_enum,
  'Adding new Pencils of Promise admin'
);
```

---

## Security Notes

1. **Role Assignment Audit Trail**: All role changes made via `assign_team_role()` are logged in the `admin_role_audit` table (if it exists)

2. **Only supa_admin Can Assign Roles**: The `assign_team_role()` function checks that the caller has `supa_admin` role before allowing role assignments

3. **Automatic Assignment is Restricted**: The trigger only auto-assigns admin role to the three specific email addresses listed

4. **RLS Protection**: All admin policies require authentication and check for `supa_admin` or `admin` role

---

## Troubleshooting

### User Can't Access Admin Dashboard

1. **Check their role:**
   ```sql
   SELECT u.email, up.team_role
   FROM user_profiles up
   JOIN auth.users u ON up.id = u.id
   WHERE u.email = 'user@example.com';
   ```

2. **Verify they're logged in:** Admin access requires authentication

3. **Check is_admin() function:**
   ```sql
   SELECT is_admin(
     (SELECT id FROM auth.users WHERE email = 'user@example.com')
   );
   ```
   Should return `true` for admin and supa_admin users

### Trigger Not Working

Verify the trigger exists:
```sql
SELECT * FROM pg_trigger
WHERE tgname = 'assign_pencils_admin_role_trigger';
```

If missing, recreate it:
```sql
CREATE TRIGGER assign_pencils_admin_role_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_pencils_of_promise_admin_role();
```

---

## Migration Files

1. **20251104110439_update_admin_role_hierarchy.sql**
   - Updates role enum types
   - Migrates all existing roles
   - Updates is_admin() function
   - Updates all RLS policies

2. **20251104113120_add_pencils_of_promise_admin_users.sql**
   - Updates existing Pencils of Promise users to admin
   - Creates trigger for automatic admin assignment
   - Provides verification logging

Both migrations are idempotent and safe to run multiple times.
