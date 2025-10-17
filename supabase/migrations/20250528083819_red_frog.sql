/*
  # Create waitlist table

  1. New Tables
    - `waitlist`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `waitlist` table
    - Add policy for authenticated users to insert data
*/

CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow public (unauthenticated) users to insert into waitlist
CREATE POLICY "Allow public inserts to waitlist"
  ON waitlist
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Only allow authenticated users to view waitlist entries
CREATE POLICY "Allow authenticated users to view waitlist"
  ON waitlist
  FOR SELECT
  TO authenticated
  USING (true);