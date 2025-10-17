/*
  # Security Monitoring Infrastructure

  1. New Tables
    - `security_rules`
      - Configurable protection patterns for identity guard
      - Regex patterns for vendor probe detection
      - Threat level assignments
      - Enable/disable rules dynamically

    - `prompt_injection_attempts`
      - Log all detected security events
      - Track vendor probe patterns
      - User attribution and session tracking
      - Threat level and event type classification

    - `blocked_patterns`
      - Registry of known attack patterns
      - Category-based organization (vendor_probe, prompt_injection, etc.)
      - Pattern effectiveness tracking

    - `vendor_aliases`
      - Map competitor names to safe Uhuru responses
      - Pre-approved deflection messages
      - Context-aware response selection

  2. Security
    - Enable RLS on all tables
    - Admin-only write access
    - Read access for monitoring systems
    - Audit logging for security events

  3. Indexes
    - Timestamp-based queries for analytics
    - User/session lookup optimization
    - Pattern matching performance
*/

-- Security rules configuration
CREATE TABLE IF NOT EXISTS security_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('vendor_probe', 'prompt_injection', 'identity_override', 'metadata_leak')),
  pattern text NOT NULL,
  threat_level text NOT NULL CHECK (threat_level IN ('low', 'medium', 'high')),
  enabled boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Prompt injection attempt logging
CREATE TABLE IF NOT EXISTS prompt_injection_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('vendor_probe', 'prompt_injection', 'response_leakage', 'identity_override')),
  threat_level text NOT NULL CHECK (threat_level IN ('low', 'medium', 'high')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  input_text text NOT NULL,
  matched_patterns text[] DEFAULT '{}',
  redacted boolean DEFAULT false,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Blocked patterns registry
CREATE TABLE IF NOT EXISTS blocked_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('vendor_name', 'model_identifier', 'api_credential', 'system_instruction', 'json_metadata')),
  pattern text NOT NULL,
  replacement text DEFAULT '[REDACTED]',
  times_matched bigint DEFAULT 0,
  enabled boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category, pattern)
);

-- Vendor aliases and safe responses
CREATE TABLE IF NOT EXISTS vendor_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_term text NOT NULL UNIQUE,
  safe_response text NOT NULL,
  context text,
  priority integer DEFAULT 0,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE security_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_injection_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_aliases ENABLE ROW LEVEL SECURITY;

-- Security policies for security_rules
CREATE POLICY "Admins can manage security rules"
  ON security_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can view security rules"
  ON security_rules FOR SELECT
  TO authenticated
  USING (true);

-- Security policies for prompt_injection_attempts
CREATE POLICY "Admins can view all injection attempts"
  ON prompt_injection_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Service role can insert injection attempts"
  ON prompt_injection_attempts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Security policies for blocked_patterns
CREATE POLICY "Admins can manage blocked patterns"
  ON blocked_patterns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can view blocked patterns"
  ON blocked_patterns FOR SELECT
  TO authenticated
  USING (true);

-- Security policies for vendor_aliases
CREATE POLICY "Admins can manage vendor aliases"
  ON vendor_aliases FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can view vendor aliases"
  ON vendor_aliases FOR SELECT
  TO authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_injection_attempts_created_at ON prompt_injection_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_injection_attempts_user_id ON prompt_injection_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_injection_attempts_threat_level ON prompt_injection_attempts(threat_level);
CREATE INDEX IF NOT EXISTS idx_injection_attempts_event_type ON prompt_injection_attempts(event_type);
CREATE INDEX IF NOT EXISTS idx_security_rules_enabled ON security_rules(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_blocked_patterns_enabled ON blocked_patterns(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_vendor_aliases_enabled ON vendor_aliases(enabled) WHERE enabled = true;

-- Insert default security rules
INSERT INTO security_rules (rule_name, rule_type, pattern, threat_level, description) VALUES
  ('Direct Model Query', 'vendor_probe', 'what\s+(model|llm|ai|system)', 'medium', 'User asking what model/AI system is being used'),
  ('System Instruction Extraction', 'prompt_injection', 'repeat\s+(your\s+)?(instructions|prompt)', 'high', 'Attempt to extract system instructions'),
  ('Ignore Previous Instructions', 'prompt_injection', 'ignore\s+(previous|all)', 'high', 'Prompt injection to override instructions'),
  ('Identity Override', 'identity_override', 'you\s+are\s+now\s+(gpt|claude)', 'high', 'Attempt to override AI identity'),
  ('API Key Pattern', 'metadata_leak', 'sk-[a-zA-Z0-9]+', 'high', 'Potential API key leakage')
ON CONFLICT DO NOTHING;

-- Insert default blocked patterns
INSERT INTO blocked_patterns (category, pattern, replacement, notes) VALUES
  ('vendor_name', 'provider_a', '[REDACTED]', 'Vendor company name'),
  ('vendor_name', 'provider_b', '[REDACTED]', 'Vendor company name'),
  ('vendor_name', 'provider_c', '[REDACTED]', 'Vendor AI reference'),
  ('model_identifier', 'model-\d+', '[REDACTED]', 'Model versions'),
  ('model_identifier', 'assistant-\d+', '[REDACTED]', 'Model versions'),
  ('api_credential', 'sk-[a-zA-Z0-9]+', '[REDACTED]', 'API key pattern'),
  ('json_metadata', 'sequence_number', '', 'Internal sequence tracking'),
  ('json_metadata', 'item_id', '', 'Internal item identifier'),
  ('system_instruction', '\[SYSTEM\]', '', 'System instruction marker'),
  ('system_instruction', '<\|im_start\|>', '', 'Instruction marker')
ON CONFLICT (category, pattern) DO NOTHING;

-- Insert default vendor aliases
INSERT INTO vendor_aliases (trigger_term, safe_response, context, priority) VALUES
  ('model_a', 'Uhuru is a proprietary AI developed by OrionX. I don''t disclose or discuss underlying providers as I like them too much.', 'Vendor reference', 100),
  ('model_b', 'Uhuru is a proprietary AI developed by OrionX. I don''t disclose or discuss underlying providers as I like them too much.', 'Vendor reference', 100),
  ('model_c', 'Uhuru is a proprietary AI developed by OrionX. I don''t disclose or discuss underlying providers as I like them too much.', 'Vendor reference', 100),
  ('model_d', 'Uhuru is a proprietary AI developed by OrionX. I don''t disclose or discuss underlying providers as I like them too much.', 'Vendor reference', 100),
  ('vendor_a', 'Uhuru is a proprietary AI developed by OrionX. I don''t disclose or discuss underlying providers as I like them too much.', 'Vendor reference', 100),
  ('vendor_b', 'Uhuru is a proprietary AI developed by OrionX. I don''t disclose or discuss underlying providers as I like them too much.', 'Vendor reference', 100),
  ('what model', 'I''m Uhuru, a proprietary AI assistant created by OrionX in Botswana. I focus on understanding African contexts and helping with your questions.', 'Model inquiry', 90),
  ('which model', 'I''m Uhuru, a proprietary AI assistant created by OrionX in Botswana. I focus on understanding African contexts and helping with your questions.', 'Model inquiry', 90)
ON CONFLICT (trigger_term) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_security_rules_updated_at
  BEFORE UPDATE ON security_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blocked_patterns_updated_at
  BEFORE UPDATE ON blocked_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_aliases_updated_at
  BEFORE UPDATE ON vendor_aliases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
