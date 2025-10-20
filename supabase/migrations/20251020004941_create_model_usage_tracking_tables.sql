/*
  # Create Model Usage Tracking System

  1. New Tables
    - `model_usage_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `conversation_id` (uuid, nullable, references conversations)
      - `model_name` (text) - U 2.0, U 2.0 Extended, Craft-1, Craft-0
      - `model_type` (text) - text or image
      - `tokens_used` (integer, nullable) - for text models
      - `images_generated` (integer, nullable) - for image models
      - `input_cost` (numeric) - cost for input tokens/requests
      - `output_cost` (numeric) - cost for output tokens/images
      - `total_cost` (numeric) - total cost
      - `usage_date` (date) - date of usage
      - `created_at` (timestamptz)
      
    - `model_usage_daily_summary`
      - `id` (uuid, primary key)
      - `usage_date` (date, unique)
      - `u_2_0_tokens` (bigint) - U 2.0 tokens
      - `u_2_0_cost` (numeric) - U 2.0 cost
      - `u_2_0_extended_tokens` (bigint) - U 2.0 Extended tokens
      - `u_2_0_extended_cost` (numeric) - U 2.0 Extended cost
      - `craft_1_images` (integer) - Craft-1 images
      - `craft_1_cost` (numeric) - Craft-1 cost
      - `craft_0_images` (integer) - Craft-0 images
      - `craft_0_cost` (numeric) - Craft-0 cost
      - `total_cost` (numeric) - total daily cost
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to view their own data
    - Add policies for admin users to view all data

  3. Indexes
    - Index on user_id for fast user lookups
    - Index on usage_date for fast date range queries
    - Index on model_name for fast model-specific queries
*/

-- Create model_usage_logs table
CREATE TABLE IF NOT EXISTS model_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  model_name text NOT NULL,
  model_type text NOT NULL CHECK (model_type IN ('text', 'image')),
  tokens_used integer DEFAULT 0,
  images_generated integer DEFAULT 0,
  input_cost numeric(10, 6) DEFAULT 0,
  output_cost numeric(10, 6) DEFAULT 0,
  total_cost numeric(10, 6) DEFAULT 0,
  usage_date date DEFAULT CURRENT_DATE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create model_usage_daily_summary table
CREATE TABLE IF NOT EXISTS model_usage_daily_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usage_date date UNIQUE NOT NULL,
  u_2_0_tokens bigint DEFAULT 0,
  u_2_0_cost numeric(12, 6) DEFAULT 0,
  u_2_0_extended_tokens bigint DEFAULT 0,
  u_2_0_extended_cost numeric(12, 6) DEFAULT 0,
  craft_1_images integer DEFAULT 0,
  craft_1_cost numeric(12, 6) DEFAULT 0,
  craft_0_images integer DEFAULT 0,
  craft_0_cost numeric(12, 6) DEFAULT 0,
  total_cost numeric(12, 6) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_model_usage_logs_user_id ON model_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_model_usage_logs_usage_date ON model_usage_logs(usage_date);
CREATE INDEX IF NOT EXISTS idx_model_usage_logs_model_name ON model_usage_logs(model_name);
CREATE INDEX IF NOT EXISTS idx_model_usage_daily_summary_usage_date ON model_usage_daily_summary(usage_date);

-- Enable Row Level Security
ALTER TABLE model_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_usage_daily_summary ENABLE ROW LEVEL SECURITY;

-- Policies for model_usage_logs
CREATE POLICY "Users can view own usage logs"
  ON model_usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage logs"
  ON model_usage_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'admin'
    )
  );

CREATE POLICY "System can insert usage logs"
  ON model_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for model_usage_daily_summary
CREATE POLICY "Admins can view daily summary"
  ON model_usage_daily_summary FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'admin'
    )
  );

CREATE POLICY "Admins can insert daily summary"
  ON model_usage_daily_summary FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'admin'
    )
  );

CREATE POLICY "Admins can update daily summary"
  ON model_usage_daily_summary FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'admin'
    )
  );

-- Function to update daily summary
CREATE OR REPLACE FUNCTION update_model_usage_daily_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO model_usage_daily_summary (
    usage_date,
    u_2_0_tokens,
    u_2_0_cost,
    u_2_0_extended_tokens,
    u_2_0_extended_cost,
    craft_1_images,
    craft_1_cost,
    craft_0_images,
    craft_0_cost,
    total_cost,
    updated_at
  )
  SELECT
    NEW.usage_date,
    COALESCE(SUM(CASE WHEN model_name = 'U 2.0' THEN tokens_used ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN model_name = 'U 2.0' THEN total_cost ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN model_name = 'U 2.0 Extended' THEN tokens_used ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN model_name = 'U 2.0 Extended' THEN total_cost ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN model_name = 'Craft-1' THEN images_generated ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN model_name = 'Craft-1' THEN total_cost ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN model_name = 'Craft-0' THEN images_generated ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN model_name = 'Craft-0' THEN total_cost ELSE 0 END), 0),
    COALESCE(SUM(total_cost), 0),
    now()
  FROM model_usage_logs
  WHERE usage_date = NEW.usage_date
  GROUP BY usage_date
  ON CONFLICT (usage_date)
  DO UPDATE SET
    u_2_0_tokens = EXCLUDED.u_2_0_tokens,
    u_2_0_cost = EXCLUDED.u_2_0_cost,
    u_2_0_extended_tokens = EXCLUDED.u_2_0_extended_tokens,
    u_2_0_extended_cost = EXCLUDED.u_2_0_extended_cost,
    craft_1_images = EXCLUDED.craft_1_images,
    craft_1_cost = EXCLUDED.craft_1_cost,
    craft_0_images = EXCLUDED.craft_0_images,
    craft_0_cost = EXCLUDED.craft_0_cost,
    total_cost = EXCLUDED.total_cost,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update daily summary
CREATE TRIGGER trigger_update_model_usage_daily_summary
  AFTER INSERT ON model_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_model_usage_daily_summary();