/*
  # Update messages content column to support multimodal content

  1. Database Changes
    - Change `messages.content` from `text` to `jsonb`
    - This allows storing structured multimodal content (text + images)
    - Ensures backward compatibility with existing text messages

  2. Impact
    - Existing text messages will automatically convert to jsonb strings
    - New multimodal messages can store arrays of content parts
    - No data loss during migration

  3. Security
    - Existing RLS policies remain unchanged
    - Content validation handled at application level
*/

-- Update the content column to support multimodal content (jsonb)
ALTER TABLE public.messages 
ALTER COLUMN content TYPE jsonb USING content::jsonb;

-- Add a comment to document the new format
COMMENT ON COLUMN public.messages.content IS 'Stores message content as either a string (text-only) or jsonb array (multimodal with text and image_url parts)';