/*
  # Update Conversation Titles with Smart Titles from First Message

  1. Purpose
    - Update conversations with generic titles ("New Conversation" or dates)
    - Generate smart titles based on the first user message content
    - Improve conversation discoverability in history

  2. Strategy
    - Find conversations with generic titles
    - Extract first user message for each conversation
    - Generate a meaningful title from the message content
    - Limit title length to 50 characters for readability

  3. Safety
    - Only updates conversations with generic titles
    - Preserves conversations that already have custom titles
    - Non-destructive: only updates title field
*/

-- Function to generate a smart title from message content
CREATE OR REPLACE FUNCTION generate_conversation_title(message_content JSONB)
RETURNS TEXT AS $$
DECLARE
  text_content TEXT;
  title TEXT;
BEGIN
  -- Extract text from message content (handle both string and array formats)
  IF jsonb_typeof(message_content) = 'string' THEN
    text_content := message_content::TEXT;
  ELSIF jsonb_typeof(message_content) = 'array' THEN
    -- Extract text from content array (for multi-part messages)
    SELECT string_agg(elem->>'text', ' ')
    INTO text_content
    FROM jsonb_array_elements(message_content) AS elem
    WHERE elem->>'type' = 'text';
  ELSE
    RETURN 'New Conversation';
  END IF;

  -- Clean up the text content
  IF text_content IS NULL OR trim(text_content) = '' THEN
    RETURN 'New Conversation';
  END IF;

  -- Remove quotes if present
  text_content := trim(both '"' from text_content);

  -- Take first line only
  title := split_part(text_content, E'\n', 1);

  -- Remove markdown symbols
  title := regexp_replace(title, '^[#\-*>]+\s*', '', 'g');

  -- Normalize whitespace
  title := regexp_replace(title, '\s+', ' ', 'g');

  -- Trim
  title := trim(title);

  -- Limit to 50 characters
  IF length(title) > 50 THEN
    title := substring(title, 1, 47) || '...';
  END IF;

  -- Return default if title is too short
  IF length(title) < 3 THEN
    RETURN 'New Conversation';
  END IF;

  RETURN title;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update conversations with generic titles
UPDATE conversations
SET title = generate_conversation_title(first_message.content),
    updated_at = NOW()
FROM (
  SELECT DISTINCT ON (m.conversation_id)
    m.conversation_id,
    m.content
  FROM messages m
  WHERE m.role = 'user'
  ORDER BY m.conversation_id, m.created_at ASC
) AS first_message
WHERE conversations.id = first_message.conversation_id
  AND (
    conversations.title = 'New Conversation'
    OR conversations.title ~ '^\d{2}/\d{2}/\d{4}$'
    OR conversations.title IS NULL
  );

-- Drop the function after use (keep it for future use)
-- DROP FUNCTION IF EXISTS generate_conversation_title(JSONB);
