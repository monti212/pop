# Supa Admin vs Admin Privileges

## Overview

This document outlines the **distinct and non-overlapping** privileges between `supa_admin` and `admin` roles in the Pencils of Promise Uhuru AI system.

---

## Role Hierarchy

1. **supa_admin** - Full system administrative access (Highest)
2. **admin** - Standard administrative dashboard access (Limited)
3. **prime** - Premium user features with admin dashboard access
4. **free** - Basic user features (No admin access)

---

## Current Supa Admin Users

- **monti@orionx.xyz**
- **gaone@orionx.xyz**

Both emails can:
- Sign in as normal users
- Access all supa_admin privileges
- Use the platform with full system control

---

## Distinct Privilege Breakdown

### SUPA_ADMIN EXCLUSIVE PRIVILEGES

These functions and capabilities are **ONLY available to supa_admin** role:

#### 1. **Token Management Functions**

**`add_token_refill()`**
- Add purchased token refills to organization
- Set expiration dates for refills
- Track refill notes and metadata
- **Access**: Supa_admin ONLY
- **Code Location**: `supabase/migrations/20251108003952_create_token_calculation_functions.sql:320`

**`adjust_token_cap()`**
- Modify organization-wide token cap (default: 10.25M)
- Audit trail automatically logged
- Critical system function
- **Access**: Supa_admin ONLY
- **Code Location**: `supabase/migrations/20251108003952_create_token_calculation_functions.sql:392`

#### 2. **User Role Management**

**`assign_team_role()`**
- Assign or change any user's role
- Can promote users to admin, prime, free, or supa_admin
- Cannot demote themselves
- Full audit logging
- **Access**: Supa_admin ONLY
- **Code Location**: `supabase/migrations/20251003011312_secure_admin_role_management.sql:126`

**Role Assignment Rules**:
- Only supa_admin can change roles
- Admin CANNOT assign or modify roles
- Admin CANNOT promote themselves to supa_admin
- All role changes are logged in `admin_role_audit_log` table

#### 3. **System Monitoring Access**

**Full Database Access**:
- All 61 database tables with SELECT, INSERT, UPDATE, DELETE
- Complete system metrics visibility
- Access to all audit logs
- Token usage tracking across all users
- Security incident logs

**Monitoring Tables** (supa_admin exclusive read access):
- `token_cap_audit_log` - Token cap modification history
- `admin_role_audit_log` - Role assignment audit trail
- `system_metrics` - Real-time system performance
- `error_log` - Centralized error tracking
- `alert_history` - System alerts and incidents
- `database_metrics` - Database performance metrics
- `organization_metrics` - Organization-level KPIs

#### 4. **Configuration Control**

- Modify system-wide settings
- Access environment configurations
- Manage feature flags
- Control integration settings
- Adjust capacity limits

---

### ADMIN PRIVILEGES (NOT SUPA_ADMIN)

These capabilities are available to **admin** role but do NOT include supa_admin-exclusive functions:

#### 1. **Dashboard Access**

**Available Pages**:
- Dashboard Overview - Executive summary
- User Activity Dashboard - User engagement metrics
- Live System Monitor - Real-time health monitoring
- Performance Metrics - API performance tracking
- API & Network Performance - Network latency
- Database Health Monitor - Connection pool, query performance
- Error Tracking Dashboard - View errors (cannot modify audit)
- Alerts & Incidents Dashboard - View and acknowledge alerts
- Feature Usage Dashboard - Feature adoption tracking
- Business Intelligence Dashboard - Growth metrics
- Capacity Planning Dashboard - Resource utilization
- WhatsApp Messages - Message history (read-only)
- WhatsApp Settings - View settings (cannot modify critical configs)

**Restricted Pages** (View-only, no modifications):
- Token Usage - Can VIEW but cannot add refills or adjust caps
- Token Cost Breakdown - Read-only analytics
- AI Knowledge Base - Can VIEW but with limited upload permissions

#### 2. **Read-Only Monitoring**

Admins can VIEW but CANNOT MODIFY:
- Token usage metrics
- User activity data
- System performance data
- Error logs
- Alert history

Admins CANNOT:
- Add token refills
- Adjust token caps
- Modify user roles
- Change system configuration
- Access audit modification logs
- Resolve critical security incidents

#### 3. **Teacher Assistant Features**

Full access to:
- Class management
- Student records
- Attendance tracking
- Assessment management
- Lesson plan creation
- Grade management
- Document management

#### 4. **Knowledge Base**

- Upload documents (with rate limiting)
- View knowledge base documents
- Cannot modify admin-uploaded knowledge base
- Cannot manage system-wide knowledge settings

---

## Function Access Matrix

| Function | Supa_Admin | Admin | Prime | Free |
|----------|-----------|-------|-------|------|
| `add_token_refill()` | ✅ | ❌ | ❌ | ❌ |
| `adjust_token_cap()` | ✅ | ❌ | ❌ | ❌ |
| `assign_team_role()` | ✅ | ❌ | ❌ | ❌ |
| `is_admin()` | ✅ | ✅ | ✅ | ❌ |
| `is_supa_admin()` | ✅ | ❌ | ❌ | ❌ |
| View admin dashboard | ✅ | ✅ | ✅ | ❌ |
| Modify system config | ✅ | ❌ | ❌ | ❌ |
| View all user data | ✅ | ✅ | ✅ | ❌ |
| Manage classes | ✅ | ✅ | ✅ | ✅ |
| Upload knowledge docs | ✅ | ✅ (limited) | ✅ (limited) | ✅ (limited) |

---

## Database Table Access

### Supa_Admin EXCLUSIVE Tables:
- `token_cap_audit_log` - Token cap modifications
- `admin_role_audit_log` - Role assignment history
- `token_refills` - Refill purchases (supa_admin can INSERT)

### Admin READ-ONLY Tables:
- `organization_token_balances` - Can view, cannot modify
- `user_token_usage` - Can view, cannot modify
- `system_metrics` - Can view, cannot modify
- `error_log` - Can view, cannot resolve
- `alert_history` - Can view and acknowledge, cannot modify audit

### Shared Access Tables:
- `conversations` - Both can view all
- `messages` - Both can view all
- `classes` - Both can manage
- `students` - Both can manage
- `attendance_records` - Both can manage
- `user_documents` - Both can view all

---

## Helper Functions

### `is_admin()`
```sql
-- Returns TRUE for: supa_admin, admin, prime
-- Returns FALSE for: free
-- Used for: Basic admin dashboard access
```

### `is_supa_admin()`
```sql
-- Returns TRUE for: supa_admin ONLY
-- Returns FALSE for: admin, prime, free
-- Used for: Critical system functions
```

---

## Security Enforcement

### How Privileges Are Enforced:

1. **Function Level** - Functions check `team_role = 'supa_admin'` explicitly
2. **RLS Policies** - Row Level Security restricts table access
3. **Frontend Guards** - `SupaAdminRoute.tsx` checks email explicitly
4. **JWT Metadata** - Role stored in JWT for performance

### Example: add_token_refill()
```sql
-- Verify user is supa_admin
SELECT email INTO v_admin_email
FROM auth.users
JOIN user_profiles ON auth.users.id = user_profiles.id
WHERE auth.users.id = auth.uid()
  AND user_profiles.team_role = 'supa_admin';

IF NOT FOUND THEN
  RAISE EXCEPTION 'Only supa_admin can add token refills';
END IF;
```

---

## Current User Assignments

### Supa_Admin Users:
- **monti@orionx.xyz** - Full system access
- **gaone@orionx.xyz** - Full system access

### Admin Users (Standard):
- **skpo@pencilsofpromise.org** - Pencils of Promise team
- **sklu@pencilsofpromise.org** - Pencils of Promise team
- **ddavordzi@pencilsofpromise.org** - Pencils of Promise team

### Prime Users:
- Can access admin dashboard
- Cannot modify system settings
- Cannot assign roles
- Cannot manage tokens

---

## Best Practices

### For Supa_Admin:
1. **Token Management**
   - Only add refills when necessary
   - Document reason in notes field
   - Review token usage before adding refills

2. **Role Assignment**
   - Always provide reason when assigning roles
   - Verify user identity before promoting to admin
   - Never demote yourself
   - Review audit logs monthly

3. **System Monitoring**
   - Check critical alerts daily
   - Review error logs weekly
   - Analyze token trends monthly
   - Audit role changes quarterly

### For Admin:
1. **Dashboard Usage**
   - Monitor system health regularly
   - Report anomalies to supa_admin
   - Acknowledge alerts promptly
   - Document incident resolutions

2. **User Management**
   - Cannot change roles - escalate to supa_admin
   - Focus on teacher support and class management
   - Help users with feature adoption

3. **Token Awareness**
   - Monitor token usage trends
   - Report high-usage patterns to supa_admin
   - Cannot add refills - request from supa_admin

---

## Emergency Escalation

### When Admin Needs Supa_Admin Action:

1. **Token Limit Approaching**
   - Admin observes approaching limit
   - Contact supa_admin immediately
   - Provide usage analysis
   - Supa_admin adds refill if needed

2. **User Role Request**
   - Admin receives role change request
   - Verify user identity and need
   - Submit request to supa_admin
   - Supa_admin executes role assignment

3. **Critical System Issue**
   - Admin observes critical alert
   - Cannot resolve system-level issue
   - Escalate to supa_admin immediately
   - Document incident details

### Supa_Admin Contacts:
- **monti@orionx.xyz**
- **gaone@orionx.xyz**

---

## Audit Trail

All supa_admin actions are automatically logged:

### Token Actions:
```sql
-- Logged in: token_cap_audit_log
- Action type (refill_added, cap_adjustment)
- Admin user ID and email
- Old and new values
- Timestamp
- Detailed JSON metadata
```

### Role Actions:
```sql
-- Logged in: admin_role_audit_log
- Target user ID
- Old role → New role
- Changed by (supa_admin ID)
- Change reason
- Timestamp
```

---

## Summary

**Supa_Admin**:
- Full system control
- Can modify tokens, roles, configuration
- Has exclusive access to critical functions
- Manages other admins
- Complete audit trail access

**Admin**:
- Dashboard and monitoring access
- Cannot modify tokens or roles
- Cannot change system configuration
- Focuses on user support and operations
- Escalates critical actions to supa_admin

**Key Principle**: Admin can VIEW and MANAGE operational features, but only Supa_Admin can MODIFY system-level settings and execute critical functions.

---

**Last Updated**: January 19, 2026
**Document Version**: 1.0
**Maintained By**: Uhuru AI Technical Team
