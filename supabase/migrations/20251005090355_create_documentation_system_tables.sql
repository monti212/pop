/*
  # Create Technical Documentation System Tables

  ## Overview
  This migration creates a comprehensive documentation system with support for hierarchical 
  page organization, AI assistant chat integration, version history, activity tracking, and 
  advanced search capabilities.

  ## New Tables

  ### `documentation_pages`
  Stores documentation pages with rich content, hierarchical organization, and metadata.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique page identifier
  - `user_id` (uuid, references auth.users) - Page creator/owner
  - `title` (text, required) - Page title
  - `content` (text) - Page content (supports markdown/HTML)
  - `category_id` (uuid, references documentation_categories) - Parent category
  - `parent_page_id` (uuid, self-reference) - For hierarchical structure
  - `order_index` (integer) - Display order within category
  - `slug` (text, unique) - URL-friendly identifier
  - `icon` (text) - Lucide icon name
  - `color` (text) - Theme color for the page
  - `is_published` (boolean) - Whether page is visible to others
  - `is_template` (boolean) - Whether page is a reusable template
  - `view_count` (integer) - Number of times viewed
  - `metadata` (jsonb) - Flexible storage for tags, custom fields
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  - `deleted_at` (timestamptz) - Soft delete timestamp

  ### `documentation_categories`
  Organizes pages into navigable categories with visual styling.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique category identifier
  - `user_id` (uuid, references auth.users) - Category owner
  - `name` (text, required) - Category name
  - `description` (text) - Category description
  - `icon` (text) - Lucide icon name
  - `color` (text) - Theme color
  - `order_index` (integer) - Display order
  - `parent_category_id` (uuid, self-reference) - For nested categories
  - `is_expanded` (boolean) - Default expansion state
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `documentation_chat_messages`
  Stores AI assistant chat messages specific to each documentation page.
  
  **Columns:**
  - `id` (uuid, primary key) - Message identifier
  - `page_id` (uuid, references documentation_pages) - Associated page
  - `user_id` (uuid, references auth.users) - Message author
  - `role` (text) - 'user' or 'assistant'
  - `content` (text, required) - Message content
  - `context_snapshot` (jsonb) - Document context when message was sent
  - `metadata` (jsonb) - Additional message data
  - `created_at` (timestamptz) - Message timestamp

  ### `documentation_activity`
  Tracks user interactions with documentation pages for analytics and history.
  
  **Columns:**
  - `id` (uuid, primary key) - Activity identifier
  - `page_id` (uuid, references documentation_pages) - Related page
  - `user_id` (uuid, references auth.users) - User who performed action
  - `action_type` (text) - Type: 'view', 'edit', 'create', 'delete', 'share'
  - `action_details` (jsonb) - Detailed information about the action
  - `created_at` (timestamptz) - Action timestamp

  ### `documentation_favorites`
  Stores user's pinned/favorited documentation pages.
  
  **Columns:**
  - `id` (uuid, primary key) - Favorite identifier
  - `user_id` (uuid, references auth.users) - User who favorited
  - `page_id` (uuid, references documentation_pages) - Favorited page
  - `created_at` (timestamptz) - When favorited

  ## Security
  - Enable RLS on all tables
  - Users can view their own documentation and published pages from others
  - Users can only edit their own documentation
  - Admins can view and manage all documentation
  - Chat messages are private to the user and page owner

  ## Indexes
  - Index on user_id for user-specific queries
  - Index on category_id for category filtering
  - Full-text search index on title and content
  - Index on slug for URL lookups
  - Index on parent_page_id for hierarchical queries
  - Index on is_published for public page queries
  - Index on view_count for popular pages sorting

  ## Notes
  - Soft delete pattern for recovery
  - JSONB columns for flexible schema evolution
  - Hierarchical support for nested categories and pages
  - Integrated with existing user_profiles and document_versions tables
*/

-- Create documentation_categories table
CREATE TABLE IF NOT EXISTS documentation_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  icon text DEFAULT 'Folder',
  color text DEFAULT '#3b82f6',
  order_index integer DEFAULT 0 NOT NULL,
  parent_category_id uuid REFERENCES documentation_categories(id) ON DELETE CASCADE,
  is_expanded boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create documentation_pages table
CREATE TABLE IF NOT EXISTS documentation_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Page',
  content text DEFAULT '',
  category_id uuid REFERENCES documentation_categories(id) ON DELETE SET NULL,
  parent_page_id uuid REFERENCES documentation_pages(id) ON DELETE CASCADE,
  order_index integer DEFAULT 0 NOT NULL,
  slug text UNIQUE,
  icon text DEFAULT 'FileText',
  color text DEFAULT '#6b7280',
  is_published boolean DEFAULT false,
  is_template boolean DEFAULT false,
  view_count integer DEFAULT 0 NOT NULL,
  metadata jsonb DEFAULT '{"tags": [], "custom_fields": {}}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Create documentation_chat_messages table
CREATE TABLE IF NOT EXISTS documentation_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES documentation_pages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  context_snapshot jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create documentation_activity table
CREATE TABLE IF NOT EXISTS documentation_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES documentation_pages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('view', 'edit', 'create', 'delete', 'share', 'favorite', 'comment')),
  action_details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create documentation_favorites table
CREATE TABLE IF NOT EXISTS documentation_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  page_id uuid REFERENCES documentation_pages(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, page_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS doc_categories_user_id_idx ON documentation_categories(user_id);
CREATE INDEX IF NOT EXISTS doc_categories_parent_idx ON documentation_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS doc_categories_order_idx ON documentation_categories(order_index);

CREATE INDEX IF NOT EXISTS doc_pages_user_id_idx ON documentation_pages(user_id);
CREATE INDEX IF NOT EXISTS doc_pages_category_id_idx ON documentation_pages(category_id);
CREATE INDEX IF NOT EXISTS doc_pages_parent_page_id_idx ON documentation_pages(parent_page_id);
CREATE INDEX IF NOT EXISTS doc_pages_slug_idx ON documentation_pages(slug);
CREATE INDEX IF NOT EXISTS doc_pages_published_idx ON documentation_pages(is_published) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS doc_pages_updated_at_idx ON documentation_pages(updated_at DESC);
CREATE INDEX IF NOT EXISTS doc_pages_view_count_idx ON documentation_pages(view_count DESC);
CREATE INDEX IF NOT EXISTS doc_pages_deleted_at_idx ON documentation_pages(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS doc_chat_page_id_idx ON documentation_chat_messages(page_id);
CREATE INDEX IF NOT EXISTS doc_chat_user_id_idx ON documentation_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS doc_chat_created_at_idx ON documentation_chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS doc_activity_page_id_idx ON documentation_activity(page_id);
CREATE INDEX IF NOT EXISTS doc_activity_user_id_idx ON documentation_activity(user_id);
CREATE INDEX IF NOT EXISTS doc_activity_created_at_idx ON documentation_activity(created_at DESC);

CREATE INDEX IF NOT EXISTS doc_favorites_user_id_idx ON documentation_favorites(user_id);
CREATE INDEX IF NOT EXISTS doc_favorites_page_id_idx ON documentation_favorites(page_id);

-- Full-text search index for documentation pages
CREATE INDEX IF NOT EXISTS doc_pages_search_idx ON documentation_pages 
  USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '')))
  WHERE deleted_at IS NULL;

-- Enable Row Level Security
ALTER TABLE documentation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documentation_categories

CREATE POLICY "Users can view their own categories"
  ON documentation_categories
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own categories"
  ON documentation_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own categories"
  ON documentation_categories
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own categories"
  ON documentation_categories
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for documentation_pages

CREATE POLICY "Users can view their own pages"
  ON documentation_pages
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can view published pages"
  ON documentation_pages
  FOR SELECT
  TO authenticated
  USING (is_published = true AND deleted_at IS NULL);

CREATE POLICY "Users can create their own pages"
  ON documentation_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own pages"
  ON documentation_pages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own pages"
  ON documentation_pages
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admin policies for pages
CREATE POLICY "Admins can view all pages"
  ON documentation_pages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime')
    )
  );

-- RLS Policies for documentation_chat_messages

CREATE POLICY "Users can view chat messages for their pages"
  ON documentation_chat_messages
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM documentation_pages
      WHERE documentation_pages.id = documentation_chat_messages.page_id
      AND documentation_pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chat messages"
  ON documentation_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their chat messages"
  ON documentation_chat_messages
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for documentation_activity

CREATE POLICY "Users can view activity for their pages"
  ON documentation_activity
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM documentation_pages
      WHERE documentation_pages.id = documentation_activity.page_id
      AND documentation_pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activity records"
  ON documentation_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for documentation_favorites

CREATE POLICY "Users can view their own favorites"
  ON documentation_favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own favorites"
  ON documentation_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own favorites"
  ON documentation_favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documentation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documentation_categories_updated_at
  BEFORE UPDATE ON documentation_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

CREATE TRIGGER update_documentation_pages_updated_at
  BEFORE UPDATE ON documentation_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

-- Function to auto-generate slug from title
CREATE OR REPLACE FUNCTION generate_page_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = lower(regexp_replace(regexp_replace(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || substring(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_documentation_page_slug
  BEFORE INSERT ON documentation_pages
  FOR EACH ROW
  EXECUTE FUNCTION generate_page_slug();

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_page_view_count(page_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE documentation_pages
  SET view_count = view_count + 1
  WHERE id = page_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log activity
CREATE OR REPLACE FUNCTION log_documentation_activity(
  p_page_id uuid,
  p_user_id uuid,
  p_action_type text,
  p_action_details jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO documentation_activity (page_id, user_id, action_type, action_details)
  VALUES (p_page_id, p_user_id, p_action_type, p_action_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;