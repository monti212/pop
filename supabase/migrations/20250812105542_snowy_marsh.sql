/*
  # Add conversation history to saved websites

  1. Schema Changes
    - Add `conversation_history` column to `saved_websites` table
    - Column type: jsonb to store array of conversation messages
    - Each message has: role (user/assistant), content, timestamp

  2. Data Structure
    - conversation_history: [{ role: 'user' | 'assistant', content: string, timestamp: string }]
*/

-- Add conversation_history column to saved_websites table
ALTER TABLE public.saved_websites 
ADD COLUMN IF NOT EXISTS conversation_history jsonb DEFAULT '[]'::jsonb;

-- Update existing records with empty conversation history if needed
UPDATE public.saved_websites 
SET conversation_history = '[]'::jsonb 
WHERE conversation_history IS NULL;