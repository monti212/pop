/*
  # Fix ambiguous "email" column in token RPCs

  add_token_refill() and adjust_token_cap() both SELECT email INTO v_admin_email
  from a JOIN of auth.users and user_profiles. Both tables expose an `email`
  column, so Postgres raises:

    column reference "email" is ambiguous

  ...before the role check ever runs. Qualifying the column as auth.users.email
  fixes the failure. Signatures are unchanged so callers (frontend RPC) need no
  updates. search_path is re-applied because CREATE OR REPLACE resets it.
*/

CREATE OR REPLACE FUNCTION add_token_refill(
  p_organization_name text,
  p_amount integer,
  p_expires_at timestamptz,
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_refill_id uuid;
  v_admin_email text;
BEGIN
  SELECT auth.users.email INTO v_admin_email
  FROM auth.users
  JOIN user_profiles ON auth.users.id = user_profiles.id
  WHERE auth.users.id = auth.uid()
    AND user_profiles.team_role = 'supa_admin';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only supa_admin can add token refills';
  END IF;

  INSERT INTO token_refills (
    organization_name,
    amount,
    consumed,
    expires_at,
    added_by_user_id,
    notes
  )
  VALUES (
    p_organization_name,
    p_amount,
    0,
    p_expires_at,
    auth.uid(),
    p_notes
  )
  RETURNING id INTO v_refill_id;

  INSERT INTO token_cap_audit_log (
    organization_name,
    action_type,
    admin_user_id,
    admin_email,
    new_value,
    details
  )
  VALUES (
    p_organization_name,
    'refill_added',
    auth.uid(),
    v_admin_email,
    p_amount,
    jsonb_build_object(
      'refill_id', v_refill_id,
      'amount', p_amount,
      'expires_at', p_expires_at,
      'notes', p_notes
    )
  );

  RETURN v_refill_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION add_token_refill(text, integer, timestamptz, text)
  SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION adjust_token_cap(
  p_organization_name text,
  p_new_cap bigint
)
RETURNS boolean AS $$
DECLARE
  v_old_cap bigint;
  v_admin_email text;
BEGIN
  SELECT auth.users.email INTO v_admin_email
  FROM auth.users
  JOIN user_profiles ON auth.users.id = user_profiles.id
  WHERE auth.users.id = auth.uid()
    AND user_profiles.team_role = 'supa_admin';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only supa_admin can adjust token cap';
  END IF;

  SELECT total_token_cap INTO v_old_cap
  FROM organization_token_balances
  WHERE organization_name = p_organization_name;

  UPDATE organization_token_balances
  SET total_token_cap = p_new_cap
  WHERE organization_name = p_organization_name;

  INSERT INTO token_cap_audit_log (
    organization_name,
    action_type,
    admin_user_id,
    admin_email,
    old_value,
    new_value,
    details
  )
  VALUES (
    p_organization_name,
    'cap_adjustment',
    auth.uid(),
    v_admin_email,
    v_old_cap,
    p_new_cap,
    jsonb_build_object(
      'old_cap', v_old_cap,
      'new_cap', p_new_cap
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION adjust_token_cap(text, bigint)
  SET search_path = public, pg_temp;
