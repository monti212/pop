/*
  # Add storage_path column to admin_knowledge_documents
  
  1. Changes
    - Add storage_path column to store file location in Supabase Storage
    - Allows handling of binary files (PDF, DOCX) without Unicode issues
  
  2. Notes
    - Files will be uploaded to storage first
    - Backend will read from storage and extract text
*/

ALTER TABLE admin_knowledge_documents 
ADD COLUMN IF NOT EXISTS storage_path TEXT;