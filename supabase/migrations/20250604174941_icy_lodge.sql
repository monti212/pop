/*
  # Authentication and user management

  1. New Tables
    - `user_profiles` - Extends auth.users with additional profile info
      - `id` (uuid, references auth.users(id), primary key)
      - `display_name` (text)
      - `subscription_tier` (text, default 'freemium')
      - `daily_message_count` (int, default 0)
      - `created_at` (timestamp)
      - `last_active_at` (timestamp)
  
  2. New Tables
    - `conversations` - Stores chat conversations
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users(id))
      - `title` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  3. New Tables
    - `messages` - Stores individual messages within conversations
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, references conversations(id))
      - `role` (text, either 'user', 'assistant', or 'system')
      - `content` (text)
      - `created_at` (timestamp)

  4. Security
    - Enable RLS on all tables
    - Add policies for users to access their own data
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  subscription_tier TEXT DEFAULT 'freemium',
  daily_message_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reset daily message count function (to be used by a cron job)
CREATE OR REPLACE FUNCTION reset_daily_message_count()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles SET daily_message_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to increment a counter
CREATE OR REPLACE FUNCTION increment(row_id UUID, increment_amount INT)
RETURNS INT AS $$
DECLARE
  new_count INT;
BEGIN
  UPDATE user_profiles 
  SET daily_message_count = daily_message_count + increment_amount
  WHERE id = row_id
  RETURNING daily_message_count INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policies for conversations
CREATE POLICY "Users can view their own conversations"
  ON conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON conversations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for messages
CREATE POLICY "Users can view messages from their conversations"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages into their conversations"
  ON messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Create a trigger to create user profile on sign up
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();