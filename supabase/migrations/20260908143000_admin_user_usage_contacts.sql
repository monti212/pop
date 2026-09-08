/*
  # Show user contact details in admin token usage

  The Individual Users report previously returned COALESCE(user_profiles.email,
  'Unknown'), so phone-based signups and profiles with a missing copied email
  appeared as Unknown. This version is admin-gated and SECURITY DEFINER so it can
  safely resolve auth.users email/phone for admins only.
*/

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS username text;

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
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    utu.user_id,
    COALESCE(
      NULLIF(up.email, ''),
      NULLIF(au.email, ''),
      NULLIF(up.phone_number, ''),
      NULLIF(au.phone, ''),
      NULLIF(up.username, ''),
      NULLIF(up.display_name, ''),
      'Unknown'
    ) AS user_email,
    utu.used_text_this_month,
    utu.used_text_total_ytd,
    utu.image_count_craft1,
    utu.image_count_craft2,
    ((utu.image_count_craft1 + utu.image_count_craft2) * 50)::integer AS total_image_tokens,
    utu.last_active_at
  FROM public.user_token_usage utu
  LEFT JOIN public.user_profiles up ON utu.user_id = up.id
  LEFT JOIN auth.users au ON utu.user_id = au.id
  WHERE utu.organization_name = p_organization_name
    -- Internal GreyEd staff account: keep out of client-facing usage lists.
    AND COALESCE(NULLIF(up.email, ''), NULLIF(au.email, ''), '') <> 'monti@orionx.xyz'
  ORDER BY utu.used_text_this_month DESC
  LIMIT p_limit;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_user_token_usage_details(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_token_usage_details(text, integer) TO authenticated;

COMMENT ON FUNCTION public.get_user_token_usage_details(text, integer) IS
  'Admin-only token usage report. Resolves profile/auth email or phone for admin display.';
