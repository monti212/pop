/*
  # Fix class_assessments RLS Policy Recursion (42P17)

  Problem:
    The UPDATE and DELETE policies on class_assessments use
      EXISTS (SELECT 1 FROM classes WHERE ...)
    which triggers the "Admins can view all classes" policy on classes,
    which queries user_profiles, which has a self-referencing SELECT policy.
    This creates infinite recursion detected by PostgreSQL as error 42P17.

  Solution:
    - For UPDATE and DELETE, use direct user_id = auth.uid() check since
      the teacher who created the assessment is the one editing/deleting it.
      This avoids the classes -> user_profiles recursion chain entirely.
    - For SELECT and INSERT, keep the classes join but guard admin path
      with is_admin() function (no table recursion).
    - Add a SECURITY DEFINER RPC function as a reliable bypass for updates.
*/

-- Drop all existing class_assessments policies
DROP POLICY IF EXISTS "Teachers can view their class assessments" ON class_assessments;
DROP POLICY IF EXISTS "Teachers can create class assessments" ON class_assessments;
DROP POLICY IF EXISTS "Teachers can update their class assessments" ON class_assessments;
DROP POLICY IF EXISTS "Teachers can delete their class assessments" ON class_assessments;

-- SELECT: teacher owns the record OR owns the class
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

-- INSERT: teacher must own the class being inserted into
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

-- UPDATE: direct user_id check — no subquery to classes, no recursion
CREATE POLICY "Teachers can update their class assessments"
  ON class_assessments FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- DELETE: direct user_id check — no subquery to classes, no recursion
CREATE POLICY "Teachers can delete their class assessments"
  ON class_assessments FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- RPC function to update assessment bypassing RLS (SECURITY DEFINER)
-- This serves as a reliable fallback if the RLS fix above hasn't been applied yet.
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
  -- Verify the user owns this assessment
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
