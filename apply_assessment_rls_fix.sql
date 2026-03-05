-- ============================================================
-- RUN THIS IN THE SUPABASE DASHBOARD → SQL EDITOR
-- Fixes: "database error, code: 42P17" when editing assessments
-- ============================================================

-- Step 1: Fix RLS policies (remove recursive classes subquery from UPDATE/DELETE)
DROP POLICY IF EXISTS "Teachers can view their class assessments" ON class_assessments;
DROP POLICY IF EXISTS "Teachers can create class assessments" ON class_assessments;
DROP POLICY IF EXISTS "Teachers can update their class assessments" ON class_assessments;
DROP POLICY IF EXISTS "Teachers can delete their class assessments" ON class_assessments;

CREATE POLICY "Teachers can view their class assessments"
  ON class_assessments FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_assessments.class_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teachers can create class assessments"
  ON class_assessments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_assessments.class_id
      AND classes.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teachers can update their class assessments"
  ON class_assessments FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Teachers can delete their class assessments"
  ON class_assessments FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Step 2: Create RPC function for safe assessment updates
CREATE OR REPLACE FUNCTION update_class_assessment(
  p_assessment_id uuid,
  p_user_id uuid,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_due_date date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM class_assessments
    WHERE id = p_assessment_id AND user_id = p_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Assessment not found or access denied');
  END IF;

  UPDATE class_assessments
  SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    status = COALESCE(p_status, status),
    due_date = COALESCE(p_due_date, due_date),
    updated_at = now()
  WHERE id = p_assessment_id AND user_id = p_user_id;

  SELECT json_build_object(
    'success', true,
    'data', row_to_json(ca)
  ) INTO v_result
  FROM class_assessments ca
  WHERE ca.id = p_assessment_id;

  RETURN v_result;
END;
$$;
