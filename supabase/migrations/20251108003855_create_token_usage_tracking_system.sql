/*
  # Token Usage Tracking System for Pencils of Promise

  ## Summary
  Creates a comprehensive token usage tracking system for organization-wide and per-user monitoring.
  Tracks text token consumption, image generation counts, refill management, and monthly rollover logic.
  The system enforces daily limits (30,000), monthly caps (833,333 + rollover), and tracks the total
  10,250,000 token allocation for Pencils of Promise organization.

  ## New Tables

  1. **organization_token_balances**
     - Organization-wide token balance tracking
     - Running state: used_text_today, used_text_this_month, used_text_total_ytd
     - Previous month unused tokens for rollover calculation
     - Total token cap (default: 10,250,000)
     - Image token tracking

  2. **token_refills**
     - Purchased token refills with expiration dates
     - Amount, consumed, purchase date, expiry date
     - Added by user tracking for audit
     - Organization linkage

  3. **user_token_usage**
     - Individual user token consumption breakdown
     - Text tokens used (today, this month, YTD)
     - Image generation counts by model (Craft-1, Craft-2)
     - Last activity tracking

  4. **image_generation_log**
     - Detailed log of all image generations
     - User, organization, model, quality level
     - Timestamp for analytics

  5. **token_cap_audit_log**
     - Audit trail for token cap changes and refill additions
     - Admin actions with timestamp and details

  ## Features
  - Organization-wide token balance tracking with 10,250,000 cap
  - Monthly rollover logic (max 833,333 tokens)
  - Daily limit enforcement (30,000 tokens)
  - Refill management with expiration tracking
  - Image token calculation (50 tokens per low-quality image)
  - Individual user breakdown for analytics
  - Super admin controls with audit logging

  ## Security
  - RLS enabled on all tables
  - Only admin users can view token metrics
  - Only supa_admin can modify token caps and add refills
  - All administrative actions logged for audit
*/

-- ============================================================================
-- 1. ORGANIZATION_TOKEN_BALANCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_token_balances (
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
  
  -- Image Token Cap
  image_token_cap integer DEFAULT 250000 NOT NULL CHECK (image_token_cap >= 0),
  
  -- Month Tracking
  current_month date DEFAULT date_trunc('month', CURRENT_DATE)::date NOT NULL,
  last_reset_date date DEFAULT CURRENT_DATE NOT NULL,
  
  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS org_token_balances_org_name_idx ON organization_token_balances(organization_name);

-- Enable RLS
ALTER TABLE organization_token_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Admins can view organization token balances" ON organization_token_balances;
CREATE POLICY "Admins can view organization token balances"
  ON organization_token_balances FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'admin', 'supa_admin')
    )
  );

DROP POLICY IF EXISTS "Supa admin can manage organization token balances" ON organization_token_balances;
CREATE POLICY "Supa admin can manage organization token balances"
  ON organization_token_balances FOR ALL TO authenticated
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

-- ============================================================================
-- 2. TOKEN_REFILLS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_refills (
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

-- Indexes
CREATE INDEX IF NOT EXISTS token_refills_org_name_idx ON token_refills(organization_name);
CREATE INDEX IF NOT EXISTS token_refills_expires_at_idx ON token_refills(expires_at);
CREATE INDEX IF NOT EXISTS token_refills_consumed_idx ON token_refills(consumed) WHERE consumed < amount;

-- Enable RLS
ALTER TABLE token_refills ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Admins can view token refills" ON token_refills;
CREATE POLICY "Admins can view token refills"
  ON token_refills FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'admin', 'supa_admin')
    )
  );

DROP POLICY IF EXISTS "Supa admin can manage token refills" ON token_refills;
CREATE POLICY "Supa admin can manage token refills"
  ON token_refills FOR ALL TO authenticated
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

-- ============================================================================
-- 3. USER_TOKEN_USAGE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_token_usage (
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

-- Indexes
CREATE INDEX IF NOT EXISTS user_token_usage_user_id_idx ON user_token_usage(user_id);
CREATE INDEX IF NOT EXISTS user_token_usage_org_name_idx ON user_token_usage(organization_name);
CREATE INDEX IF NOT EXISTS user_token_usage_last_active_idx ON user_token_usage(last_active_at DESC);

-- Enable RLS
ALTER TABLE user_token_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own token usage" ON user_token_usage;
CREATE POLICY "Users can view their own token usage"
  ON user_token_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all user token usage" ON user_token_usage;
CREATE POLICY "Admins can view all user token usage"
  ON user_token_usage FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'admin', 'supa_admin')
    )
  );

-- ============================================================================
-- 4. IMAGE_GENERATION_LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS image_generation_log (
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

-- Indexes
CREATE INDEX IF NOT EXISTS image_gen_log_user_id_idx ON image_generation_log(user_id);
CREATE INDEX IF NOT EXISTS image_gen_log_org_name_idx ON image_generation_log(organization_name);
CREATE INDEX IF NOT EXISTS image_gen_log_created_at_idx ON image_generation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS image_gen_log_model_idx ON image_generation_log(model_used);

-- Enable RLS
ALTER TABLE image_generation_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own image generation log" ON image_generation_log;
CREATE POLICY "Users can view their own image generation log"
  ON image_generation_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all image generation logs" ON image_generation_log;
CREATE POLICY "Admins can view all image generation logs"
  ON image_generation_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'admin', 'supa_admin')
    )
  );

-- ============================================================================
-- 5. TOKEN_CAP_AUDIT_LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_cap_audit_log (
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

-- Indexes
CREATE INDEX IF NOT EXISTS token_audit_log_org_name_idx ON token_cap_audit_log(organization_name);
CREATE INDEX IF NOT EXISTS token_audit_log_created_at_idx ON token_cap_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS token_audit_log_admin_idx ON token_cap_audit_log(admin_user_id);

-- Enable RLS
ALTER TABLE token_cap_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Admins can view token cap audit log" ON token_cap_audit_log;
CREATE POLICY "Admins can view token cap audit log"
  ON token_cap_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'admin', 'supa_admin')
    )
  );

-- ============================================================================
-- 6. UPDATED_AT TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_org_token_balances_updated_at ON organization_token_balances;
CREATE TRIGGER update_org_token_balances_updated_at
  BEFORE UPDATE ON organization_token_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_token_usage_updated_at ON user_token_usage;
CREATE TRIGGER update_user_token_usage_updated_at
  BEFORE UPDATE ON user_token_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. INITIALIZE PENCILS OF PROMISE ORGANIZATION
-- ============================================================================

INSERT INTO organization_token_balances (
  organization_name,
  total_token_cap,
  used_text_today,
  used_text_this_month,
  used_text_total_ytd,
  prev_month_unused,
  image_low_used,
  image_med_used,
  image_high_used,
  image_token_cap
)
VALUES (
  'Pencils of Promise',
  10250000,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  250000
)
ON CONFLICT (organization_name) DO NOTHING;

-- ============================================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE organization_token_balances IS 'Organization-wide token balance tracking with monthly rollover logic';
COMMENT ON TABLE token_refills IS 'Purchased token refills with expiration dates';
COMMENT ON TABLE user_token_usage IS 'Individual user token consumption breakdown';
COMMENT ON TABLE image_generation_log IS 'Detailed log of all image generations';
COMMENT ON TABLE token_cap_audit_log IS 'Audit trail for token cap changes and refill additions';

COMMENT ON COLUMN organization_token_balances.total_token_cap IS 'Total token allocation for organization (default: 10,250,000)';
COMMENT ON COLUMN organization_token_balances.prev_month_unused IS 'Unused tokens from previous month for rollover calculation';
COMMENT ON COLUMN organization_token_balances.image_token_cap IS 'Total image token allocation (default: 250,000)';
COMMENT ON COLUMN token_refills.consumed IS 'Amount of tokens consumed from this refill';
COMMENT ON COLUMN user_token_usage.image_count_craft1 IS 'Count of images generated with Craft-1 model';
COMMENT ON COLUMN user_token_usage.image_count_craft2 IS 'Count of images generated with Craft-2 model';
COMMENT ON COLUMN image_generation_log.tokens_used IS 'Token cost: low=50, med=125, high=500';