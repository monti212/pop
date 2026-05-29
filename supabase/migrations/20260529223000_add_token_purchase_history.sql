/*
  # Add Token Purchase History

  - Creates token_purchase_history table for mirrored admin/supaadmin visibility
  - Supa admin can insert/update/delete purchase records
  - Admin and supa admin can read purchase history
*/

CREATE TABLE IF NOT EXISTS public.token_purchase_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL REFERENCES public.organization_token_balances(organization_name) ON DELETE CASCADE,
  purchase_date date NOT NULL,
  tokens_purchased integer NOT NULL CHECK (tokens_purchased > 0),
  amount_paid numeric(14,2) NOT NULL CHECK (amount_paid >= 0),
  currency text NOT NULL DEFAULT 'USD',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS token_purchase_history_org_date_idx
  ON public.token_purchase_history(organization_name, purchase_date DESC, created_at DESC);

ALTER TABLE public.token_purchase_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view token purchase history" ON public.token_purchase_history;
CREATE POLICY "Admins can view token purchase history"
  ON public.token_purchase_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.team_role IN ('optimus_prime', 'prime', 'admin', 'supa_admin')
    )
  );

DROP POLICY IF EXISTS "Supa admin can manage token purchase history" ON public.token_purchase_history;
CREATE POLICY "Supa admin can manage token purchase history"
  ON public.token_purchase_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.team_role = 'supa_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.team_role = 'supa_admin'
    )
  );

DROP TRIGGER IF EXISTS update_token_purchase_history_updated_at ON public.token_purchase_history;
CREATE TRIGGER update_token_purchase_history_updated_at
  BEFORE UPDATE ON public.token_purchase_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.token_purchase_history IS 'Purchase history for token buys; mirrored read-only on admin and editable on supaadmin.';
COMMENT ON COLUMN public.token_purchase_history.tokens_purchased IS 'Number of tokens purchased in this transaction.';
COMMENT ON COLUMN public.token_purchase_history.amount_paid IS 'Monetary amount paid for purchased tokens.';
