/*
  # Credit back the 2026-07-06 metering anomaly (1,370,894 tokens, one request)

  token_usage_metrics row 92f715ff-1e25-452b-969c-a29fd8c3799f charged
  kwamegloria1991@gmail.com 1,370,894 tokens for a SINGLE chat request on the
  legacy metering path. Evidence this is a metering defect, not usage:

    - her maximum across all 34 other requests (Jan-Jun) is 3,334 tokens;
      this row is 411x that ceiling and 93% of her lifetime total
    - the org served 4 requests that day; the other three total 11,264 tokens
    - no human chat exchange produces ~1.37M tokens in one turn; the legacy
      path's estimate fallback (estimateTokensFromText over a runaway payload)
      is the suspected source, part of the metering defect family fixed in
      939f957

  The full row amount is credited (the ~3k a legitimate request would have
  cost is waived in the customer's favour - simpler to audit than a partial).

  Adjusted:
    - organization_token_balances.used_text_total_ytd  -1,370,894
      (monthly/daily counters untouched: they reset after Jul 6)
    - user_token_usage (her row): ytd -1,370,894; this-month and today zeroed
      (both counters consist entirely of this anomaly - the v1 recorder wrote
      them on Jul 6 and she has not been active since)
    - organization_token_usage day row 2026-07-06      -1,370,894
      (so the usage-over-time chart no longer shows a phantom spike)

  NOT touched: the token_usage_metrics row itself - it is the evidence and the
  analytic tables must keep reflecting what the meter actually recorded.

  Idempotent: keyed on a token_cap_audit_log entry naming the ledger row.
  Displayed effect via get_token_metrics: tokens_remaining rises by exactly
  1,370,894 (4,836,410 -> 6,207,304 at time of writing).
*/

DO $$
DECLARE
  v_row_id constant uuid := '92f715ff-1e25-452b-969c-a29fd8c3799f';
  v_amount constant bigint := 1370894;
  v_user_id uuid;
  v_old_ytd bigint;
BEGIN
  -- Idempotency: never credit the same ledger row twice.
  IF EXISTS (
    SELECT 1 FROM token_cap_audit_log
    WHERE action_type = 'anomaly_credit'
      AND details->>'ledger_row_id' = v_row_id::text
  ) THEN
    RAISE NOTICE 'Jul-6 anomaly already credited; skipping.';
    RETURN;
  END IF;

  SELECT user_id INTO v_user_id FROM token_usage_metrics WHERE id = v_row_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Anomaly ledger row % not found; refusing to credit blind', v_row_id;
  END IF;

  SELECT used_text_total_ytd INTO v_old_ytd
  FROM organization_token_balances
  WHERE organization_name = 'Pencils of Promise';

  UPDATE organization_token_balances
  SET used_text_total_ytd = GREATEST(0, used_text_total_ytd - v_amount),
      updated_at = now()
  WHERE organization_name = 'Pencils of Promise';

  UPDATE user_token_usage
  SET used_text_total_ytd  = GREATEST(0, used_text_total_ytd - v_amount),
      -- Both short-horizon counters consist entirely of the anomalous request
      -- (written 2026-07-06, no activity since), so they zero rather than net.
      used_text_this_month = 0,
      used_text_today      = 0,
      updated_at           = now()
  WHERE user_id = v_user_id;

  UPDATE organization_token_usage
  SET tokens_used      = GREATEST(0, tokens_used - v_amount),
      text_tokens_used = GREATEST(0, text_tokens_used - v_amount),
      updated_at       = now()
  WHERE organization_name = 'Pencils of Promise'
    AND usage_date = DATE '2026-07-06';

  INSERT INTO token_cap_audit_log
    (organization_name, action_type, admin_user_id, admin_email, old_value, new_value, details)
  VALUES (
    'Pencils of Promise',
    'anomaly_credit',
    NULL,
    'migration:20260804160000',
    v_old_ytd,
    GREATEST(0, v_old_ytd - v_amount),
    jsonb_build_object(
      'ledger_row_id', v_row_id,
      'credited_tokens', v_amount,
      'affected_user', v_user_id,
      'reason', 'Single legacy-path request metered at 1,370,894 tokens on 2026-07-06; user ceiling across all other requests is 3,334. Metering defect, not usage. Ledger row retained as evidence.'
    )
  );
END $$;
