/*
  # Clean WhatsApp message duplicates and add unique index

  1. Data Cleanup
     - Identify and remove duplicate WhatsApp messages
     - Keep only the earliest message per MessageSid
  
  2. Index Creation
     - Add unique partial index on whatsapp_message_id
     - Prevents future duplicate message processing
  
  3. Database Integrity
     - Ensures one-to-one mapping between Twilio MessageSid and stored messages
     - Supports webhook idempotency at database level
*/

-- Step 1: View existing duplicates (for logging purposes)
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO duplicate_count
    FROM (
        SELECT whatsapp_message_id
        FROM public.messages
        WHERE whatsapp_message_id IS NOT NULL
        GROUP BY whatsapp_message_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE 'Found % WhatsApp message IDs with duplicates', duplicate_count;
END $$;

-- Step 2: Delete duplicate messages, keeping the earliest created_at row per SID
DELETE FROM public.messages m
USING (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY whatsapp_message_id
             ORDER BY created_at ASC
           ) AS rn
    FROM public.messages
    WHERE whatsapp_message_id IS NOT NULL
  ) t
  WHERE t.rn > 1
) z
WHERE m.id = z.id;

-- Step 3: Create unique partial index on whatsapp_message_id
-- This prevents future duplicates at the database level
CREATE UNIQUE INDEX IF NOT EXISTS messages_whatsapp_msgid_uniq
ON public.messages (whatsapp_message_id)
WHERE whatsapp_message_id IS NOT NULL;

-- Step 4: Log completion
DO $$
BEGIN
    RAISE NOTICE 'WhatsApp message deduplication and unique index creation completed';
END $$;