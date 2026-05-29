/*
  # Supa Admin Daily Logs

  - Private work journal for supa_admin users
  - Each user can only see their own entries
  - Not visible to admin/prime/free users
*/

CREATE TABLE IF NOT EXISTS public.supa_admin_daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  summary text,
  details text,
  source_doc_path text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supa_admin_daily_logs_title_len CHECK (char_length(title) BETWEEN 3 AND 300)
);

CREATE INDEX IF NOT EXISTS supa_admin_daily_logs_creator_date_idx
  ON public.supa_admin_daily_logs(created_by, log_date DESC, created_at DESC);

ALTER TABLE public.supa_admin_daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supa admin can view own daily logs" ON public.supa_admin_daily_logs;
CREATE POLICY "Supa admin can view own daily logs"
  ON public.supa_admin_daily_logs
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Supa admin can insert own daily logs" ON public.supa_admin_daily_logs;
CREATE POLICY "Supa admin can insert own daily logs"
  ON public.supa_admin_daily_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Supa admin can update own daily logs" ON public.supa_admin_daily_logs;
CREATE POLICY "Supa admin can update own daily logs"
  ON public.supa_admin_daily_logs
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.team_role = 'supa_admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP POLICY IF EXISTS "Supa admin can delete own daily logs" ON public.supa_admin_daily_logs;
CREATE POLICY "Supa admin can delete own daily logs"
  ON public.supa_admin_daily_logs
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP TRIGGER IF EXISTS update_supa_admin_daily_logs_updated_at ON public.supa_admin_daily_logs;
CREATE TRIGGER update_supa_admin_daily_logs_updated_at
  BEFORE UPDATE ON public.supa_admin_daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.supa_admin_daily_logs IS 'Private daily work logger for supa_admin users only.';
