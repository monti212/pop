/*
  # Align teacher announcements schema

  Some environments already had the older classroom announcements table with
  content/published_date/teacher_id columns. The admin announcements UI uses
  body/published_at/priority and publishes updates for all teachers.
*/

CREATE TABLE IF NOT EXISTS public.teacher_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  priority text NOT NULL DEFAULT 'normal',
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teacher_announcements'
      AND column_name = 'body'
  ) THEN
    ALTER TABLE public.teacher_announcements ADD COLUMN body text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teacher_announcements'
      AND column_name = 'content'
  ) THEN
    ALTER TABLE public.teacher_announcements ADD COLUMN content text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teacher_announcements'
      AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.teacher_announcements ADD COLUMN priority text NOT NULL DEFAULT 'normal';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teacher_announcements'
      AND column_name = 'published_at'
  ) THEN
    ALTER TABLE public.teacher_announcements ADD COLUMN published_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teacher_announcements'
      AND column_name = 'published_date'
  ) THEN
    ALTER TABLE public.teacher_announcements ADD COLUMN published_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teacher_announcements'
      AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.teacher_announcements ADD COLUMN expires_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teacher_announcements'
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.teacher_announcements
      ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teacher_announcements'
      AND column_name = 'teacher_id'
  ) THEN
    ALTER TABLE public.teacher_announcements
      ADD COLUMN teacher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();
  ELSE
    ALTER TABLE public.teacher_announcements
      ALTER COLUMN teacher_id SET DEFAULT auth.uid();
  END IF;

  UPDATE public.teacher_announcements
  SET
    body = COALESCE(NULLIF(body, ''), content, title),
    content = COALESCE(NULLIF(content, ''), body, title),
    published_at = COALESCE(published_at, published_date),
    published_date = COALESCE(published_date, published_at),
    created_by = COALESCE(created_by, teacher_id);

  ALTER TABLE public.teacher_announcements
    ALTER COLUMN body SET NOT NULL,
    ALTER COLUMN content SET NOT NULL,
    ALTER COLUMN priority SET DEFAULT 'normal',
    ALTER COLUMN status SET DEFAULT 'draft',
    ALTER COLUMN created_by SET DEFAULT auth.uid();
END $$;

ALTER TABLE public.teacher_announcements
  DROP CONSTRAINT IF EXISTS teacher_announcements_priority_check;

ALTER TABLE public.teacher_announcements
  ADD CONSTRAINT teacher_announcements_priority_check
  CHECK (priority IN ('normal', 'high'));

CREATE OR REPLACE FUNCTION public.sync_teacher_announcement_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.body = COALESCE(NULLIF(NEW.body, ''), NEW.content);
  NEW.content = COALESCE(NULLIF(NEW.content, ''), NEW.body);
  NEW.published_at = COALESCE(NEW.published_at, NEW.published_date);
  NEW.published_date = COALESCE(NEW.published_date, NEW.published_at);
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_teacher_announcement_columns
  ON public.teacher_announcements;

CREATE TRIGGER sync_teacher_announcement_columns
  BEFORE INSERT OR UPDATE ON public.teacher_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_teacher_announcement_columns();

CREATE INDEX IF NOT EXISTS teacher_announcements_visible_idx
  ON public.teacher_announcements (status, priority, published_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS teacher_announcements_admin_idx
  ON public.teacher_announcements (updated_at DESC);

ALTER TABLE public.teacher_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers manage own announcements"
  ON public.teacher_announcements;
DROP POLICY IF EXISTS "Authenticated users can read published teacher announcements"
  ON public.teacher_announcements;
DROP POLICY IF EXISTS "Admins can read all teacher announcements"
  ON public.teacher_announcements;
DROP POLICY IF EXISTS "Admins can create teacher announcements"
  ON public.teacher_announcements;
DROP POLICY IF EXISTS "Admins can update teacher announcements"
  ON public.teacher_announcements;
DROP POLICY IF EXISTS "Admins can delete teacher announcements"
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

CREATE POLICY "Admins can read all teacher announcements"
  ON public.teacher_announcements
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can create teacher announcements"
  ON public.teacher_announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update teacher announcements"
  ON public.teacher_announcements
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete teacher announcements"
  ON public.teacher_announcements
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

COMMENT ON TABLE public.teacher_announcements IS
  'PoP-controlled announcements and updates shown to authenticated teachers on the home page.';
