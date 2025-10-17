/*
# Create Focus Sets Tables

1. New Tables
   - `focus_sets`
     - `id` (uuid, primary key)
     - `user_id` (uuid, references auth.users)
     - `name` (text, required)
     - `description` (text, optional)
     - `created_at` (timestamp)
     - `updated_at` (timestamp)
   - `focus_set_files`
     - `focus_set_id` (uuid, references focus_sets)
     - `file_id` (uuid, references user_files)
     - `created_at` (timestamp)
     - Composite primary key on (focus_set_id, file_id)

2. Security
   - Enable RLS on both tables
   - Add policies for users to manage their own focus sets
   - Add policies for users to manage files in their focus sets

3. Performance
   - Add indexes on user_id for focus_sets
   - Add indexes on focus_set_id and file_id for focus_set_files
*/

-- Create the focus_sets table
CREATE TABLE IF NOT EXISTS public.focus_sets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS focus_sets_user_id_idx ON public.focus_sets USING btree (user_id);

-- Enable Row Level Security (RLS) for focus_sets
ALTER TABLE public.focus_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for focus_sets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'focus_sets' AND policyname = 'Users can view their own focus sets'
    ) THEN
        CREATE POLICY "Users can view their own focus sets"
        ON public.focus_sets FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'focus_sets' AND policyname = 'Users can create their own focus sets'
    ) THEN
        CREATE POLICY "Users can create their own focus sets"
        ON public.focus_sets FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'focus_sets' AND policyname = 'Users can update their own focus sets'
    ) THEN
        CREATE POLICY "Users can update their own focus sets"
        ON public.focus_sets FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'focus_sets' AND policyname = 'Users can delete their own focus sets'
    ) THEN
        CREATE POLICY "Users can delete their own focus sets"
        ON public.focus_sets FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create the focus_set_files join table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.focus_set_files (
    focus_set_id uuid NOT NULL REFERENCES public.focus_sets(id) ON DELETE CASCADE,
    file_id uuid NOT NULL REFERENCES public.user_files(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (focus_set_id, file_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS focus_set_files_focus_set_id_idx ON public.focus_set_files USING btree (focus_set_id);
CREATE INDEX IF NOT EXISTS focus_set_files_file_id_idx ON public.focus_set_files USING btree (file_id);

-- Enable Row Level Security (RLS) for focus_set_files
ALTER TABLE public.focus_set_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for focus_set_files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'focus_set_files' AND policyname = 'Users can view files in their focus sets'
    ) THEN
        CREATE POLICY "Users can view files in their focus sets"
        ON public.focus_set_files FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM public.focus_sets
                WHERE focus_sets.id = focus_set_files.focus_set_id AND focus_sets.user_id = auth.uid()
            )
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'focus_set_files' AND policyname = 'Users can add files to their focus sets'
    ) THEN
        CREATE POLICY "Users can add files to their focus sets"
        ON public.focus_set_files FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.focus_sets
                WHERE focus_sets.id = focus_set_files.focus_set_id AND focus_sets.user_id = auth.uid()
            )
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'focus_set_files' AND policyname = 'Users can remove files from their focus sets'
    ) THEN
        CREATE POLICY "Users can remove files from their focus sets"
        ON public.focus_set_files FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM public.focus_sets
                WHERE focus_sets.id = focus_set_files.focus_set_id AND focus_sets.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Create function to automatically update the updated_at column for focus_sets
CREATE OR REPLACE FUNCTION update_focus_sets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on focus_sets
DROP TRIGGER IF EXISTS update_focus_sets_updated_at_trigger ON public.focus_sets;
CREATE TRIGGER update_focus_sets_updated_at_trigger
    BEFORE UPDATE ON public.focus_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_focus_sets_updated_at();