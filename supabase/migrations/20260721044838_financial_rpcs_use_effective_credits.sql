-- Recorded for history. The as-applied version of this migration replaced the usage RPCs to use
-- "effective credits" (credits_charged when set, else raw_tokens * credit_weight) so legacy
-- pre-metering rows are valued correctly. Those final definitions have been consolidated into
-- 20260721044647_financial_command_center_rpcs.sql, so this migration is intentionally a no-op on
-- a clean replay. No schema change here.
SELECT 1;
