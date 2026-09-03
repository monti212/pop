/*
  # Teacher announcements

  Admin-controlled updates for the authenticated PoP home page.
  Published, non-expired posts are visible to all signed-in teachers.
  Staff users can manage the full announcement lifecycle.
*/

CREATE TABLE IF NOT EXISTS public.teacher_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) > 0),
  body text NOT NULL CHECK (char_length(btrim(body)) > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS teacher_announcements_visible_idx
  ON public.teacher_announcements (status, priority, published_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS teacher_announcements_admin_idx
  ON public.teacher_announcements (updated_at DESC);

CREATE OR REPLACE FUNCTION public.update_teacher_announcements_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_teacher_announcements_updated_at
  ON public.teacher_announcements;

CREATE TRIGGER update_teacher_announcements_updated_at
  BEFORE UPDATE ON public.teacher_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_teacher_announcements_updated_at();

ALTER TABLE public.teacher_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read published teacher announcements"
  ON public.teacher_announcements;
CREATE POLICY "Authenticated users can read published teacher announcements"
  ON public.teacher_announcements
  FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    AND (published_at IS NULL OR published_at <= now())
    AND (expires_at IS NULL OR expires_at > now())
  );

DROP POLICY IF EXISTS "Admins can read all teacher announcements"
  ON public.teacher_announcements;
CREATE POLICY "Admins can read all teacher announcements"
  ON public.teacher_announcements
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can create teacher announcements"
  ON public.teacher_announcements;
CREATE POLICY "Admins can create teacher announcements"
  ON public.teacher_announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update teacher announcements"
  ON public.teacher_announcements;
CREATE POLICY "Admins can update teacher announcements"
  ON public.teacher_announcements
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete teacher announcements"
  ON public.teacher_announcements;
CREATE POLICY "Admins can delete teacher announcements"
  ON public.teacher_announcements
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

COMMENT ON TABLE public.teacher_announcements IS
  'PoP-controlled announcements and updates shown to authenticated teachers on the home page.';
