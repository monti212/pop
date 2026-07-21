# Superadmin Financial Command Center — Design (Sub-project A)

**Status:** approved (brainstorm), implementing.
**Access:** `supa_admin` only, server-enforced (RPCs raise if caller isn't supa_admin), page under `SupaAdminRoute`. Today that's `monti@orionx.xyz`, `gaone@orionx.xyz`, `monti@uhuruai.co`.
**Scope:** PoP (single org today) but org-parameterized. Abuse radar + teacher leaderboard/awards = sub-project B (NOT here). G-Token customer rebrand = sub-project C.

## Economics model
- **Revenue / price:** $100 per 1M **credits** (already in `pricing_config.price_per_1m_credit`). Credits = raw_tokens × `credit_weight` (U4.0 = 1.0, U4.3 = 2.5).
- **COGS (per model, per 1M RAW tokens), input/output split** — the ledger only stores total raw tokens, so we apply a **blended assumption**:
  - U4.0: input $2.00 / output $8.00
  - U4.3: input $2.10 / output $6.60
  - legacy/u2.0: assumption = U4.0's numbers (real old-model cost unknown; flagged)
  - blend: `input_share` (default 0.30) → blended = `input_share·input + (1−input_share)·output` ⇒ **U4.0 $6.20/1M**, **U4.3 $5.25/1M**
- **Revenue framing:** Cash + Imputed side by side.
  - Cash collected = Σ `token_purchase_history.amount_paid`
  - Consumption value (imputed) = credits × $100/1M
  - Value given away = imputed − cash (comp'd usage)
  - Gross margin = consumption value − COGS (~94%)

## Data model
1. `pricing_config` += `cogs_input_per_1m`, `cogs_output_per_1m` (seed per above).
2. `financial_config` — singleton (`input_token_share` default 0.300, `currency`), supa_admin RLS. The tunable blend knob.
3. `token_purchase_history` — insert cash history: **2025-11-05** 10M @ $0 (complimentary), **2026-06-01** 10M @ $1000 (paid, $100/1M).

## RPCs (all `SECURITY DEFINER`, raise unless caller is supa_admin)
- `get_financial_overview(p_org, p_since)` → per-model: requests, raw_tokens, credits, blended_cogs_per_1m, cogs_usd, consumption_value_usd, gross_margin_usd, margin_pct.
- `get_financial_projection(p_org, p_window_days=30)` → burn (credits/day, requests/day, active_users/day), run-rate monthly (value/cogs/margin), runway (credits_remaining, days_to_exhaustion, usd_to_reup).
- `get_financial_trend(p_org, p_days, p_bucket)` → date-bucketed credits/raw/value/cogs/margin.
- `get_cash_summary(p_org)` → purchase ledger rows (date, tokens, amount, currency, notes, is_complimentary) for the cash panel + totals.

## Page: `/supa-admin/finance` (silk "board of notes" aesthetic)
- **A. Hero cards:** Gross Margin %, Consumption Value, Cash Collected, Real COGS, Net Margin $ (period-scoped).
- **B. Per-model cost tracker** table (U4.0 / U4.3 / Legacy).
- **C. Revenue — Cash vs Imputed** (+ value given away, purchase timeline).
- **D. Projections & runway** (window selector, default 30d).
- **E. Trend** (value/COGS/margin over time) + usage sparkline.
- **F. Controls:** period + burn-window selector, blend-ratio editor (writes `financial_config`), CSV export.
- Reuses existing `charts` bundle + Brand palette (navy/teal/orange/sand). No business math in the page — all from RPCs.

## Non-goals (this sub-project)
Abuse radar, teacher leaderboard, awards (→ B). Customer-facing G-Token rename (→ C). Multi-tenant UI. Enabling enforcement.
