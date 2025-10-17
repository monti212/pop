/*
  # WhatsApp Settings Table

  ## Overview
  This migration creates a table to store WhatsApp configuration settings
  that can be applied globally or per phone number.

  ## New Tables
    - `whatsapp_settings`
      - `id` (uuid, primary key)
      - `phone_number` (text, nullable - null means global settings)
      - `max_conversation_history` (integer, default 10 - max messages Uhuru remembers)
      - `daily_message_limit` (integer, default 25 - max messages per day)
      - `multimodal_enabled` (boolean, default true - enable image/doc processing)
      - `images_enabled` (boolean, default true - allow image messages)
      - `documents_enabled` (boolean, default false - allow document messages)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
  ## Security
    - Enable RLS
    - Service role full access
    - Admin users (optimus_prime, prime, autobot) can read and update

  ## Notes
    - null phone_number = global default settings
    - specific phone_number = override settings for that number
    - webhook checks specific settings first, falls back to global
*/

-- Create whatsapp_settings table
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE,
  max_conversation_history integer DEFAULT 10,
  daily_message_limit integer DEFAULT 25,
  multimodal_enabled boolean DEFAULT true,
  images_enabled boolean DEFAULT true,
  documents_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT max_history_positive CHECK (max_conversation_history > 0),
  CONSTRAINT daily_limit_positive CHECK (daily_message_limit > 0)
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_phone ON whatsapp_settings(phone_number);

-- Enable RLS
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role can manage whatsapp_settings"
  ON whatsapp_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can view and update settings
CREATE POLICY "Admins can view whatsapp_settings"
  ON whatsapp_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'autobot')
    )
  );

CREATE POLICY "Admins can update whatsapp_settings"
  ON whatsapp_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'autobot')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'autobot')
    )
  );

CREATE POLICY "Admins can insert whatsapp_settings"
  ON whatsapp_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'autobot')
    )
  );

CREATE POLICY "Admins can delete whatsapp_settings"
  ON whatsapp_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'autobot')
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_whatsapp_settings_updated_at
  BEFORE UPDATE ON whatsapp_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_updated_at();

-- Insert default global settings
INSERT INTO whatsapp_settings (phone_number, max_conversation_history, daily_message_limit, multimodal_enabled, images_enabled, documents_enabled)
VALUES (NULL, 10, 25, true, true, false)
ON CONFLICT (phone_number) DO NOTHING;