/*
  # Daily image generation limit

  Restricts each authenticated teacher/user to 3 generated images per day.
  The edge function reserves quota before calling the upstream image model so
  concurrent requests cannot exceed the cap.
*/

CREATE TABLE IF NOT EXISTS public.user_daily_image_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  image_count integer NOT NULL DEFAULT 0 CHECK (image_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS user_daily_image_usage_date_idx
  ON public.user_daily_image_usage (usage_date DESC);

INSERT INTO public.user_daily_image_usage (user_id, usage_date, image_count)
SELECT
  user_id,
  created_at::date AS usage_date,
  COUNT(*)::integer AS image_count
FROM public.image_generation_log
WHERE created_at::date >= CURRENT_DATE
GROUP BY user_id, created_at::date
ON CONFLICT (user_id, usage_date) DO UPDATE
SET
  image_count = GREATEST(
    public.user_daily_image_usage.image_count,
    EXCLUDED.image_count
  ),
  updated_at = now();

CREATE OR REPLACE FUNCTION public.update_user_daily_image_usage_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_user_daily_image_usage_updated_at
  ON public.user_daily_image_usage;

CREATE TRIGGER update_user_daily_image_usage_updated_at
  BEFORE UPDATE ON public.user_daily_image_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_daily_image_usage_updated_at();

CREATE OR REPLACE FUNCTION public.reserve_daily_image_generation(
  p_user_id uuid,
  p_image_count integer DEFAULT 1,
  p_daily_limit integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_requested integer := GREATEST(COALESCE(p_image_count, 1), 1);
  v_limit integer := GREATEST(COALESCE(p_daily_limit, 3), 0);
  v_count integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'auth_required',
      'limit', v_limit,
      'used', 0,
      'remaining', 0
    );
  END IF;

  IF v_requested > v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_image_limit',
      'limit', v_limit,
      'used', v_limit,
      'remaining', 0
    );
  END IF;

  INSERT INTO public.user_daily_image_usage (user_id, usage_date, image_count)
  VALUES (p_user_id, v_today, v_requested)
  ON CONFLICT (user_id, usage_date) DO UPDATE
  SET image_count = public.user_daily_image_usage.image_count + EXCLUDED.image_count
  WHERE public.user_daily_image_usage.image_count + EXCLUDED.image_count <= v_limit
  RETURNING image_count INTO v_count;

  IF v_count IS NULL THEN
    SELECT image_count
    INTO v_count
    FROM public.user_daily_image_usage
    WHERE user_id = p_user_id
      AND usage_date = v_today;

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_image_limit',
      'limit', v_limit,
      'used', COALESCE(v_count, 0),
      'remaining', GREATEST(0, v_limit - COALESCE(v_count, 0))
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'limit', v_limit,
    'used', v_count,
    'remaining', GREATEST(0, v_limit - v_count)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_daily_image_generation(
  p_user_id uuid,
  p_image_count integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_requested integer := GREATEST(COALESCE(p_image_count, 1), 1);
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.user_daily_image_usage
  SET image_count = GREATEST(0, image_count - v_requested)
  WHERE user_id = p_user_id
    AND usage_date = CURRENT_DATE;
END;
$$;

ALTER TABLE public.user_daily_image_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own daily image usage"
  ON public.user_daily_image_usage;
CREATE POLICY "Users can view their own daily image usage"
  ON public.user_daily_image_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all daily image usage"
  ON public.user_daily_image_usage;
CREATE POLICY "Admins can view all daily image usage"
  ON public.user_daily_image_usage
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

REVOKE ALL ON FUNCTION public.reserve_daily_image_generation(uuid, integer, integer)
  FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_daily_image_generation(uuid, integer)
  FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_daily_image_generation(uuid, integer, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.release_daily_image_generation(uuid, integer)
  TO service_role;

COMMENT ON TABLE public.user_daily_image_usage IS
  'Per-user daily image generation reservation counts used to enforce the 3 images/day teacher cap.';
