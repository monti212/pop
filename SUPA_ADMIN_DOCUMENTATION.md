# Supa Admin Account Documentation

## Overview

The **supa_admin** role (accessed via `.uhuru` account) represents the highest level of administrative access in the Pencils of Promise Uhuru AI system. This account has full visibility and control over all system operations, monitoring, and data.

## Account Details

**Supa Admin Accounts**:
- **monti@orionx.xyz** - Primary supa_admin
- **gaone@orionx.xyz** - Secondary supa_admin

- **Role**: `supa_admin` (highest privilege level)
- **Access Level**: Full system access - all tables, functions, and operations
- **Purpose**: System monitoring, administration, security oversight, and operational management

**Note**: Both accounts can be used as normal users AND have full supa_admin privileges.

## Role Hierarchy

The system uses a 4-tier role hierarchy:

1. **supa_admin** (Highest) - Full system administrative access
2. **admin** - Standard administrative dashboard access
3. **prime** - Premium user features (NO admin access)
4. **free** - Basic user features (NO admin access)

**Note**: Only `supa_admin` role has the ability to:
- Assign/change user roles
- Access all monitoring and analytics data
- Modify system configurations
- View security audit logs
- Manage token caps and refills

---

## Complete System Access

### 1. Database Tables (61 Total)

The supa_admin account has SELECT, INSERT, UPDATE, and DELETE access to all tables:

#### **User Management**
- `user_profiles` - User account information and roles
- `activity_logs` - User activity tracking
- `user_activity_metrics` - Aggregated user metrics
- `phone_verifications` - Phone number verification records

#### **Token Tracking & Management**
- `organization_token_balances` - Organization-wide token tracking (10.25M cap)
- `user_token_usage` - Individual user token consumption
- `token_refills` - Purchased token refills with expiration
- `token_cap_audit_log` - Audit trail for token cap changes
- `image_generation_log` - Image generation tracking
- `token_usage_metrics` - Historical token usage data
- `usage_events` - Token usage event log
- `usage_metrics` - Aggregated usage statistics
- `model_usage_logs` - Per-model usage tracking
- `model_usage_daily_summary` - Daily model usage summaries

#### **Monitoring & Analytics**
- `system_metrics` - Real-time system performance metrics
- `active_sessions_log` - User session tracking for concurrency
- `api_performance_log` - API endpoint performance monitoring
- `error_log` - Centralized error tracking
- `alert_history` - System alerts and incidents
- `database_metrics` - Database performance metrics
- `organization_metrics` - Organization-level KPIs
- `impact_metrics` - Impact measurement data

#### **Conversations & Messages**
- `conversations` - Chat conversation records
- `messages` - Individual chat messages
- `conversation_summaries` - Conversation summaries
- `parent_messages` - Parent communication records

#### **AI Knowledge Base**
- `admin_knowledge_documents` - Admin-uploaded knowledge base documents
- `knowledge_base_documents` - User knowledge base documents
- `knowledge_base_summaries` - Document summaries (micro, standard, full)
- `knowledge_base_chunks` - Document chunks for semantic search
- `knowledge_base_embeddings` - Vector embeddings for documents
- `knowledge_base_categories` - Document categorization
- `knowledge_base_retrievals` - Knowledge base retrieval logs
- `knowledge_base_training_jobs` - Training job tracking
- `knowledge_base_audit_log` - Knowledge base change audit

#### **Teacher Assistant Features**
- `classes` - Teacher classes
- `students` - Student records
- `student_rosters` - Class enrollment
- `schools` - School information
- `assessments` - Student assessments
- `grading_rubrics` - Grading criteria
- `lesson_plans` - Lesson plan records
- `teaching_analytics` - Teaching effectiveness metrics
- `teaching_preferences` - Teacher preferences
- `teaching_resources` - Educational resources
- `teaching_tips` - Teaching suggestions
- `teacher_announcements` - Announcements
- `teacher_calendar` - Calendar events
- `task_lists` - Teacher task lists
- `classroom_groups` - Student groupings
- `attendance_records` - Attendance tracking

#### **Document Management**
- `user_documents` - User-created documents
- `user_sheets` - Spreadsheet documents
- `user_files` - File uploads
- `file_folders` - Folder hierarchy
- `file_shares` - File sharing
- `focus_sets` - Document focus sets
- `file_focus_sets` - File-focus set relationships
- `focus_set_files` - Focus set file associations
- `class_documents` - Class-specific documents
- `class_folders` - Class document folders

#### **WhatsApp Integration**
- `whatsapp_messages` - WhatsApp message log
- `whatsapp_sessions` - WhatsApp conversation sessions
- `whatsapp_users` - WhatsApp user profiles
- `whatsapp_usage` - WhatsApp usage metrics
- `whatsapp_user_context` - User context storage
- `whatsapp_settings` - WhatsApp configuration

---

## Administrative Functions

### Token Management Functions

#### 1. **calculate_rollover_tokens(organization_name)**
- Calculates rollover tokens from previous month
- Maximum: 833,333 tokens
- Used for monthly cap calculation

#### 2. **calculate_monthly_cap(organization_name)**
- Returns: 833,333 + rollover_in
- Dynamic monthly limit based on previous month usage

#### 3. **calculate_monthly_balance(organization_name)**
- Returns: max(0, monthly_cap - used_this_month)
- Current available tokens for the month

#### 4. **calculate_refill_balance(organization_name)**
- Sums all unexpired refills (amount - consumed)
- Returns total available refill tokens

#### 5. **calculate_total_plan_balance(organization_name)**
- Total available tokens including YTD and refills
- Formula: max(0, total_cap - used_ytd) + refill_balance

#### 6. **calculate_image_tokens_used(organization_name)**
- Formula: (low × 50) + (med × 125) + (high × 500)
- Currently all images are low quality (50 tokens)

#### 7. **calculate_image_tokens_remaining(organization_name)**
- Returns: max(0, 250,000 - image_tokens_used)
- Image-specific token balance

#### 8. **get_token_metrics(organization_name)**
- Returns ALL token metrics in single call
- Used for dashboard display
- Includes percentages and trends

#### 9. **get_user_token_usage_details(organization_name, limit)**
- Returns per-user breakdown
- Includes email, monthly usage, YTD usage, images
- Sorted by usage (highest first)

#### 10. **add_token_refill(organization_name, amount, expires_at, notes)**
- **SUPA_ADMIN ONLY**
- Adds purchased token refill
- Automatically logs in audit trail
- Returns refill ID

#### 11. **adjust_token_cap(organization_name, new_cap)**
- **SUPA_ADMIN ONLY**
- Modifies organization token cap
- Logs old and new values
- Audit trail maintained

### User Management Functions

#### 12. **assign_team_role(target_user_id, new_role, reason)**
- **SUPA_ADMIN ONLY**
- Changes user role (free, prime, admin, supa_admin)
- Logs all role changes with reason
- Audit trail in admin_role_audit

#### 13. **get_user_role(user_id)**
- Returns user's current role
- Defaults to 'free' if not found

#### 14. **is_admin(user_id)**
- Returns true if user is supa_admin, admin, or prime
- Used for permission checks

### Monitoring Functions

#### 15. **get_concurrent_users_count()**
- Returns count of active users (last 15 minutes)
- Used for capacity planning

#### 16. **record_system_metric(metric_type, metric_value, metadata)**
- Records custom system metrics
- Used for tracking performance KPIs

#### 17. **trigger_alert(alert_type, severity, message, metric_value, threshold)**
- Creates system alert
- Severity: 'warning' or 'critical'
- Returns alert ID

#### 18. **get_class_documents_with_folders(class_id)**
- Returns organized document structure
- Used for class document management

#### 19. **get_class_document_stats(class_id)**
- Returns document statistics per class
- Counts by type and recent activity

### Analytics Functions

#### 20. **get_user_activity_summary()**
- Returns aggregated user activity
- Daily, weekly, monthly active users

#### 21. **get_token_usage_summary()**
- Organization-wide token consumption
- Includes trends and projections

---

## Admin Dashboard Pages (19 Total)

The supa_admin account has access to comprehensive monitoring dashboards:

### 1. **Comprehensive Admin Dashboard** (`ComprehensiveAdminDashboard.tsx`)
- Central hub for all metrics
- Real-time system overview
- Quick access to all sub-dashboards

### 2. **Dashboard Overview** (`DashboardOverview.tsx`)
- Executive summary view
- Key performance indicators
- High-level metrics

### 3. **AI Knowledge Base** (`AIKnowledgeBase.tsx`)
- Manage admin knowledge documents
- Upload and process documents
- View document summaries and metadata
- Token efficiency tracking

### 4. **Token Usage** (`TokenUsage.tsx`)
- Organization token balance (10.25M cap)
- Daily usage (30,000 limit)
- Monthly usage with rollover
- Refill management
- Per-user breakdown

### 5. **Token Cost Breakdown** (`TokenCostBreakdown.tsx`)
- Cost analysis by model
- Price per token calculations
- Budget forecasting
- ROI tracking

### 6. **Cost Breakdown Maker** (`CostBreakdownMaker.tsx`)
- Custom cost analysis tools
- Budget scenario modeling
- Cost allocation reports

### 7. **User Activity Dashboard** (`UserActivityDashboard.tsx`)
- Real-time user activity
- Session tracking
- Login/logout patterns
- Feature usage by user

### 8. **Live System Monitor** (`LiveSystemMonitor.tsx`)
- Real-time system health
- Server status
- Connection pool usage
- Response times
- Active requests

### 9. **Performance Metrics** (`PerformanceMetrics.tsx`)
- API endpoint performance
- Response time distribution
- Slow query identification
- Throughput analysis

### 10. **API & Network Performance** (`APINetworkPerformance.tsx`)
- Network latency tracking
- API call success rates
- Error rate monitoring
- Regional performance

### 11. **Database Health Monitor** (`DatabaseHealthMonitor.tsx`)
- Database connections (active/max)
- Query performance
- Table sizes
- Index usage
- Cache hit ratios
- Slow query log

### 12. **Error Tracking Dashboard** (`ErrorTrackingDashboard.tsx`)
- Centralized error log
- Error categorization (frontend, backend, database, external_api)
- Severity levels (critical, error, warning, info)
- Stack traces
- Resolution tracking

### 13. **Alerts & Incidents Dashboard** (`AlertsIncidentsDashboard.tsx`)
- Active alerts
- Alert history
- Incident management
- Acknowledgment tracking
- Resolution notes

### 14. **Feature Usage Dashboard** (`FeatureUsageDashboard.tsx`)
- Feature adoption rates
- Most/least used features
- User engagement metrics
- Feature request tracking

### 15. **Business Intelligence Dashboard** (`BusinessIntelligenceDashboard.tsx`)
- Strategic insights
- Growth metrics
- User retention
- Conversion funnels
- Revenue analytics

### 16. **Capacity Planning Dashboard** (`CapacityPlanningDashboard.tsx`)
- Concurrent user tracking (target: 500)
- Resource utilization
- Scaling recommendations
- Load projections

### 17. **System Configuration Dashboard** (`SystemConfigurationDashboard.tsx`)
- System settings management
- Environment variables
- Feature flags
- Integration configurations

### 18. **WhatsApp Messages** (`WhatsAppMessages.tsx`)
- All WhatsApp conversations
- Message history
- User interactions
- Response analytics

### 19. **WhatsApp Settings** (`WhatsAppSettings.tsx`)
- WhatsApp integration configuration
- Phone number management
- Webhook settings
- Message templates

---

## Monitoring Capabilities

### Real-Time Metrics Tracked

#### System Performance
- **Concurrent Users**: Current active users (target: 500 teachers)
- **Connection Pool**: Database connections (active/max)
- **Response Times**: Average API response time
- **Error Rate**: Percentage of failed requests
- **System Uptime**: Time since last restart
- **CPU Usage**: Server CPU utilization
- **Memory Usage**: Server memory consumption

#### Token Usage
- **Total Cap**: 10,250,000 tokens
- **Used Today**: Daily consumption (limit: 30,000)
- **Used This Month**: Monthly consumption (cap: 833,333 + rollover)
- **Used YTD**: Year-to-date total
- **Rollover Balance**: Tokens carried from previous month (max: 833,333)
- **Refill Balance**: Available refill tokens
- **Image Tokens**: Separate 250,000 image token pool
- **Daily Usage %**: Percentage of daily limit consumed
- **Monthly Usage %**: Percentage of monthly cap consumed
- **YTD Usage %**: Percentage of annual cap consumed

#### User Engagement
- **Total Users**: All registered users
- **Active Today**: Users active in last 24 hours
- **Active This Week**: Users active in last 7 days
- **Active This Month**: Users active in last 30 days
- **New Users Today**: Sign-ups in last 24 hours
- **Retention Rate**: User retention percentage

#### Conversations
- **Total Conversations**: All-time conversation count
- **Conversations Today**: New conversations today
- **Total Messages**: All-time message count
- **Messages Today**: Messages sent today
- **Avg Messages/Conversation**: Engagement metric
- **Avg Response Time**: AI response latency

#### Files & Images
- **Total Files Processed**: Documents uploaded and processed
- **Files Uploaded Today**: Today's file uploads
- **Images Generated**: Total image generations
- **Images Today**: Today's image generations
- **Knowledge Base Documents**: Admin knowledge base size
- **User Documents**: User-created documents

#### WhatsApp Integration
- **Total WhatsApp Users**: Registered WhatsApp users
- **Active WhatsApp Sessions**: Current active conversations
- **Messages Sent**: Total WhatsApp messages
- **Messages Received**: Incoming WhatsApp messages
- **Response Rate**: Percentage of messages answered

### Alert Thresholds

The system automatically triggers alerts when:

1. **Connection Pool Warning**: Active connections > 80% of max
2. **Connection Pool Critical**: Active connections > 95% of max
3. **Token Limit Warning**: Daily usage > 80% (24,000 tokens)
4. **Token Limit Critical**: Daily usage > 95% (28,500 tokens)
5. **Monthly Cap Warning**: Monthly usage > 80% of cap
6. **Monthly Cap Critical**: Monthly usage > 95% of cap
7. **Error Rate High**: Error rate > 5%
8. **Error Rate Critical**: Error rate > 10%
9. **Response Time Slow**: Average response > 2 seconds
10. **Response Time Critical**: Average response > 5 seconds
11. **Concurrent Users High**: Active users > 400 (80% of capacity)
12. **Concurrent Users Critical**: Active users > 475 (95% of capacity)

---

## Security & Audit

### Row Level Security (RLS)

Every table has RLS enabled with policies that restrict access based on `team_role`:

```sql
-- Example: Only supa_admin can view monitoring data
CREATE POLICY "Only supa_admin can view system metrics"
  ON system_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );
```

### Audit Trails

All administrative actions are logged:

1. **token_cap_audit_log**: Token cap changes and refills
2. **admin_role_audit** (if exists): Role assignment changes
3. **knowledge_base_audit_log**: Knowledge base modifications
4. **activity_logs**: General user activity

Each audit record includes:
- Admin user ID and email
- Target user/resource
- Action type
- Old and new values
- Timestamp
- Reason/notes

### Access Control

**Supa Admin Can:**
- View all user data and activity
- Modify token caps and add refills
- Assign/revoke user roles
- Access all monitoring dashboards
- View error logs and stack traces
- Acknowledge and resolve alerts
- Export all data
- Modify system configuration
- Access database directly

**Supa Admin Cannot:**
- Directly access other users' passwords (hashed by Supabase Auth)
- Bypass RLS without explicit policy
- Modify historical audit logs (append-only)

---

## Usage Examples

### View Organization Token Balance

```typescript
const { data } = await supabase.rpc('get_token_metrics', {
  p_organization_name: 'Pencils of Promise'
});

console.log(`Total Cap: ${data.total_token_cap}`);
console.log(`Used This Month: ${data.used_text_this_month}`);
console.log(`Monthly Balance: ${data.monthly_balance}`);
console.log(`Refill Balance: ${data.refill_balance}`);
```

### Add Token Refill

```typescript
const { data, error } = await supabase.rpc('add_token_refill', {
  p_organization_name: 'Pencils of Promise',
  p_amount: 1000000,
  p_expires_at: '2026-12-31T23:59:59Z',
  p_notes: 'Emergency refill for Q4 peak usage'
});

// Returns refill ID
console.log(`Refill added: ${data}`);
```

### Assign Admin Role to User

```typescript
const { data, error } = await supabase.rpc('assign_team_role', {
  target_user_id: 'user-uuid-here',
  new_role: 'admin',
  reason: 'Promoted to admin for dashboard access'
});

// Logs to audit trail automatically
```

### View Recent Errors

```typescript
const { data: errors } = await supabase
  .from('error_log')
  .select('*')
  .eq('resolved', false)
  .order('recorded_at', { ascending: false })
  .limit(50);

console.log(`Unresolved errors: ${errors.length}`);
```

### Check Concurrent Users

```typescript
const { data: count } = await supabase.rpc('get_concurrent_users_count');
console.log(`Active users: ${count} / 500 capacity`);
```

### View User Token Usage

```typescript
const { data: users } = await supabase.rpc('get_user_token_usage_details', {
  p_organization_name: 'Pencils of Promise',
  p_limit: 100
});

// Shows top 100 users by token consumption
users.forEach(user => {
  console.log(`${user.user_email}: ${user.used_text_this_month} tokens`);
});
```

---

## Daily Operations Checklist

### Morning Check (9:00 AM)

- [ ] Review overnight alerts and incidents
- [ ] Check system uptime and performance
- [ ] Verify daily token reset occurred
- [ ] Review error log for critical issues
- [ ] Check concurrent user capacity
- [ ] Verify WhatsApp integration status

### Mid-Day Check (12:00 PM)

- [ ] Monitor real-time token usage (should be < 15,000 by noon)
- [ ] Check API response times
- [ ] Review user activity patterns
- [ ] Monitor database connection pool

### End-of-Day Review (5:00 PM)

- [ ] Total daily token usage (should be < 30,000)
- [ ] User engagement metrics
- [ ] New user registrations
- [ ] Error rate for the day
- [ ] Unresolved alerts
- [ ] Database performance summary

### Weekly Tasks (Monday)

- [ ] Review weekly token trends
- [ ] Analyze user retention
- [ ] Check for slow API endpoints
- [ ] Review knowledge base usage
- [ ] Update capacity planning projections
- [ ] Export weekly analytics report

### Monthly Tasks (1st of Month)

- [ ] Verify monthly token rollover calculation
- [ ] Review monthly token consumption vs. cap
- [ ] Check refill balance and expiration dates
- [ ] Analyze monthly growth trends
- [ ] Review and acknowledge all resolved alerts
- [ ] Archive old logs (> 90 days)
- [ ] Update capacity planning for next month

---

## Critical Scenarios

### Token Limit Approaching (Daily)

**Alert**: Daily usage > 24,000 tokens (80%)

**Actions**:
1. Identify top token consumers (run `get_user_token_usage_details`)
2. Check for unusual spikes or abuse
3. Consider messaging high-usage users
4. Monitor closely until midnight reset

**Emergency**: Daily usage > 28,500 tokens (95%)

**Actions**:
1. IMMEDIATE: Consider rate limiting top users
2. Add token refill if critical operations affected
3. Investigate cause of spike
4. Document incident

### Token Cap Approaching (Monthly)

**Alert**: Monthly usage > 666,666 tokens (80% of 833,333)

**Actions**:
1. Analyze remaining days in month
2. Calculate projected usage
3. Consider adding refill if cap will be exceeded
4. Communicate usage status to stakeholders

**Critical**: Monthly usage > 791,666 tokens (95% of 833,333)

**Actions**:
1. Add token refill immediately if needed
2. Identify and contact high-usage users
3. Consider temporary usage restrictions
4. Plan for next month's allocation

### Concurrent Users Exceeding Capacity

**Alert**: Active users > 400 (80% of 500 capacity)

**Actions**:
1. Monitor connection pool usage
2. Check API response times
3. Verify database performance
4. Prepare to scale if needed

**Critical**: Active users > 475 (95% of 500 capacity)

**Actions**:
1. IMMEDIATE: Contact infrastructure team
2. Consider queue system for new connections
3. Scale database if possible
4. Communicate capacity status

### High Error Rate

**Alert**: Error rate > 5%

**Actions**:
1. Review error log immediately
2. Identify error patterns (type, endpoint, user)
3. Check external service status (OpenAI, Twilio)
4. Investigate and fix root cause

**Critical**: Error rate > 10%

**Actions**:
1. IMMEDIATE: Page on-call engineer
2. Consider service degradation mode
3. Communicate status to users
4. Emergency hotfix if needed

### Database Performance Degradation

**Alert**: Slow queries > 10 per hour

**Actions**:
1. Review slow query log
2. Analyze query execution plans
3. Check index usage
4. Optimize problematic queries

**Critical**: Database connections > 95% max

**Actions**:
1. IMMEDIATE: Kill idle connections
2. Identify connection leaks
3. Restart affected services if needed
4. Increase connection pool temporarily

---

## Emergency Contacts

### System Issues
- Infrastructure Team: [Contact details]
- Database Admin: [Contact details]
- On-Call Engineer: [Contact details]

### Token Management
- Finance Team: [Contact details]
- Budget Approver: [Contact details]

### Security Issues
- Security Team: [Contact details]
- Incident Response: [Contact details]

---

## Access Instructions

### How to Access Supa Admin Dashboard

1. **Login**: Navigate to the application login page
2. **Email**: `monti@orionx.xyz` OR `gaone@orionx.xyz`
3. **Password**: Set via Supabase Auth (use secure password manager)
4. **2FA**: [If enabled, use authenticator app]

**Enhanced Supa Admin Page**: Navigate to `/supa-admin` after login for full system control.

### Dashboard Navigation

From main admin dashboard:
- `/supa-admin` - Main enhanced dashboard
- `/supa-admin/tokens` - Token management
- `/supa-admin/users` - User management
- `/supa-admin/monitoring` - System monitoring
- `/supa-admin/knowledge-base` - AI knowledge base
- `/supa-admin/whatsapp` - WhatsApp integration
- `/supa-admin/analytics` - Business intelligence

---

## Best Practices

### Data Privacy
- Only access user data when necessary for support/monitoring
- Never share user information outside organization
- Log all data access for audit purposes
- Respect user privacy even with full access

### Token Management
- Monitor usage trends to prevent overages
- Add refills proactively, not reactively
- Document all cap adjustments with clear reasoning
- Review user usage patterns monthly

### System Monitoring
- Check dashboards at least 3 times daily
- Set up alerts for critical thresholds
- Respond to critical alerts within 15 minutes
- Document all incidents and resolutions

### Security
- Change password every 90 days
- Enable 2FA/MFA
- Never share supa_admin credentials
- Log out of admin sessions when done
- Use VPN when accessing from public networks

### Documentation
- Document all configuration changes
- Keep runbooks up to date
- Record unusual patterns or incidents
- Maintain change log for system modifications

---

## Change Log

| Date | Change | Modified By | Reason |
|------|--------|-------------|--------|
| 2025-11-04 | Role renamed from optimus_prime to supa_admin | System Migration | Clearer hierarchy |
| 2026-01-19 | Added gaone@orionx.xyz as supa_admin | System Update | Secondary supa_admin account |

---

## Related Documentation

- [TOKEN_TRACKING_SYSTEM.md](./TOKEN_TRACKING_SYSTEM.md) - Token management details
- [MONITORING_SYSTEM_IMPLEMENTATION.md](./MONITORING_SYSTEM_IMPLEMENTATION.md) - Monitoring infrastructure
- [ROLE_HIERARCHY_UPDATE_SUMMARY.md](./ROLE_HIERARCHY_UPDATE_SUMMARY.md) - Role system explanation
- [SECURITY_IMPLEMENTATION_SUMMARY.md](./SECURITY_IMPLEMENTATION_SUMMARY.md) - Security model
- [ADMIN_USERS_SETUP.md](./ADMIN_USERS_SETUP.md) - Admin user management

---

## Support

For questions about supa_admin access or capabilities:
- Email: tech-support@pencilsofpromise.org
- Slack: #uhuru-admin-support
- Emergency: [Emergency contact]

---

**Last Updated**: January 19, 2026
**Document Version**: 1.1
**Maintained By**: Uhuru AI Technical Team
