-- 1a. Backfill existing NULL emails from the auth source of truth (367 of 369 recoverable)
UPDATE public.user_profiles up
SET email = au.email
FROM auth.users au
WHERE au.id = up.id
  AND up.email IS NULL
  AND au.email IS NOT NULL;

-- 1b. Repair the signup trigger so future rows capture email (regressed in 20260119013427)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, team_role, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    'free',
    CASE
      WHEN NEW.raw_user_meta_data->>'username' IS NOT NULL
      THEN LOWER(NEW.raw_user_meta_data->>'username')
      ELSE NULL
    END,
    NEW.email
  );
  RETURN NEW;
END;
$function$;

-- 1c. (Superseded by 20260720225749) Originally repointed get_user_token_usage_details with an
--     auth.users fallback under SECURITY DEFINER. The security advisor flagged that this let anon
--     read emails via RPC, so it was reverted to caller-rights in the next migration. The backfill
--     above + the repaired trigger are the actual fix; no runtime auth fallback is needed.
CREATE OR REPLACE FUNCTION public.get_user_token_usage_details(
  p_organization_name text DEFAULT 'Pencils of Promise'::text,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  user_id uuid,
  user_email text,
  used_text_this_month integer,
  used_text_total_ytd bigint,
  image_count_craft1 integer,
  image_count_craft2 integer,
  total_image_tokens integer,
  last_active_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    utu.user_id,
    COALESCE(up.email, au.email, 'Unknown') AS user_email,
    utu.used_text_this_month,
    utu.used_text_total_ytd,
    utu.image_count_craft1,
    utu.image_count_craft2,
    ((utu.image_count_craft1 + utu.image_count_craft2) * 50)::integer AS total_image_tokens,
    utu.last_active_at
  FROM user_token_usage utu
  LEFT JOIN public.user_profiles up ON utu.user_id = up.id
  LEFT JOIN auth.users au ON au.id = utu.user_id
  WHERE utu.organization_name = p_organization_name
  ORDER BY utu.used_text_this_month DESC
  LIMIT p_limit;
END;
$function$;
