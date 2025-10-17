/*
  # Add metadata column to api_usage table

  1. Schema Update
    - Add `metadata` column to `api_usage` table
    - Type: jsonb for storing structured data
    - Default: empty JSON object
    - Nullable: true to allow existing records

  2. Purpose
    - Store additional request metadata like verbosity settings
    - Enable richer analytics and debugging capabilities
    - Support future expansion of usage tracking
*/

-- Add metadata column to api_usage table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_usage' 
    AND column_name = 'metadata' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.api_usage 
    ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
    
    -- Add a comment to describe the column
    COMMENT ON COLUMN public.api_usage.metadata IS 'Additional request metadata such as verbosity settings, feature flags, etc.';
  END IF;
END $$;