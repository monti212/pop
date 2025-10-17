/*
  # Add Image Generation Tracking to WhatsApp Usage

  1. Changes
    - Add `image_generation_count` column to `whatsapp_usage` table
    - Tracks daily image generation count for rate limiting (2 images per day)

  2. Security
    - No changes to RLS policies (already in place)
*/

-- Add image_generation_count column to whatsapp_usage table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_usage' AND column_name = 'image_generation_count'
  ) THEN
    ALTER TABLE whatsapp_usage ADD COLUMN image_generation_count integer DEFAULT 0;
  END IF;
END $$;
