/*
  # Fix Database Performance - Part 2: RLS Policy Optimization
  
  Optimizes all RLS policies to use SELECT subqueries for auth functions.
  This prevents re-evaluation on each row for better performance at scale.
  
  ## Changes
  - Updates all policies to use (SELECT auth.uid()) pattern
  - Improves query performance for large datasets
  - Maintains same security posture with better performance
  
  Note: user_profiles table uses 'id' column as the user identifier
*/

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admin can manage all payments" ON public.payments;
CREATE POLICY "Admin can manage all payments"
  ON public.payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- =====================================================
-- USERS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
CREATE POLICY "Users can insert own data"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- =====================================================
-- API_KEYS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
CREATE POLICY "Users can view their own API keys"
  ON public.api_keys
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own API keys" ON public.api_keys;
CREATE POLICY "Users can insert their own API keys"
  ON public.api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys;
CREATE POLICY "Users can update their own API keys"
  ON public.api_keys
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;
CREATE POLICY "Users can delete their own API keys"
  ON public.api_keys
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all API keys" ON public.api_keys;
CREATE POLICY "Admins can manage all API keys"
  ON public.api_keys
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- =====================================================
-- USER_PROFILES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admin full access" ON public.user_profiles;
CREATE POLICY "Admin full access"
  ON public.user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
      AND up.team_role IN ('supa_admin', 'admin')
    )
  );

-- =====================================================
-- API_USAGE TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own API usage" ON public.api_usage;
CREATE POLICY "Users can view their own API usage"
  ON public.api_usage
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all API usage records" ON public.api_usage;
CREATE POLICY "Admins can manage all API usage records"
  ON public.api_usage
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- =====================================================
-- CONVERSATIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
CREATE POLICY "Users can view their own conversations"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.conversations;
CREATE POLICY "Users can insert their own conversations"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
CREATE POLICY "Users can update their own conversations"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;
CREATE POLICY "Users can delete their own conversations"
  ON public.conversations
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- MESSAGES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.messages;
CREATE POLICY "Users can view messages from their conversations"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert messages into their conversations" ON public.messages;
CREATE POLICY "Users can insert messages into their conversations"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- PRIVACY_PREFERENCES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own privacy preferences" ON public.privacy_preferences;
CREATE POLICY "Users can view their own privacy preferences"
  ON public.privacy_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own privacy preferences" ON public.privacy_preferences;
CREATE POLICY "Users can update their own privacy preferences"
  ON public.privacy_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own privacy preferences" ON public.privacy_preferences;
CREATE POLICY "Users can insert their own privacy preferences"
  ON public.privacy_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all privacy preferences" ON public.privacy_preferences;
CREATE POLICY "Admins can view all privacy preferences"
  ON public.privacy_preferences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );

-- =====================================================
-- EMPLOYEES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Employees can view their own data" ON public.employees;
CREATE POLICY "Employees can view their own data"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Employees can update their own data" ON public.employees;
CREATE POLICY "Employees can update their own data"
  ON public.employees
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can do everything with employees" ON public.employees;
CREATE POLICY "Admins can do everything with employees"
  ON public.employees
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.team_role IN ('supa_admin', 'admin')
    )
  );