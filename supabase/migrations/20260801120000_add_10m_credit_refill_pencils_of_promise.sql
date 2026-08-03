/*
  # Add a 10,000,000 credit refill for Pencils of Promise

  The org is over its 10,250,000 plan cap, so every "remaining balance" reads zero
  (clamped) or negative (where a dashboard subtracted by hand). This adds a
  10,000,000 credit top-up.

  ## Why a refill row rather than raising total_token_cap

  `total_token_cap` is the contracted plan size. Raising it would restate the plan
  and permanently lose the distinction between "what they bought" and "what we
  topped them up with". A refill is the mechanism the schema already models: it is
  time-boxed, audited, and `calculate_refill_balance()` adds it to the available
  balance for exactly as long as it is unexpired.

  ## Why this INSERTs directly instead of calling add_token_refill()

  `add_token_refill()` resolves the acting admin via `auth.uid()` and raises
  'Only supa_admin can add token refills' when that is NULL. A migration runs as
  the postgres role with no JWT, so calling the RPC here would always fail. The
  INSERT below mirrors exactly what that function does, including the audit row,
  with `added_by_user_id` left NULL to record that this was applied by migration
  rather than by a person.

  ## Counters are deliberately NOT reset

  `used_text_total_ytd` is left intact. The refill alone makes the balance
  positive, so zeroing consumption is unnecessary — and the meter under-recorded
  between 2026-07-20 and the fix in this same branch, so real usage is already
  understated. Zeroing it would destroy the only record of what was consumed.

  Idempotent: re-running is a no-op, matched on the marker in `notes`.
*/

DO $$
DECLARE
  v_org      text := 'Pencils of Promise';
  v_amount   integer := 10000000;
  v_marker   text := '[migration:20260801120000]';
  v_expires  timestamptz := (date_trunc('year', now()) + interval '2 years');
  v_existing integer;
BEGIN
  -- The FK on token_refills requires the balance row to exist.
  IF NOT EXISTS (SELECT 1 FROM organization_token_balances WHERE organization_name = v_org) THEN
    RAISE EXCEPTION 'No organization_token_balances row for %; refusing to add a refill', v_org;
  END IF;

  SELECT COUNT(*) INTO v_existing
  FROM token_refills
  WHERE organization_name = v_org
    AND notes LIKE '%' || v_marker || '%';

  IF v_existing > 0 THEN
    RAISE NOTICE 'Refill % already applied for %; skipping.', v_marker, v_org;
    RETURN;
  END IF;

  INSERT INTO token_refills (
    organization_name, amount, consumed, expires_at, added_by_user_id, notes
  )
  VALUES (
    v_org,
    v_amount,
    0,
    v_expires,
    NULL,
    format('10M credit top-up applied by migration while the org was over plan cap. %s', v_marker)
  );

  INSERT INTO token_cap_audit_log (
    organization_name, action_type, admin_user_id, admin_email, old_value, new_value, details
  )
  VALUES (
    v_org,
    'refill_added',
    NULL,
    'migration@greyed.org',
    NULL,
    v_amount,
    jsonb_build_object(
      'source', 'migration',
      'migration', '20260801120000',
      'expires_at', v_expires,
      'counters_reset', false
    )
  );

  RAISE NOTICE 'Added % credit refill for % (expires %).', v_amount, v_org, v_expires;
END $$;
