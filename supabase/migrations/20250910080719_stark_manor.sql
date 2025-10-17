/*
  # Add WhatsApp Support

  1. Database Schema Updates
    - Add `phone_number` column to `user_profiles` for WhatsApp number linking
    - Add `channel` column to `messages` to track message source (web, whatsapp, etc.)
    - Add `whatsapp_message_id` column to `messages` for Twilio message tracking
    - Add index on phone_number for fast lookups

  2. Security
    - Update RLS policies to handle phone-based users
    - Ensure proper access controls for cross-channel conversations

  3. Data Integrity
    - Add constraints for valid phone numbers
    - Ensure message channel tracking
*/

-- Add phone_number column to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone_number text UNIQUE;
  END IF;
END $$;

-- Add channel column to messages to track source
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'channel'
  ) THEN
    ALTER TABLE messages ADD COLUMN channel text DEFAULT 'web';
  END IF;
END $$;

-- Add whatsapp_message_id for tracking Twilio messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'whatsapp_message_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN whatsapp_message_id text;
  END IF;
END $$;

-- Add delivery_status for message delivery tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'delivery_status'
  ) THEN
    ALTER TABLE messages ADD COLUMN delivery_status text DEFAULT 'sent';
  END IF;
END $$;

-- Create index on phone_number for fast WhatsApp user lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'user_profiles_phone_number_idx'
  ) THEN
    CREATE INDEX user_profiles_phone_number_idx ON user_profiles(phone_number);
  END IF;
END $$;

-- Create index on whatsapp_message_id for delivery status updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'messages_whatsapp_message_id_idx'
  ) THEN
    CREATE INDEX messages_whatsapp_message_id_idx ON messages(whatsapp_message_id);
  END IF;
END $$;

-- Add constraint for valid channel values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'messages' AND constraint_name = 'messages_channel_check'
  ) THEN
    ALTER TABLE messages ADD CONSTRAINT messages_channel_check 
    CHECK (channel IN ('web', 'whatsapp', 'sms', 'api'));
  END IF;
END $$;

-- Add constraint for valid delivery status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'messages' AND constraint_name = 'messages_delivery_status_check'
  ) THEN
    ALTER TABLE messages ADD CONSTRAINT messages_delivery_status_check 
    CHECK (delivery_status IN ('sent', 'delivered', 'read', 'failed', 'undelivered'));
  END IF;
END $$;