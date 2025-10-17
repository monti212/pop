/*
  # Clean WhatsApp message duplicates and add unique index

  1. Data Cleanup
    - Remove existing duplicate messages by whatsapp_message_id
    - Keep the earliest message per MessageSid

  2. Database Schema
    - Drop any existing unique index on whatsapp_message_id
    - Create partial unique index that allows NULLs
    - Ensures idempotency for WhatsApp webhook processing

  3. Benefits
    - Prevents Twilio retry duplicates
    - Allows assistant messages to have NULL whatsapp_message_id initially
    - Enforces uniqueness only when whatsapp_message_id is present
*/

-- See duplicates first (optional diagnostic query)
-- SELECT whatsapp_message_id, COUNT(*)
-- FROM public.messages
-- WHERE whatsapp_message_id IS NOT NULL
-- GROUP BY 1
-- HAVING COUNT(*) > 1
-- ORDER BY 2 DESC;

-- One-time cleanup: remove duplicate messages, keep earliest by created_at
DELETE FROM public.messages m
USING public.messages d
WHERE m.whatsapp_message_id = d.whatsapp_message_id
  AND m.id > d.id
  AND m.whatsapp_message_id IS NOT NULL;

-- Alternative cleanup method (more explicit about keeping earliest):
-- DELETE FROM public.messages m
-- USING (
--   SELECT id
--   FROM (
--     SELECT id,
--            ROW_NUMBER() OVER (
--              PARTITION BY whatsapp_message_id
--              ORDER BY created_at ASC
--            ) AS rn
--     FROM public.messages
--     WHERE whatsapp_message_id IS NOT NULL
--   ) t
--   WHERE t.rn > 1
-- ) z
-- WHERE m.id = z.id;

-- Remove any legacy unique index first (if it exists)
DROP INDEX IF EXISTS messages_whatsapp_msgid_uniq;

-- Create partial unique index to allow NULLs while enforcing uniqueness when present
CREATE UNIQUE INDEX IF NOT EXISTS messages_whatsapp_msgid_uniq
ON public.messages (whatsapp_message_id)
WHERE whatsapp_message_id IS NOT NULL;