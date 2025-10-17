/*
  # Add is_long_response column to messages table

  1. Schema Changes
    - Add `is_long_response` boolean column to `messages` table
    - Set default value to false
    - Add index for performance

  2. Purpose
    - Persist long document state across page refreshes
    - Maintain consistent UI behavior for long responses
*/

-- Add is_long_response column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_long_response boolean DEFAULT false;

-- Add index for performance when filtering long responses
CREATE INDEX IF NOT EXISTS idx_messages_is_long_response 
ON messages(is_long_response) 
WHERE is_long_response = true;

-- Add comment for documentation
COMMENT ON COLUMN messages.is_long_response IS 'Indicates if this message should be displayed as a long response with preview/canvas options';