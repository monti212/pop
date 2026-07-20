-- Customer price is $100 per 1M credits ($1 per 10,000 credits), not the $8 originally seeded
-- from the old bundle constant. COGS ($0.295/1M raw) is unchanged. Uniform across models — the
-- per-model differentiation lives in credit_weight (U4.3 charges 2.5x credits), not in price/credit.
UPDATE public.pricing_config SET price_per_1m_credit = 100.0000, updated_at = now();
ALTER TABLE public.pricing_config ALTER COLUMN price_per_1m_credit SET DEFAULT 100.0000;
