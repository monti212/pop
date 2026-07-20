-- The backfill (20260720225228) already populated user_profiles.email, and the repaired trigger
-- keeps it populated. So the runtime auth.users fallback is unnecessary — and it forced
-- SECURITY DEFINER, which let anon read emails via RPC (flagged by the security advisor). Revert to
-- the original caller-rights function (no auth.users join, no DEFINER). Emails now resolve because
-- the column is backfilled; the 2 truly account-less rows correctly show 'Unknown'.
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
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    utu.user_id,
    COALESCE(up.email, 'Unknown') AS user_email,
    utu.used_text_this_month,
    utu.used_text_total_ytd,
    utu.image_count_craft1,
    utu.image_count_craft2,
    ((utu.image_count_craft1 + utu.image_count_craft2) * 50)::integer AS total_image_tokens,
    utu.last_active_at
  FROM user_token_usage utu
  LEFT JOIN user_profiles up ON utu.user_id = up.id
  WHERE utu.organization_name = p_organization_name
  ORDER BY utu.used_text_this_month DESC
  LIMIT p_limit;
END;
$function$;
