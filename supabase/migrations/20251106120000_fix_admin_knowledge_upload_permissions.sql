/*
  # Fix Admin Knowledge Base Upload Permissions
  
  ## Purpose
  Allow supa_admin, admin, prime, and optimus_prime (legacy) to upload files to the knowledge base.
  This fixes the RLS policy error: "new row violates row-level security policy for table admin_knowledge_documents"
  
  ## Changes
  1. Drop overly restrictive or permissive policies on admin_knowledge_documents
  2. Create new policies that allow supa_admin, admin, prime, and optimus_prime to:
     - SELECT: View all knowledge documents
     - INSERT: Upload new knowledge documents
     - UPDATE: Modify existing documents (supa_admin and admin only)
     - DELETE: Remove documents (supa_admin and admin only)
  
  ## Access Model
  - **supa_admin**: Full CRUD access to knowledge base
  - **admin**: Full CRUD access to knowledge base
  - **prime**: Can view and upload documents (no update/delete)
  - **optimus_prime**: Legacy role with full access
  - **free**: No access to admin knowledge base
*/

-- ============================================================================
-- 1. DROP EXISTING POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "All authenticated users can view knowledge documents" ON admin_knowledge_documents;
DROP POLICY IF EXISTS "All authenticated users can create knowledge documents" ON admin_knowledge_documents;
DROP POLICY IF EXISTS "All authenticated users can update knowledge documents" ON admin_knowledge_documents;
DROP POLICY IF EXISTS "All authenticated users can delete knowledge documents" ON admin_knowledge_documents;

DROP POLICY IF EXISTS "Only optimus_prime and prime can view knowledge documents" ON admin_knowledge_documents;
DROP POLICY IF EXISTS "Only optimus_prime can create knowledge documents" ON admin_knowledge_documents;
DROP POLICY IF EXISTS "Only optimus_prime can update knowledge documents" ON admin_knowledge_documents;
DROP POLICY IF EXISTS "Only optimus_prime can delete knowledge documents" ON admin_knowledge_documents;

-- ============================================================================
-- 2. CREATE NEW ROLE-BASED POLICIES
-- ============================================================================

-- SELECT: supa_admin, admin, prime, and optimus_prime can view all documents
CREATE POLICY "Admins and prime can view knowledge documents"
  ON admin_knowledge_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime', 'optimus_prime')
    )
  );

-- INSERT: supa_admin, admin, prime, and optimus_prime can upload documents
CREATE POLICY "Admins and prime can upload knowledge documents"
  ON admin_knowledge_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime', 'optimus_prime')
    )
  );

-- UPDATE: Only supa_admin, admin, and optimus_prime can update documents
-- Prime users can upload but not modify existing documents
CREATE POLICY "Admins can update knowledge documents"
  ON admin_knowledge_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'optimus_prime')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'optimus_prime')
    )
  );

-- DELETE: Only supa_admin, admin, and optimus_prime can delete documents
-- Prime users cannot delete documents
CREATE POLICY "Admins can delete knowledge documents"
  ON admin_knowledge_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'optimus_prime')
    )
  );

-- ============================================================================
-- 3. UPDATE RELATED TABLE POLICIES
-- ============================================================================

-- Update knowledge_base_summaries policies
DROP POLICY IF EXISTS "All authenticated users can view summaries" ON knowledge_base_summaries;
DROP POLICY IF EXISTS "All authenticated users can create summaries" ON knowledge_base_summaries;
DROP POLICY IF EXISTS "All authenticated users can update summaries" ON knowledge_base_summaries;
DROP POLICY IF EXISTS "All authenticated users can delete summaries" ON knowledge_base_summaries;

DROP POLICY IF EXISTS "Admins can view summaries" ON knowledge_base_summaries;
DROP POLICY IF EXISTS "Admins can update summaries" ON knowledge_base_summaries;
DROP POLICY IF EXISTS "Admins can delete summaries" ON knowledge_base_summaries;

CREATE POLICY "Admins and prime can view summaries"
  ON knowledge_base_summaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime', 'optimus_prime')
    )
  );

-- System can create summaries (needed for Edge Function processing)
CREATE POLICY "System can create summaries"
  ON knowledge_base_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update summaries"
  ON knowledge_base_summaries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'optimus_prime')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'optimus_prime')
    )
  );

CREATE POLICY "Admins can delete summaries"
  ON knowledge_base_summaries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'optimus_prime')
    )
  );

-- Update knowledge_base_audit_log policies
DROP POLICY IF EXISTS "All authenticated users can view audit logs" ON knowledge_base_audit_log;
DROP POLICY IF EXISTS "All authenticated users can create audit logs" ON knowledge_base_audit_log;

DROP POLICY IF EXISTS "Admins can view audit logs" ON knowledge_base_audit_log;

CREATE POLICY "Admins and prime can view audit logs"
  ON knowledge_base_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('supa_admin', 'admin', 'prime', 'optimus_prime')
    )
  );

-- System can create audit logs (needed for tracking)
CREATE POLICY "System can create audit logs"
  ON knowledge_base_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 4. ADD HELPFUL COMMENTS
-- ============================================================================

COMMENT ON POLICY "Admins and prime can view knowledge documents" ON admin_knowledge_documents IS 
  'Allows supa_admin, admin, prime, and optimus_prime (legacy) to view all knowledge base documents';

COMMENT ON POLICY "Admins and prime can upload knowledge documents" ON admin_knowledge_documents IS 
  'Allows supa_admin, admin, prime, and optimus_prime to upload new knowledge base documents';

COMMENT ON POLICY "Admins can update knowledge documents" ON admin_knowledge_documents IS 
  'Allows only supa_admin, admin, and optimus_prime to modify existing documents. Prime users can upload but not edit.';

COMMENT ON POLICY "Admins can delete knowledge documents" ON admin_knowledge_documents IS 
  'Allows only supa_admin, admin, and optimus_prime to delete documents. Prime users cannot delete.';
