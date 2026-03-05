/*
  # Extract Topics from Lesson Plan Content and Update Titles

  1. Purpose
    - Extract actual lesson topics from lesson plan content
    - Update titles from generic "YYYY-MM-DD_Lesson Plan" to "YYYY-MM-DD_ActualTopic"
    - Use content analysis to find subject/topic information

  2. Strategy
    - Search for Topic:, Subject:, or title patterns in content
    - Extract the most relevant topic information
    - Update title with proper date_topic format

  3. Safety
    - Only updates titles matching "Lesson Plan" pattern
    - Preserves date prefix
    - Non-destructive: keeps original content
*/

-- Function to extract topic from lesson plan content
CREATE OR REPLACE FUNCTION extract_lesson_topic(content_text TEXT)
RETURNS TEXT AS $$
DECLARE
  topic TEXT;
BEGIN
  -- Try to find "Topic:" or "Subject:" in content
  topic := (SELECT substring(content_text FROM '(?:Topic|Subject):\s*([^\n]+)'));
  
  -- Clean up the topic
  IF topic IS NOT NULL THEN
    topic := trim(regexp_replace(topic, '\*\*', '', 'g'));
    topic := trim(regexp_replace(topic, '^[:\-\s]+', '', 'g'));
    RETURN topic;
  END IF;
  
  -- Try to find content after "Class Information" and "Topic:"
  topic := (SELECT substring(content_text FROM 'Class Information[^\n]*\n[^\n]*\n-\s*Topic:\s*([^\n]+)'));
  
  IF topic IS NOT NULL THEN
    topic := trim(regexp_replace(topic, '\*\*', '', '', 'g'));
    RETURN topic;
  END IF;
  
  -- Try to extract from content descriptors like "45-minute Fractions plan"
  topic := (SELECT substring(content_text FROM '45-minute\s+([A-Za-z]+)\s+plan'));
  
  IF topic IS NOT NULL THEN
    RETURN topic;
  END IF;
  
  -- Try to find "lesson plan for" or "lesson plan on"
  topic := (SELECT substring(content_text FROM 'lesson plan (?:for|on)\s+([^\n,\.]+)'));
  
  IF topic IS NOT NULL THEN
    topic := trim(regexp_replace(topic, '\*\*', '', 'g'));
    RETURN topic;
  END IF;
  
  -- Try to find first substantial heading that's not "Lesson Plan"
  topic := (SELECT substring(content_text FROM '##?\s+([^\n]+)') 
            WHERE substring(content_text FROM '##?\s+([^\n]+)') NOT ILIKE '%lesson plan%'
            LIMIT 1);
  
  IF topic IS NOT NULL AND length(topic) < 100 THEN
    topic := trim(regexp_replace(topic, '^#+\s*', '', 'g'));
    RETURN topic;
  END IF;
  
  -- Default fallback
  RETURN 'Lesson Plan';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update class_documents titles
UPDATE class_documents
SET title = TO_CHAR(created_at, 'YYYY-MM-DD') || '_' || extract_lesson_topic(content),
    updated_at = NOW()
WHERE document_type = 'lesson_plan'
  AND is_lesson_plan = true
  AND title LIKE '%_Lesson Plan'
  AND content IS NOT NULL;

-- Update user_documents titles
UPDATE user_documents
SET title = TO_CHAR(created_at, 'YYYY-MM-DD') || '_' || extract_lesson_topic(content),
    updated_at = NOW()
WHERE document_type = 'office'
  AND metadata->>'source' = 'lesson-plan-generator'
  AND title LIKE '%_Lesson Plan'
  AND content IS NOT NULL;

-- Drop the function after use (optional - keep if you want to reuse it)
-- DROP FUNCTION IF EXISTS extract_lesson_topic(TEXT);
