-- Per-model input/output COGS (per 1M raw tokens). Ledger stores only total raw, so a blended
-- assumption (financial_config.input_token_share) turns these into a single blended $/1M-raw.
ALTER TABLE public.pricing_config
  ADD COLUMN IF NOT EXISTS cogs_input_per_1m  numeric(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cogs_output_per_1m numeric(12,4) NOT NULL DEFAULT 0;

UPDATE public.pricing_config SET cogs_input_per_1m = 2.0000, cogs_output_per_1m = 8.0000 WHERE model_key = 'u4.0';
UPDATE public.pricing_config SET cogs_input_per_1m = 2.1000, cogs_output_per_1m = 6.6000 WHERE model_key = 'u4.3';
-- legacy: real old-model cost unknown; assume U4.0 economics (flagged assumption)
UPDATE public.pricing_config SET cogs_input_per_1m = 2.0000, cogs_output_per_1m = 8.0000 WHERE model_key = 'u2.0';

-- Singleton knob for the input/output blend ratio (default 30% input / 70% output).
CREATE TABLE IF NOT EXISTS public.financial_config (
  id                boolean PRIMARY KEY DEFAULT true CHECK (id),
  input_token_share numeric(4,3) NOT NULL DEFAULT 0.300 CHECK (input_token_share >= 0 AND input_token_share <= 1),
  currency          text NOT NULL DEFAULT 'USD',
  updated_at        timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.financial_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.financial_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS financial_config_supa_admin_read ON public.financial_config;
CREATE POLICY financial_config_supa_admin_read ON public.financial_config
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.team_role = 'supa_admin'));

-- Cash history (idempotent): Nov 5 2025 complimentary 10M; Jun 1 2026 paid $1000 for 10M ($100/1M).
INSERT INTO public.token_purchase_history (organization_name, purchase_date, tokens_purchased, amount_paid, currency, notes)
SELECT 'Pencils of Promise', DATE '2025-11-05', 10000000, 0, 'USD', 'Complimentary 10M credits (launch grant)'
WHERE NOT EXISTS (
  SELECT 1 FROM public.token_purchase_history
  WHERE organization_name = 'Pencils of Promise' AND purchase_date = DATE '2025-11-05'
);
INSERT INTO public.token_purchase_history (organization_name, purchase_date, tokens_purchased, amount_paid, currency, notes)
SELECT 'Pencils of Promise', DATE '2026-06-01', 10000000, 1000, 'USD', 'Paid pack - $1000 for 10M credits ($100/1M)'
WHERE NOT EXISTS (
  SELECT 1 FROM public.token_purchase_history
  WHERE organization_name = 'Pencils of Promise' AND purchase_date = DATE '2026-06-01'
);
