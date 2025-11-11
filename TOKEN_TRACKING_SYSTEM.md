# Token Tracking System Documentation

## Overview

A comprehensive token usage tracking and enforcement system for Pencils of Promise, managing a **10,250,000 token annual allocation** with daily limits, monthly caps with rollover logic, image token tracking, and refill management.

## Migration References

- **Primary Migration**: `20251108003855_create_token_usage_tracking_system.sql`
- **Functions Migration**: `20251108003952_create_token_calculation_functions.sql`
- **Applied**: November 8, 2025

---

## Problem Solved

Before this implementation, the system lacked:

1. **Organization-Level Tracking**: No centralized view of total token consumption
2. **Daily Limits**: Users could consume unlimited tokens in a single day
3. **Monthly Rollover**: Unused tokens were wasted, not carried forward
4. **Image Tracking**: Image generations weren't tracked separately
5. **Refill Management**: No way to purchase and track additional tokens
6. **Per-User Breakdown**: No visibility into which users consumed how many tokens
7. **Audit Trail**: No record of who modified token caps or added refills

This system provides complete visibility, control, and audit capabilities for token management at scale.

---

## Token Allocation Structure

### Total Annual Cap: 10,250,000 Tokens

**Breakdown**:
- **Monthly Base**: 833,333 tokens per month (10M ÷ 12 = 833,333)
- **Rollover Maximum**: Up to 833,333 tokens from previous month
- **Effective Monthly Cap**: 833,333 + rollover (max 1,666,666)
- **Daily Limit**: 30,000 tokens per day
- **Image Token Cap**: 250,000 tokens (separate pool)

### Token Costs

**Text Tokens**:
- Charged per input/output token
- Model-dependent costs (U-1.5, U-2.0, U-2.1)
- Tracked in real-time during conversations

**Image Tokens**:
- **Low Quality**: 50 tokens per image
- **Medium Quality**: 125 tokens per image
- **High Quality**: 500 tokens per image
- Currently all generations use low quality (50 tokens)

---

## Implementation Details

### Database Schema

#### 1. organization_token_balances

**Purpose**: Organization-wide token balance tracking with monthly rollover logic.

**Columns**:
```sql
CREATE TABLE organization_token_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text UNIQUE NOT NULL,

  -- Total Token Cap
  total_token_cap bigint DEFAULT 10250000 NOT NULL CHECK (total_token_cap >= 0),

  -- Running State (Text Tokens)
  used_text_today integer DEFAULT 0 NOT NULL CHECK (used_text_today >= 0),
  used_text_this_month integer DEFAULT 0 NOT NULL CHECK (used_text_this_month >= 0),
  used_text_total_ytd bigint DEFAULT 0 NOT NULL CHECK (used_text_total_ytd >= 0),
  prev_month_unused integer DEFAULT 0 NOT NULL CHECK (prev_month_unused >= 0),

  -- Image Tracking
  image_low_used integer DEFAULT 0 NOT NULL CHECK (image_low_used >= 0),
  image_med_used integer DEFAULT 0 NOT NULL CHECK (image_med_used >= 0),
  image_high_used integer DEFAULT 0 NOT NULL CHECK (image_high_used >= 0),
  image_token_cap integer DEFAULT 250000 NOT NULL CHECK (image_token_cap >= 0),

  -- Month Tracking
  current_month date DEFAULT date_trunc('month', CURRENT_DATE)::date NOT NULL,
  last_reset_date date DEFAULT CURRENT_DATE NOT NULL,

  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

**Key Features**:
- Single source of truth for organization token usage
- Tracks daily, monthly, and YTD consumption
- Stores previous month unused for rollover calculation
- Separate image token tracking
- Automatic timestamp management

**Example Data**:
```json
{
  "organization_name": "Pencils of Promise",
  "total_token_cap": 10250000,
  "used_text_today": 15420,
  "used_text_this_month": 524680,
  "used_text_total_ytd": 2458950,
  "prev_month_unused": 308653,
  "image_low_used": 125,
  "image_med_used": 0,
  "image_high_used": 0,
  "image_token_cap": 250000,
  "current_month": "2025-11-01",
  "last_reset_date": "2025-11-11"
}
```

#### 2. token_refills

**Purpose**: Track purchased token refills with expiration dates.

**Columns**:
```sql
CREATE TABLE token_refills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text REFERENCES organization_token_balances(organization_name) ON DELETE CASCADE NOT NULL,

  -- Refill Details
  amount integer NOT NULL CHECK (amount > 0),
  consumed integer DEFAULT 0 NOT NULL CHECK (consumed >= 0 AND consumed <= amount),

  -- Dates
  purchased_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,

  -- Audit
  added_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,

  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL
);
```

**Key Features**:
- Multiple refills can be active simultaneously
- Tracks consumption from each refill
- Expiration date enforcement
- Audit trail (who added, when, why)

**Example Data**:
```json
{
  "id": "uuid-123",
  "organization_name": "Pencils of Promise",
  "amount": 1000000,
  "consumed": 245000,
  "purchased_at": "2025-10-01T00:00:00Z",
  "expires_at": "2026-10-01T00:00:00Z",
  "added_by_user_id": "admin-uuid",
  "notes": "Q4 peak usage emergency refill"
}
```

#### 3. user_token_usage

**Purpose**: Individual user token consumption breakdown for analytics.

**Columns**:
```sql
CREATE TABLE user_token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_name text REFERENCES organization_token_balances(organization_name) ON DELETE CASCADE NOT NULL,

  -- Text Token Usage
  used_text_today integer DEFAULT 0 NOT NULL CHECK (used_text_today >= 0),
  used_text_this_month integer DEFAULT 0 NOT NULL CHECK (used_text_this_month >= 0),
  used_text_total_ytd bigint DEFAULT 0 NOT NULL CHECK (used_text_total_ytd >= 0),

  -- Image Generation Counts
  image_count_craft1 integer DEFAULT 0 NOT NULL CHECK (image_count_craft1 >= 0),
  image_count_craft2 integer DEFAULT 0 NOT NULL CHECK (image_count_craft2 >= 0),

  -- Activity Tracking
  last_active_at timestamptz DEFAULT now() NOT NULL,

  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Unique constraint: one record per user per organization
  UNIQUE(user_id, organization_name)
);
```

**Key Features**:
- Per-user consumption tracking
- Same daily/monthly/YTD structure as organization
- Image generation counts by model
- Activity timestamp for user engagement analytics

**Example Query**:
```sql
-- Top 10 token consumers this month
SELECT
  u.email,
  utu.used_text_this_month,
  utu.image_count_craft1 + utu.image_count_craft2 as total_images
FROM user_token_usage utu
JOIN auth.users u ON utu.user_id = u.id
WHERE organization_name = 'Pencils of Promise'
ORDER BY utu.used_text_this_month DESC
LIMIT 10;
```

#### 4. image_generation_log

**Purpose**: Detailed log of all image generations with token cost tracking.

**Columns**:
```sql
CREATE TABLE image_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_name text REFERENCES organization_token_balances(organization_name) ON DELETE CASCADE NOT NULL,

  -- Image Details
  model_used text NOT NULL CHECK (model_used IN ('craft-1', 'craft-2')),
  quality_level text DEFAULT 'low' NOT NULL CHECK (quality_level IN ('low', 'med', 'high')),

  -- Tokens Cost (calculated based on quality: low=50, med=125, high=500)
  tokens_used integer DEFAULT 50 NOT NULL CHECK (tokens_used > 0),

  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL
);
```

**Key Features**:
- Complete audit trail of image generations
- Model and quality level tracking
- Token cost per generation
- Time-series analysis capability

**Usage Analytics**:
```sql
-- Images generated per day (last 7 days)
SELECT
  DATE(created_at) as date,
  COUNT(*) as images_generated,
  SUM(tokens_used) as tokens_consumed,
  model_used
FROM image_generation_log
WHERE created_at > now() - interval '7 days'
GROUP BY DATE(created_at), model_used
ORDER BY date DESC;
```

#### 5. token_cap_audit_log

**Purpose**: Audit trail for token cap changes and refill additions.

**Columns**:
```sql
CREATE TABLE token_cap_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text REFERENCES organization_token_balances(organization_name) ON DELETE CASCADE NOT NULL,

  -- Action Details
  action_type text NOT NULL CHECK (action_type IN ('cap_adjustment', 'refill_added', 'refill_consumed', 'monthly_reset', 'daily_reset')),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text NOT NULL,

  -- Change Details
  old_value bigint,
  new_value bigint,
  details jsonb DEFAULT '{}'::jsonb,

  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL
);
```

**Key Features**:
- Immutable audit trail (no updates/deletes)
- Records who made changes
- Captures old and new values
- Flexible details field for context

**Example Queries**:
```sql
-- Recent cap adjustments
SELECT *
FROM token_cap_audit_log
WHERE action_type = 'cap_adjustment'
ORDER BY created_at DESC
LIMIT 10;

-- Refill history
SELECT
  admin_email,
  new_value as refill_amount,
  details->>'notes' as notes,
  created_at
FROM token_cap_audit_log
WHERE action_type = 'refill_added'
ORDER BY created_at DESC;
```

---

### Token Calculation Functions

#### 1. calculate_rollover_tokens(organization_name)

Calculates rollover tokens from previous month (max 833,333).

**Formula**: `MIN(prev_month_unused, 833,333)`

**SQL**:
```sql
CREATE OR REPLACE FUNCTION calculate_rollover_tokens(
  p_organization_name text
)
RETURNS integer AS $$
DECLARE
  v_prev_month_unused integer;
BEGIN
  SELECT prev_month_unused
  INTO v_prev_month_unused
  FROM organization_token_balances
  WHERE organization_name = p_organization_name;

  RETURN LEAST(COALESCE(v_prev_month_unused, 0), 833333);
END;
$$ LANGUAGE plpgsql STABLE;
```

**Usage**:
```typescript
const { data: rollover } = await supabase.rpc('calculate_rollover_tokens', {
  p_organization_name: 'Pencils of Promise'
});
console.log(`Rollover from last month: ${rollover} tokens`);
```

#### 2. calculate_monthly_cap(organization_name)

Calculates monthly cap: 833,333 + rollover.

**Formula**: `833,333 + rollover_in`

**SQL**:
```sql
CREATE OR REPLACE FUNCTION calculate_monthly_cap(
  p_organization_name text
)
RETURNS integer AS $$
DECLARE
  v_rollover_in integer;
BEGIN
  v_rollover_in := calculate_rollover_tokens(p_organization_name);
  RETURN 833333 + v_rollover_in;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Example**:
- Previous month unused: 308,653 tokens
- Current month cap: 833,333 + 308,653 = **1,141,986 tokens**

#### 3. calculate_monthly_balance(organization_name)

Calculates remaining monthly balance.

**Formula**: `MAX(0, monthly_cap - used_this_month)`

**Usage**:
```typescript
const { data: balance } = await supabase.rpc('calculate_monthly_balance', {
  p_organization_name: 'Pencils of Promise'
});
console.log(`Remaining this month: ${balance} tokens`);
```

#### 4. calculate_refill_balance(organization_name)

Sums all unexpired refills (amount - consumed).

**SQL**:
```sql
CREATE OR REPLACE FUNCTION calculate_refill_balance(
  p_organization_name text
)
RETURNS integer AS $$
DECLARE
  v_total_refill integer;
BEGIN
  SELECT COALESCE(SUM(amount - consumed), 0)
  INTO v_total_refill
  FROM token_refills
  WHERE organization_name = p_organization_name
    AND expires_at > now()
    AND consumed < amount;

  RETURN v_total_refill;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Example**:
- Refill 1: 1,000,000 total, 245,000 consumed = 755,000 available
- Refill 2: 500,000 total, 0 consumed = 500,000 available
- **Total Refill Balance: 1,255,000 tokens**

#### 5. calculate_total_plan_balance(organization_name)

Total available tokens including YTD and refills.

**Formula**: `MAX(0, total_cap - used_ytd) + refill_balance`

**Usage**:
```typescript
const { data: totalBalance } = await supabase.rpc('calculate_total_plan_balance', {
  p_organization_name: 'Pencils of Promise'
});
console.log(`Total available: ${totalBalance.toLocaleString()} tokens`);
```

**Example Calculation**:
- Total cap: 10,250,000
- Used YTD: 2,458,950
- YTD remaining: 7,791,050
- Refill balance: 1,255,000
- **Total available: 9,046,050 tokens**

#### 6. calculate_image_tokens_used(organization_name)

Calculates image tokens consumed based on quality counts.

**Formula**: `(low × 50) + (med × 125) + (high × 500)`

**SQL**:
```sql
CREATE OR REPLACE FUNCTION calculate_image_tokens_used(
  p_organization_name text
)
RETURNS integer AS $$
DECLARE
  v_low_used integer;
  v_med_used integer;
  v_high_used integer;
BEGIN
  SELECT image_low_used, image_med_used, image_high_used
  INTO v_low_used, v_med_used, v_high_used
  FROM organization_token_balances
  WHERE organization_name = p_organization_name;

  RETURN (COALESCE(v_low_used, 0) * 50) +
         (COALESCE(v_med_used, 0) * 125) +
         (COALESCE(v_high_used, 0) * 500);
END;
$$ LANGUAGE plpgsql STABLE;
```

**Example**:
- Low quality: 125 images × 50 = 6,250 tokens
- Med quality: 0 images × 125 = 0 tokens
- High quality: 0 images × 500 = 0 tokens
- **Total image tokens: 6,250**

#### 7. calculate_image_tokens_remaining(organization_name)

Returns remaining image tokens.

**Formula**: `MAX(0, 250,000 - image_tokens_used)`

#### 8. get_token_metrics(organization_name)

**Most Important Function**: Returns ALL token metrics in a single query.

**Returns**:
- Organization info
- Text token metrics (today, month, YTD)
- Calculated balances (rollover, monthly cap, refill balance, total)
- Image metrics (counts, tokens used, remaining)
- Percentage metrics (daily, monthly, YTD, image usage)

**Usage**:
```typescript
const { data: metrics } = await supabase.rpc('get_token_metrics', {
  p_organization_name: 'Pencils of Promise'
});

console.log('Token Metrics:');
console.log(`Daily: ${metrics.used_text_today} / 30,000 (${metrics.daily_usage_percent}%)`);
console.log(`Monthly: ${metrics.used_text_this_month} / ${metrics.monthly_cap} (${metrics.monthly_usage_percent}%)`);
console.log(`YTD: ${metrics.used_text_total_ytd} / ${metrics.total_token_cap} (${metrics.ytd_usage_percent}%)`);
console.log(`Images: ${metrics.image_tokens_used} / ${metrics.image_token_cap} (${metrics.image_usage_percent}%)`);
console.log(`Rollover: ${metrics.rollover_tokens}`);
console.log(`Refills: ${metrics.refill_balance}`);
console.log(`Total Available: ${metrics.total_plan_balance}`);
```

#### 9. get_user_token_usage_details(organization_name, limit)

Returns per-user token breakdown with email addresses.

**Parameters**:
- `p_organization_name` (text) - Organization to query
- `p_limit` (integer) - Max users to return (default: 50)

**Returns**:
- user_id, user_email
- used_text_this_month, used_text_total_ytd
- image_count_craft1, image_count_craft2
- total_image_tokens
- last_active_at

**Usage**:
```typescript
const { data: topUsers } = await supabase.rpc('get_user_token_usage_details', {
  p_organization_name: 'Pencils of Promise',
  p_limit: 20
});

console.log('Top 20 Token Consumers:');
topUsers.forEach((user, index) => {
  console.log(`${index + 1}. ${user.user_email}: ${user.used_text_this_month} tokens`);
});
```

#### 10. add_token_refill() - SUPA ADMIN ONLY

Adds a token refill to the organization account.

**Parameters**:
- `p_organization_name` (text)
- `p_amount` (integer) - Tokens to add
- `p_expires_at` (timestamptz) - Expiration date
- `p_notes` (text) - Optional notes

**Returns**: UUID of created refill

**Security**: Only users with `team_role = 'supa_admin'` can execute

**Usage**:
```typescript
const { data: refillId, error } = await supabase.rpc('add_token_refill', {
  p_organization_name: 'Pencils of Promise',
  p_amount: 1000000,
  p_expires_at: '2026-12-31T23:59:59Z',
  p_notes: 'Emergency refill for Q4 peak usage'
});

if (error) {
  console.error('Only supa_admin can add refills:', error);
} else {
  console.log('Refill added:', refillId);
}
```

**Automatic Actions**:
- Inserts refill record
- Logs to audit trail
- Records admin email and user ID
- Includes notes in audit details

#### 11. adjust_token_cap() - SUPA ADMIN ONLY

Adjusts the organization's total token cap.

**Parameters**:
- `p_organization_name` (text)
- `p_new_cap` (bigint) - New cap value

**Returns**: Boolean (true if successful)

**Security**: Only users with `team_role = 'supa_admin'` can execute

**Usage**:
```typescript
const { data: success, error } = await supabase.rpc('adjust_token_cap', {
  p_organization_name: 'Pencils of Promise',
  p_new_cap: 15000000
});

if (error) {
  console.error('Only supa_admin can adjust cap:', error);
} else {
  console.log('Token cap updated to 15M');
}
```

**Automatic Actions**:
- Updates organization token cap
- Logs old and new values to audit trail
- Records admin who made change
- Includes change details in audit log

---

## Security

### Row Level Security (RLS)

All token tables have RLS enabled with role-based access:

**organization_token_balances**:
- Admins (supa_admin, admin, prime) can view
- Only supa_admin can modify

**token_refills**:
- Admins can view
- Only supa_admin can add/modify

**user_token_usage**:
- Users can view their own usage
- Admins can view all users

**image_generation_log**:
- Users can view their own generations
- Admins can view all generations

**token_cap_audit_log**:
- Admins can view
- No one can modify (append-only)

### Example Policy:
```sql
CREATE POLICY "Admins can view organization token balances"
  ON organization_token_balances FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'admin', 'supa_admin')
    )
  );
```

---

## Usage Examples

### For Developers

#### Record Token Usage (Chat Completion)
```typescript
async function recordChatTokens(userId: string, orgName: string, tokensUsed: number) {
  // Update organization balance
  const { data: org } = await supabase
    .from('organization_token_balances')
    .select('*')
    .eq('organization_name', orgName)
    .single();

  await supabase
    .from('organization_token_balances')
    .update({
      used_text_today: org.used_text_today + tokensUsed,
      used_text_this_month: org.used_text_this_month + tokensUsed,
      used_text_total_ytd: org.used_text_total_ytd + tokensUsed
    })
    .eq('organization_name', orgName);

  // Update user usage
  const { data: userUsage } = await supabase
    .from('user_token_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_name', orgName)
    .maybeSingle();

  if (userUsage) {
    await supabase
      .from('user_token_usage')
      .update({
        used_text_today: userUsage.used_text_today + tokensUsed,
        used_text_this_month: userUsage.used_text_this_month + tokensUsed,
        used_text_total_ytd: userUsage.used_text_total_ytd + tokensUsed,
        last_active_at: new Date().toISOString()
      })
      .eq('id', userUsage.id);
  } else {
    await supabase.from('user_token_usage').insert({
      user_id: userId,
      organization_name: orgName,
      used_text_today: tokensUsed,
      used_text_this_month: tokensUsed,
      used_text_total_ytd: tokensUsed
    });
  }
}
```

#### Record Image Generation
```typescript
async function recordImageGeneration(
  userId: string,
  orgName: string,
  model: 'craft-1' | 'craft-2',
  quality: 'low' | 'med' | 'high'
) {
  const tokenCost = quality === 'low' ? 50 : quality === 'med' ? 125 : 500;

  // Log generation
  await supabase.from('image_generation_log').insert({
    user_id: userId,
    organization_name: orgName,
    model_used: model,
    quality_level: quality,
    tokens_used: tokenCost
  });

  // Update counters
  const qualityColumn = `image_${quality}_used`;
  const { data: org } = await supabase
    .from('organization_token_balances')
    .select(qualityColumn)
    .eq('organization_name', orgName)
    .single();

  await supabase
    .from('organization_token_balances')
    .update({
      [qualityColumn]: org[qualityColumn] + 1
    })
    .eq('organization_name', orgName);

  // Update user image count
  const modelColumn = model === 'craft-1' ? 'image_count_craft1' : 'image_count_craft2';
  await supabase.rpc('increment_user_image_count', {
    p_user_id: userId,
    p_org_name: orgName,
    p_model_column: modelColumn
  });
}
```

#### Check if User Can Proceed (Token Limit Check)
```typescript
async function canUserUseTokens(orgName: string, requestedTokens: number): Promise<boolean> {
  const { data: metrics } = await supabase.rpc('get_token_metrics', {
    p_organization_name: orgName
  });

  // Check daily limit (30,000)
  if (metrics.used_text_today + requestedTokens > 30000) {
    console.warn('Daily token limit would be exceeded');
    return false;
  }

  // Check monthly cap
  if (metrics.used_text_this_month + requestedTokens > metrics.monthly_cap) {
    console.warn('Monthly token cap would be exceeded');
    return false;
  }

  // Check total plan balance
  if (requestedTokens > metrics.total_plan_balance) {
    console.error('Insufficient total token balance');
    return false;
  }

  return true;
}
```

### For Admins

#### View Organization Token Status
```typescript
async function displayTokenStatus() {
  const { data: metrics } = await supabase.rpc('get_token_metrics', {
    p_organization_name: 'Pencils of Promise'
  });

  console.log('=== PENCILS OF PROMISE TOKEN STATUS ===\n');

  console.log('DAILY USAGE:');
  console.log(`  Used: ${metrics.used_text_today.toLocaleString()} / 30,000`);
  console.log(`  Percentage: ${metrics.daily_usage_percent}%`);
  console.log(`  Remaining: ${(30000 - metrics.used_text_today).toLocaleString()}\n`);

  console.log('MONTHLY USAGE:');
  console.log(`  Used: ${metrics.used_text_this_month.toLocaleString()} / ${metrics.monthly_cap.toLocaleString()}`);
  console.log(`  Percentage: ${metrics.monthly_usage_percent}%`);
  console.log(`  Base: 833,333`);
  console.log(`  Rollover: ${metrics.rollover_tokens.toLocaleString()}`);
  console.log(`  Remaining: ${metrics.monthly_balance.toLocaleString()}\n`);

  console.log('YEAR-TO-DATE:');
  console.log(`  Used: ${metrics.used_text_total_ytd.toLocaleString()} / ${metrics.total_token_cap.toLocaleString()}`);
  console.log(`  Percentage: ${metrics.ytd_usage_percent}%`);
  console.log(`  Remaining: ${metrics.tokens_remaining.toLocaleString()}\n`);

  console.log('REFILLS:');
  console.log(`  Available: ${metrics.refill_balance.toLocaleString()}\n`);

  console.log('IMAGES:');
  console.log(`  Generated: ${metrics.image_low_count + metrics.image_med_count + metrics.image_high_count}`);
  console.log(`  Tokens Used: ${metrics.image_tokens_used.toLocaleString()} / ${metrics.image_token_cap.toLocaleString()}`);
  console.log(`  Percentage: ${metrics.image_usage_percent}%\n`);

  console.log('TOTAL AVAILABLE:');
  console.log(`  ${metrics.total_plan_balance.toLocaleString()} tokens`);
}
```

#### Add Emergency Refill
```typescript
async function addEmergencyRefill() {
  const { data: refillId, error } = await supabase.rpc('add_token_refill', {
    p_organization_name: 'Pencils of Promise',
    p_amount: 2000000,
    p_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    p_notes: 'Emergency refill - unexpected usage spike during Q4 teacher training'
  });

  if (error) {
    console.error('Failed to add refill:', error);
  } else {
    console.log('✅ Added 2M token refill. Refill ID:', refillId);
  }
}
```

#### View Top Token Consumers
```typescript
async function viewTopConsumers() {
  const { data: users } = await supabase.rpc('get_user_token_usage_details', {
    p_organization_name: 'Pencils of Promise',
    p_limit: 20
  });

  console.log('=== TOP 20 TOKEN CONSUMERS (THIS MONTH) ===\n');
  console.log('Rank | Email | Tokens Used | Images | Last Active');
  console.log('-----|-------|-------------|--------|-------------');

  users.forEach((user, index) => {
    const rank = (index + 1).toString().padStart(4);
    const tokens = user.used_text_this_month.toLocaleString().padStart(11);
    const images = (user.image_count_craft1 + user.image_count_craft2).toString().padStart(6);
    const lastActive = new Date(user.last_active_at).toLocaleDateString();

    console.log(`${rank} | ${user.user_email} | ${tokens} | ${images} | ${lastActive}`);
  });
}
```

#### View Refill Status
```typescript
async function viewRefillStatus() {
  const { data: refills } = await supabase
    .from('token_refills')
    .select('*')
    .eq('organization_name', 'Pencils of Promise')
    .order('expires_at', { ascending: true });

  console.log('=== ACTIVE TOKEN REFILLS ===\n');

  let totalAvailable = 0;

  refills.forEach(refill => {
    const remaining = refill.amount - refill.consumed;
    const percentUsed = ((refill.consumed / refill.amount) * 100).toFixed(1);
    const daysUntilExpiry = Math.ceil((new Date(refill.expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000));

    console.log(`Refill: ${refill.amount.toLocaleString()} tokens`);
    console.log(`  Consumed: ${refill.consumed.toLocaleString()} (${percentUsed}%)`);
    console.log(`  Remaining: ${remaining.toLocaleString()}`);
    console.log(`  Expires: ${new Date(refill.expires_at).toLocaleDateString()} (${daysUntilExpiry} days)`);
    console.log(`  Notes: ${refill.notes || 'None'}\n`);

    if (daysUntilExpiry > 0) {
      totalAvailable += remaining;
    }
  });

  console.log(`TOTAL REFILL BALANCE: ${totalAvailable.toLocaleString()} tokens`);
}
```

---

## Integration Points

### With Monitoring System
- Triggers alerts when approaching limits
- Records metrics for dashboard display
- Tracks token usage trends

### With Chat System
- Checks limits before processing requests
- Records usage after completions
- Handles rate limiting

### With Image Generation
- Tracks image generations separately
- Enforces image token cap
- Records model and quality usage

### With Admin Dashboard
- Powers token usage displays
- Shows real-time balances
- Enables refill management UI

---

## Monthly Reset Process

At the beginning of each month, a scheduled job should run:

```typescript
async function performMonthlyReset() {
  const { data: org } = await supabase
    .from('organization_token_balances')
    .select('*')
    .eq('organization_name', 'Pencils of Promise')
    .single();

  // Calculate unused tokens from this month
  const { data: monthlyBalance } = await supabase.rpc('calculate_monthly_balance', {
    p_organization_name: 'Pencils of Promise'
  });

  // Update organization balances
  await supabase
    .from('organization_token_balances')
    .update({
      used_text_this_month: 0,
      prev_month_unused: monthlyBalance, // Will be capped at 833,333 in rollover calc
      current_month: new Date().toISOString().slice(0, 10)
    })
    .eq('organization_name', 'Pencils of Promise');

  // Reset all user monthly usage
  await supabase
    .from('user_token_usage')
    .update({ used_text_this_month: 0 })
    .eq('organization_name', 'Pencils of Promise');

  // Log the reset
  await supabase.from('token_cap_audit_log').insert({
    organization_name: 'Pencils of Promise',
    action_type: 'monthly_reset',
    admin_email: 'system@pencilsofpromise.org',
    details: {
      previous_month_unused: monthlyBalance,
      rollover_applied: Math.min(monthlyBalance, 833333)
    }
  });

  console.log('✅ Monthly token reset completed');
}
```

---

## Daily Reset Process

At midnight each day:

```typescript
async function performDailyReset() {
  // Reset organization daily usage
  await supabase
    .from('organization_token_balances')
    .update({
      used_text_today: 0,
      last_reset_date: new Date().toISOString().slice(0, 10)
    })
    .eq('organization_name', 'Pencils of Promise');

  // Reset all user daily usage
  await supabase
    .from('user_token_usage')
    .update({ used_text_today: 0 })
    .eq('organization_name', 'Pencils of Promise');

  // Log the reset
  await supabase.from('token_cap_audit_log').insert({
    organization_name: 'Pencils of Promise',
    action_type: 'daily_reset',
    admin_email: 'system@pencilsofpromise.org',
    details: {
      reset_date: new Date().toISOString().slice(0, 10)
    }
  });
}
```

---

## Performance Considerations

### Indexes
- Composite indexes on (organization_name, created_at)
- User-based indexes for per-user queries
- Time-range indexes for analytics
- Partial indexes for active refills

### Query Optimization
- Use `get_token_metrics()` for dashboard (single query)
- Cache metrics on frontend (30-second refresh)
- Batch user updates where possible
- Use materialized views for heavy analytics

### Data Volume
- ~500 users generating usage records
- ~10,000 image generations per month
- ~500,000 token usage updates per month
- Keep detailed logs for 90 days, aggregate after

---

## Monitoring and Maintenance

### Daily Monitoring
- Check if daily limit approaching (>24,000 tokens = 80%)
- Verify daily reset occurred at midnight
- Review any unusual usage spikes

### Weekly Monitoring
- Analyze weekly token consumption trends
- Review top consumers for anomalies
- Check refill expiration dates

### Monthly Monitoring
- Verify monthly reset and rollover calculation
- Review monthly consumption vs. budget
- Analyze usage patterns for capacity planning
- Export monthly usage report

---

## Future Enhancements

1. **Predictive Alerts**
   - Machine learning to predict when limits will be hit
   - Proactive refill recommendations

2. **Per-User Limits**
   - Individual user token quotas
   - Fair usage policies

3. **Advanced Analytics**
   - Token efficiency metrics (tokens per task)
   - Usage patterns by time of day
   - Seasonal trend analysis

4. **Cost Tracking**
   - Map token usage to actual costs
   - Budget forecasting
   - Cost allocation by department

5. **Automated Refills**
   - Auto-purchase when balance low
   - Integration with procurement system

---

## Related Documentation

- [SUPA_ADMIN_DOCUMENTATION.md](./SUPA_ADMIN_DOCUMENTATION.md) - Admin access and token management
- [MONITORING_SYSTEM_IMPLEMENTATION.md](./MONITORING_SYSTEM_IMPLEMENTATION.md) - System monitoring
- [TOKEN_COST_BREAKDOWN.md](./TOKEN_COST_BREAKDOWN.md) - Cost analysis (if exists)

---

## Support

For token system questions:
- **Technical**: tech-support@pencilsofpromise.org
- **Financial**: finance@pencilsofpromise.org
- **Emergency**: See supa_admin documentation

---

**Last Updated**: November 11, 2025
**Document Version**: 1.0
**Migrations**:
- `20251108003855_create_token_usage_tracking_system.sql`
- `20251108003952_create_token_calculation_functions.sql`
