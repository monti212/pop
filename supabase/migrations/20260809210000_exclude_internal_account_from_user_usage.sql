/*
  # Exclude internal staff account from the admin per-user usage listing

  monti@orionx.xyz is a GreyEd internal supa_admin account, not a Pencils of
  Promise user. Its testing/administration traffic showed up in the admin
  "individual user usage" table alongside real teacher accounts, polluting the
  numbers shown to the client. Filter it at the data layer so every consumer of
  the RPC is covered, not just one page.
*/

CREATE OR REPLACE FUNCTION public.get_user_token_usage_details(p_organization_name text DEFAULT 'Pencils of Promise'::text, p_limit integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, user_email text, used_text_this_month integer, used_text_total_ytd bigint, image_count_craft1 integer, image_count_craft2 integer, total_image_tokens integer, last_active_at timestamp with time zone)
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
    -- Internal GreyEd staff account: keep out of client-facing usage lists.
    AND COALESCE(up.email, '') <> 'monti@orionx.xyz'
  ORDER BY utu.used_text_this_month DESC
  LIMIT p_limit;
END;
$function$;
