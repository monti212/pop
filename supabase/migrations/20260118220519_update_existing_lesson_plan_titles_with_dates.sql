/*
  # Update Existing Lesson Plan Titles with Date Prefix

  1. Purpose
    - Add date prefix (YYYY-MM-DD_) to all existing lesson plan titles
    - Use the lesson plan's created_at date for the prefix
    - Skip titles that already have the date prefix format

  2. Changes
    - Updates all class_documents with document_type = 'lesson_plan'
    - Adds date prefix based on created_at timestamp
    - Preserves original title after the date prefix

  3. Format
    - Before: "Lesson Plan" or "Osmosis"
    - After: "2026-01-15_Lesson Plan" or "2026-01-15_Osmosis"

  4. Safety
    - Only updates records without existing date prefix
    - Uses regex pattern to detect existing date prefix
    - Non-destructive: preserves original title content
*/

-- Update class_documents lesson plans without date prefix
UPDATE class_documents
SET title = TO_CHAR(created_at, 'YYYY-MM-DD') || '_' || title,
    updated_at = NOW()
WHERE document_type = 'lesson_plan'
  AND is_lesson_plan = true
  AND title !~ '^\d{4}-\d{2}-\d{2}_';

-- Update user_documents lesson plans without date prefix (if they exist)
UPDATE user_documents
SET title = TO_CHAR(created_at, 'YYYY-MM-DD') || '_' || title,
    updated_at = NOW()
WHERE document_type = 'office'
  AND metadata->>'source' = 'lesson-plan-generator'
  AND title !~ '^\d{4}-\d{2}-\d{2}_';
