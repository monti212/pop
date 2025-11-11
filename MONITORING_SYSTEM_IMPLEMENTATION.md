# Monitoring System Implementation

## Overview

A comprehensive monitoring infrastructure designed to track system performance, user activity, and operational metrics to support **500 concurrent teachers** with real-time visibility and alerting capabilities.

## Migration Reference

- **Migration File**: `20251110211004_create_monitoring_metrics_schema.sql`
- **Applied**: November 10, 2025
- **Purpose**: Establish enterprise-grade monitoring for production scale operations

---

## Problem Solved

As the Pencils of Promise Uhuru AI system scales to support 500 concurrent teachers, we needed:

1. **Real-time visibility** into system health and performance
2. **Proactive alerting** before issues impact users
3. **Historical data** for trend analysis and capacity planning
4. **User activity tracking** for support and optimization
5. **Error tracking** with context for rapid debugging
6. **API performance monitoring** to identify bottlenecks
7. **Database health metrics** to prevent outages

Without this monitoring infrastructure, the team was blind to:
- Current system load and capacity utilization
- Performance degradation patterns
- Error rates and types
- User experience issues
- Resource constraints

---

## Implementation Details

### Database Schema

#### 1. system_metrics
Stores real-time and historical system performance metrics.

**Purpose**: Track any system-level metric over time for analysis and alerting.

**Columns**:
- `id` (uuid, primary key)
- `metric_type` (text) - Type of metric: concurrent_users, connection_pool, error_rate, response_time, etc.
- `metric_value` (numeric) - The measured value
- `metadata` (jsonb) - Additional context (region, breakdown, tags)
- `recorded_at` (timestamptz) - When the metric was recorded
- `created_at` (timestamptz)

**Indexes**:
```sql
CREATE INDEX system_metrics_type_time_idx
  ON system_metrics(metric_type, recorded_at DESC);

CREATE INDEX system_metrics_recorded_at_idx
  ON system_metrics(recorded_at DESC);
```

**Example Usage**:
```typescript
// Record current concurrent users
await supabase.rpc('record_system_metric', {
  p_metric_type: 'concurrent_users',
  p_metric_value: 342,
  p_metadata: { region: 'all', peak_hour: false }
});
```

#### 2. active_sessions_log
Tracks active user sessions for concurrent user monitoring and analytics.

**Purpose**: Monitor active user sessions to ensure capacity isn't exceeded and analyze usage patterns.

**Columns**:
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `session_start` (timestamptz)
- `session_end` (timestamptz, nullable) - NULL while session is active
- `last_activity` (timestamptz) - Updated on each user action
- `region` (text) - Geographic region
- `device_type` (text) - mobile, desktop, tablet
- `ip_address` (text)
- `created_at` (timestamptz)

**Indexes**:
```sql
CREATE INDEX active_sessions_user_idx
  ON active_sessions_log(user_id, session_start DESC);

CREATE INDEX active_sessions_activity_idx
  ON active_sessions_log(last_activity DESC)
  WHERE session_end IS NULL;

CREATE INDEX active_sessions_range_idx
  ON active_sessions_log(session_start, session_end);
```

**Example Usage**:
```typescript
// Get current concurrent users
const { data: activeCount } = await supabase.rpc('get_concurrent_users_count');
console.log(`Active users: ${activeCount} / 500 capacity`);

// Check if approaching capacity (400+ users = 80% threshold)
if (activeCount > 400) {
  await supabase.rpc('trigger_alert', {
    p_alert_type: 'concurrent_users_high',
    p_severity: 'warning',
    p_alert_message: 'Concurrent users approaching capacity',
    p_metric_value: activeCount,
    p_threshold_value: 400
  });
}
```

#### 3. api_performance_log
Detailed logging of API endpoint performance for optimization.

**Purpose**: Track API response times, identify slow endpoints, and monitor error rates.

**Columns**:
- `id` (uuid, primary key)
- `endpoint` (text) - API endpoint called (e.g., '/api/chat', '/api/upload')
- `method` (text) - HTTP method (GET, POST, PUT, DELETE)
- `response_time_ms` (integer) - Response time in milliseconds
- `status_code` (integer) - HTTP status code (200, 404, 500, etc.)
- `user_id` (uuid, nullable) - User who made the request
- `error_message` (text, nullable) - Error details if failed
- `request_size_bytes` (integer)
- `response_size_bytes` (integer)
- `recorded_at` (timestamptz)
- `created_at` (timestamptz)

**Indexes**:
```sql
CREATE INDEX api_performance_endpoint_time_idx
  ON api_performance_log(endpoint, recorded_at DESC);

CREATE INDEX api_performance_time_idx
  ON api_performance_log(recorded_at DESC);

CREATE INDEX api_performance_status_idx
  ON api_performance_log(status_code, recorded_at DESC);

CREATE INDEX api_performance_slow_queries_idx
  ON api_performance_log(response_time_ms DESC, recorded_at DESC)
  WHERE response_time_ms > 1000;
```

**Example Usage**:
```typescript
// Log API call performance
await supabase.from('api_performance_log').insert({
  endpoint: '/functions/v1/uhuru-llm-api',
  method: 'POST',
  response_time_ms: 1850,
  status_code: 200,
  user_id: userId,
  request_size_bytes: 2048,
  response_size_bytes: 15360
});

// Find slowest endpoints (last 24 hours)
const { data: slowEndpoints } = await supabase
  .from('api_performance_log')
  .select('endpoint, response_time_ms')
  .gte('recorded_at', new Date(Date.now() - 86400000).toISOString())
  .order('response_time_ms', { ascending: false })
  .limit(10);
```

#### 4. error_log
Centralized error tracking across all system components.

**Purpose**: Collect all errors in one place for monitoring, debugging, and resolution tracking.

**Columns**:
- `id` (uuid, primary key)
- `error_type` (text) - frontend, backend, database, external_api
- `severity` (text) - critical, error, warning, info
- `error_code` (text) - Application-specific error code
- `error_message` (text) - Human-readable error description
- `stack_trace` (text, nullable) - Full stack trace for debugging
- `user_id` (uuid, nullable) - User affected by error
- `endpoint` (text, nullable) - API endpoint where error occurred
- `context` (jsonb) - Additional context (request params, state, etc.)
- `resolved` (boolean) - Whether error has been addressed
- `resolved_at` (timestamptz, nullable)
- `resolved_by` (uuid, nullable) - Admin who resolved
- `recorded_at` (timestamptz)
- `created_at` (timestamptz)

**Indexes**:
```sql
CREATE INDEX error_log_severity_time_idx
  ON error_log(severity, recorded_at DESC);

CREATE INDEX error_log_type_time_idx
  ON error_log(error_type, recorded_at DESC);

CREATE INDEX error_log_unresolved_idx
  ON error_log(recorded_at DESC)
  WHERE resolved = false;

CREATE INDEX error_log_user_idx
  ON error_log(user_id, recorded_at DESC);
```

**Example Usage**:
```typescript
// Log error from frontend
await supabase.from('error_log').insert({
  error_type: 'frontend',
  severity: 'error',
  error_code: 'CHAT_STREAM_FAILED',
  error_message: 'Failed to stream chat response',
  stack_trace: error.stack,
  user_id: userId,
  endpoint: '/chat',
  context: {
    conversationId: convId,
    model: 'U-2.0',
    tokenCount: 1500
  }
});

// Get unresolved critical errors
const { data: criticalErrors } = await supabase
  .from('error_log')
  .select('*')
  .eq('severity', 'critical')
  .eq('resolved', false)
  .order('recorded_at', { ascending: false });
```

#### 5. alert_history
Track system alerts and incidents with resolution status.

**Purpose**: Record alerts triggered by threshold breaches and track their resolution.

**Columns**:
- `id` (uuid, primary key)
- `alert_type` (text) - connection_pool, token_limit, error_rate, concurrent_users, etc.
- `severity` (text) - warning, critical
- `alert_message` (text) - Human-readable alert description
- `metric_value` (numeric) - Current value that triggered alert
- `threshold_value` (numeric) - Threshold that was breached
- `acknowledged` (boolean) - Whether admin has seen alert
- `acknowledged_at` (timestamptz, nullable)
- `acknowledged_by` (uuid, nullable)
- `resolved` (boolean) - Whether issue is fixed
- `resolved_at` (timestamptz, nullable)
- `resolution_notes` (text, nullable) - Notes on how issue was resolved
- `triggered_at` (timestamptz)
- `created_at` (timestamptz)

**Indexes**:
```sql
CREATE INDEX alert_history_type_time_idx
  ON alert_history(alert_type, triggered_at DESC);

CREATE INDEX alert_history_unresolved_idx
  ON alert_history(triggered_at DESC)
  WHERE resolved = false;

CREATE INDEX alert_history_severity_idx
  ON alert_history(severity, triggered_at DESC);
```

**Example Usage**:
```typescript
// Trigger alert when daily token limit approaching
const { data: alertId } = await supabase.rpc('trigger_alert', {
  p_alert_type: 'token_limit_daily',
  p_severity: 'warning',
  p_alert_message: 'Daily token usage exceeds 80% (24,000 tokens)',
  p_metric_value: 24500,
  p_threshold_value: 24000
});

// Acknowledge alert
await supabase
  .from('alert_history')
  .update({
    acknowledged: true,
    acknowledged_at: new Date().toISOString(),
    acknowledged_by: adminUserId
  })
  .eq('id', alertId);

// Resolve alert
await supabase
  .from('alert_history')
  .update({
    resolved: true,
    resolved_at: new Date().toISOString(),
    resolution_notes: 'Added 1M token refill. Usage normalized after high-traffic period.'
  })
  .eq('id', alertId);
```

#### 6. database_metrics
Database-specific performance metrics for health monitoring.

**Purpose**: Track database health indicators to prevent performance issues and outages.

**Columns**:
- `id` (uuid, primary key)
- `active_connections` (integer) - Current active database connections
- `max_connections` (integer) - Maximum allowed connections
- `database_size_mb` (numeric) - Total database size in megabytes
- `cache_hit_ratio` (numeric) - Cache hit percentage (0-100)
- `transactions_per_second` (numeric) - TPS throughput
- `slow_query_count` (integer) - Number of slow queries (>1s)
- `cpu_usage_percent` (numeric) - Database server CPU usage
- `memory_usage_percent` (numeric) - Database server memory usage
- `recorded_at` (timestamptz)
- `created_at` (timestamptz)

**Indexes**:
```sql
CREATE INDEX database_metrics_time_idx
  ON database_metrics(recorded_at DESC);
```

**Example Usage**:
```typescript
// Record database metrics (typically done by background job)
await supabase.from('database_metrics').insert({
  active_connections: 45,
  max_connections: 100,
  database_size_mb: 2048,
  cache_hit_ratio: 98.5,
  transactions_per_second: 125.3,
  slow_query_count: 2,
  cpu_usage_percent: 35.2,
  memory_usage_percent: 62.1
});

// Check connection pool utilization
const { data: latestMetrics } = await supabase
  .from('database_metrics')
  .select('*')
  .order('recorded_at', { ascending: false })
  .limit(1)
  .single();

const utilizationPercent = (latestMetrics.active_connections / latestMetrics.max_connections) * 100;
if (utilizationPercent > 80) {
  console.warn('Connection pool utilization high:', utilizationPercent + '%');
}
```

---

### Security

All monitoring tables have Row Level Security (RLS) enabled with strict access controls:

#### Access Control

**Only supa_admin role can:**
- View monitoring data
- Insert metrics and logs
- Update alert status
- Resolve errors

**Example Policy**:
```sql
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

**Why This Matters**:
- Regular users cannot see other users' activity
- Sensitive system metrics are protected
- Error details (which may contain sensitive data) are restricted
- Only authorized admins can manage monitoring data

---

### Helper Functions

#### 1. get_concurrent_users_count()

Returns the current number of active users (last 15 minutes of activity).

**SQL**:
```sql
CREATE OR REPLACE FUNCTION get_concurrent_users_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT user_id)
    FROM active_sessions_log
    WHERE session_end IS NULL
    AND last_activity > now() - interval '15 minutes'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage**:
```typescript
const { data: count } = await supabase.rpc('get_concurrent_users_count');
console.log(`Active users: ${count} / 500`);
```

#### 2. record_system_metric()

Records a system metric with optional metadata.

**Parameters**:
- `p_metric_type` (text) - Type of metric
- `p_metric_value` (numeric) - Value to record
- `p_metadata` (jsonb) - Additional context

**Returns**: UUID of created metric record

**SQL**:
```sql
CREATE OR REPLACE FUNCTION record_system_metric(
  p_metric_type TEXT,
  p_metric_value NUMERIC,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_metric_id UUID;
BEGIN
  INSERT INTO system_metrics (metric_type, metric_value, metadata)
  VALUES (p_metric_type, p_metric_value, p_metadata)
  RETURNING id INTO v_metric_id;

  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage**:
```typescript
await supabase.rpc('record_system_metric', {
  p_metric_type: 'api_response_time',
  p_metric_value: 450,
  p_metadata: { endpoint: '/chat', percentile: 'p95' }
});
```

#### 3. trigger_alert()

Creates a system alert for threshold breaches.

**Parameters**:
- `p_alert_type` (text) - Type of alert
- `p_severity` (text) - 'warning' or 'critical'
- `p_alert_message` (text) - Description
- `p_metric_value` (numeric, optional) - Current value
- `p_threshold_value` (numeric, optional) - Threshold breached

**Returns**: UUID of created alert

**SQL**:
```sql
CREATE OR REPLACE FUNCTION trigger_alert(
  p_alert_type TEXT,
  p_severity TEXT,
  p_alert_message TEXT,
  p_metric_value NUMERIC DEFAULT NULL,
  p_threshold_value NUMERIC DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO alert_history (
    alert_type,
    severity,
    alert_message,
    metric_value,
    threshold_value
  )
  VALUES (
    p_alert_type,
    p_severity,
    p_alert_message,
    p_metric_value,
    p_threshold_value
  )
  RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage**:
```typescript
await supabase.rpc('trigger_alert', {
  p_alert_type: 'error_rate_high',
  p_severity: 'critical',
  p_alert_message: 'Error rate exceeded 10% in last hour',
  p_metric_value: 12.5,
  p_threshold_value: 10.0
});
```

---

## Usage Examples

### For Developers

#### Track API Performance
```typescript
// In your API endpoint
const startTime = Date.now();

try {
  // Your API logic here
  const result = await processRequest(request);

  const responseTime = Date.now() - startTime;

  // Log performance
  await supabase.from('api_performance_log').insert({
    endpoint: '/api/generate-lesson-plan',
    method: 'POST',
    response_time_ms: responseTime,
    status_code: 200,
    user_id: userId,
    request_size_bytes: JSON.stringify(request).length,
    response_size_bytes: JSON.stringify(result).length
  });

  return result;
} catch (error) {
  const responseTime = Date.now() - startTime;

  // Log both performance and error
  await Promise.all([
    supabase.from('api_performance_log').insert({
      endpoint: '/api/generate-lesson-plan',
      method: 'POST',
      response_time_ms: responseTime,
      status_code: 500,
      user_id: userId,
      error_message: error.message
    }),
    supabase.from('error_log').insert({
      error_type: 'backend',
      severity: 'error',
      error_code: 'LESSON_PLAN_GENERATION_FAILED',
      error_message: error.message,
      stack_trace: error.stack,
      user_id: userId,
      endpoint: '/api/generate-lesson-plan',
      context: { model: 'U-2.0', promptLength: request.prompt.length }
    })
  ]);

  throw error;
}
```

#### Track User Sessions
```typescript
// On user login/activity start
const { data: session } = await supabase.from('active_sessions_log').insert({
  user_id: userId,
  session_start: new Date().toISOString(),
  last_activity: new Date().toISOString(),
  region: userRegion,
  device_type: deviceType,
  ip_address: ipAddress
}).select().single();

// Update activity periodically (every 5 minutes of user activity)
await supabase
  .from('active_sessions_log')
  .update({ last_activity: new Date().toISOString() })
  .eq('id', session.id);

// On user logout/session end
await supabase
  .from('active_sessions_log')
  .update({ session_end: new Date().toISOString() })
  .eq('id', session.id);
```

#### Log Frontend Errors
```typescript
// In your error boundary or error handler
try {
  // Your code
} catch (error) {
  // Send to monitoring
  await supabase.from('error_log').insert({
    error_type: 'frontend',
    severity: 'error',
    error_code: 'COMPONENT_RENDER_FAILED',
    error_message: error.message,
    stack_trace: error.stack,
    user_id: userId,
    endpoint: window.location.pathname,
    context: {
      component: 'ChatInterface',
      props: componentProps,
      state: componentState
    }
  });

  // Show user-friendly error
  toast.error('Something went wrong. Our team has been notified.');
}
```

### For Admins

#### Monitor System Health
```typescript
// Get current system status
const [activeUsers, latestMetrics, unresolvedAlerts, recentErrors] = await Promise.all([
  supabase.rpc('get_concurrent_users_count'),
  supabase.from('database_metrics')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single(),
  supabase.from('alert_history')
    .select('*')
    .eq('resolved', false)
    .order('triggered_at', { ascending: false }),
  supabase.from('error_log')
    .select('*')
    .eq('resolved', false)
    .eq('severity', 'critical')
    .order('recorded_at', { ascending: false })
    .limit(10)
]);

console.log('System Health:');
console.log(`- Active Users: ${activeUsers.data} / 500`);
console.log(`- DB Connections: ${latestMetrics.data.active_connections} / ${latestMetrics.data.max_connections}`);
console.log(`- Unresolved Alerts: ${unresolvedAlerts.data.length}`);
console.log(`- Critical Errors: ${recentErrors.data.length}`);
```

#### Analyze Performance Trends
```typescript
// Get average response time by endpoint (last 24 hours)
const { data: endpointPerformance } = await supabase
  .from('api_performance_log')
  .select('endpoint, response_time_ms')
  .gte('recorded_at', new Date(Date.now() - 86400000).toISOString())
  .order('recorded_at', { ascending: false });

// Group by endpoint and calculate averages
const performanceByEndpoint = endpointPerformance.reduce((acc, log) => {
  if (!acc[log.endpoint]) {
    acc[log.endpoint] = { total: 0, count: 0 };
  }
  acc[log.endpoint].total += log.response_time_ms;
  acc[log.endpoint].count += 1;
  return acc;
}, {});

Object.entries(performanceByEndpoint).forEach(([endpoint, stats]) => {
  const avg = stats.total / stats.count;
  console.log(`${endpoint}: ${avg.toFixed(0)}ms average`);
});
```

#### Resolve Alerts
```typescript
// Get unacknowledged critical alerts
const { data: criticalAlerts } = await supabase
  .from('alert_history')
  .select('*')
  .eq('severity', 'critical')
  .eq('acknowledged', false)
  .order('triggered_at', { ascending: false });

// Acknowledge and resolve
for (const alert of criticalAlerts) {
  await supabase
    .from('alert_history')
    .update({
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: adminUserId,
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolution_notes: 'Investigated and resolved. Root cause: [description]'
    })
    .eq('id', alert.id);
}
```

---

## Integration Points

### With Token Tracking System
- Monitors token usage rates
- Triggers alerts when approaching limits
- Tracks per-user token consumption patterns

### With Knowledge Base System
- Tracks document processing performance
- Monitors retrieval query times
- Logs embedding generation metrics

### With Chat System
- Records chat response times
- Tracks streaming performance
- Monitors model-specific latency

### With Admin Dashboard
- Provides real-time metrics for display
- Powers historical trend charts
- Feeds alert notification system

---

## Performance Considerations

### Data Volume
- At 500 concurrent users, expect:
  - ~500 session log entries per hour
  - ~10,000 API performance logs per hour
  - ~100 error logs per hour
  - ~20 alerts per day
  - ~1 database metric per minute

### Retention
- Keep detailed logs for 30 days
- Aggregate to hourly summaries after 30 days
- Keep summaries for 1 year
- Archive yearly summaries indefinitely

### Indexing Strategy
- All time-based queries use DESC indexes
- Composite indexes for common filter combinations
- Partial indexes for WHERE clauses (e.g., unresolved alerts)

### Query Optimization
- Use time range filters to limit scan size
- Aggregate in database rather than application
- Use prepared statements for repeated queries
- Leverage materialized views for dashboards

---

## Monitoring and Maintenance

### Daily Tasks
- Review unresolved critical alerts
- Check error rate trends
- Monitor concurrent user peaks
- Verify API performance baselines

### Weekly Tasks
- Analyze slow endpoint trends
- Review database metrics trends
- Clean up resolved alerts (>7 days old)
- Export weekly summary report

### Monthly Tasks
- Archive logs older than 30 days
- Review alert threshold effectiveness
- Analyze capacity utilization trends
- Update monitoring documentation

### Automated Monitoring
```typescript
// Run every 5 minutes
async function monitorSystemHealth() {
  const activeUsers = await supabase.rpc('get_concurrent_users_count');

  // Check concurrent users capacity
  if (activeUsers.data > 400) {
    await supabase.rpc('trigger_alert', {
      p_alert_type: 'concurrent_users_high',
      p_severity: activeUsers.data > 475 ? 'critical' : 'warning',
      p_alert_message: `Concurrent users: ${activeUsers.data} / 500`,
      p_metric_value: activeUsers.data,
      p_threshold_value: 400
    });
  }

  // Check database connections
  const { data: dbMetrics } = await supabase
    .from('database_metrics')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  const connectionUtilization = (dbMetrics.active_connections / dbMetrics.max_connections) * 100;
  if (connectionUtilization > 80) {
    await supabase.rpc('trigger_alert', {
      p_alert_type: 'connection_pool_high',
      p_severity: connectionUtilization > 95 ? 'critical' : 'warning',
      p_alert_message: `Database connections: ${dbMetrics.active_connections} / ${dbMetrics.max_connections}`,
      p_metric_value: connectionUtilization,
      p_threshold_value: 80
    });
  }

  // Check error rate (last hour)
  const { count: errorCount } = await supabase
    .from('error_log')
    .select('*', { count: 'exact', head: true })
    .gte('recorded_at', new Date(Date.now() - 3600000).toISOString());

  const { count: totalRequests } = await supabase
    .from('api_performance_log')
    .select('*', { count: 'exact', head: true })
    .gte('recorded_at', new Date(Date.now() - 3600000).toISOString());

  const errorRate = (errorCount / totalRequests) * 100;
  if (errorRate > 5) {
    await supabase.rpc('trigger_alert', {
      p_alert_type: 'error_rate_high',
      p_severity: errorRate > 10 ? 'critical' : 'warning',
      p_alert_message: `Error rate: ${errorRate.toFixed(2)}% in last hour`,
      p_metric_value: errorRate,
      p_threshold_value: 5
    });
  }
}
```

---

## Future Enhancements

1. **Distributed Tracing**
   - Add request ID tracking across services
   - Implement trace correlation for multi-service requests

2. **Anomaly Detection**
   - Machine learning for unusual pattern detection
   - Automatic baseline adjustment
   - Predictive alerting

3. **Real-Time Dashboards**
   - WebSocket-based live updates
   - Customizable dashboard widgets
   - User-specific monitoring views

4. **Advanced Analytics**
   - User journey tracking
   - Feature usage funnels
   - A/B test result tracking

5. **External Integrations**
   - Slack/Discord alert notifications
   - PagerDuty integration for critical alerts
   - Datadog/New Relic export

6. **Custom Metrics**
   - Allow admins to define custom metrics
   - Create custom alert rules
   - Build custom dashboard views

---

## Related Documentation

- [SUPA_ADMIN_DOCUMENTATION.md](./SUPA_ADMIN_DOCUMENTATION.md) - Supa admin access and capabilities
- [TOKEN_TRACKING_SYSTEM.md](./TOKEN_TRACKING_SYSTEM.md) - Token usage monitoring
- [CAPACITY_PLANNING.md](./CAPACITY_PLANNING.md) - 500 concurrent user planning
- [PERFORMANCE_OPTIMIZATION_SUMMARY.md](./PERFORMANCE_OPTIMIZATION_SUMMARY.md) - Performance improvements

---

## Support

For questions about the monitoring system:
- **Technical Lead**: [Contact]
- **DevOps Team**: [Contact]
- **Emergency**: See [SUPA_ADMIN_DOCUMENTATION.md](./SUPA_ADMIN_DOCUMENTATION.md)

---

**Last Updated**: November 11, 2025
**Document Version**: 1.0
**Migration**: `20251110211004_create_monitoring_metrics_schema.sql`
