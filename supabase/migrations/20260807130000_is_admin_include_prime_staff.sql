/*
  # Treat 'prime' as staff in is_admin()

  ## Decision
  'prime' (and legacy 'optimus_prime') are staff roles, not customer tiers, and are
  granted the full admin surface — including full manage rights (SELECT/INSERT/
  UPDATE/DELETE) on admin_knowledge_documents.

  This keeps RLS in agreement with AdminRoute.tsx, which renders the admin pages for
  the same four roles. When the two disagree, pages render with silent zeros: an RLS
  denial returns an empty set rather than an error, which is why the knowledge base
  appeared to contain 0 of its 185 documents for prime users.

  ## Scope — deliberately wide
  is_admin() gates 30 policies across 25 tables. Adding 'prime' therefore grants
  these accounts read access well beyond the knowledge base, including:

    conversations, messages, conversation_summaries  -> all users' private chats
    students, attendance_records, classes            -> student records
    user_documents, class_documents                  -> user-uploaded files
    token_refills, usage_events, organization_token_balances, model_usage_logs

  This breadth was reviewed and accepted: prime accounts are internal staff. Should
  that ever stop being true, narrow this list first — 404 of 414 accounts are 'free'
  and rely on those policies for privacy.

  ## Security
  Still reads app_metadata ONLY (service-role/trigger managed). user_metadata is
  user-writable and must never be trusted here — see
  20260807120000_harden_admin_checks_app_metadata_only.sql.

  is_supa_admin() is intentionally NOT widened; it remains 'supa_admin' only.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'team_role', '')
         IN ('supa_admin', 'admin', 'prime', 'optimus_prime');
$$;
