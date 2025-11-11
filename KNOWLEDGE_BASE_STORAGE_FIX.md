# Knowledge Base Storage Path Fix

## Overview

Added `storage_path` column to `admin_knowledge_documents` table to enable proper handling of binary files (PDF, DOCX, images) without Unicode encoding issues.

## Migration Reference

- **Migration File**: `20251103104149_add_storage_path_to_knowledge_documents.sql`
- **Applied**: November 3, 2025
- **Purpose**: Fix binary file upload issues and improve file handling

---

## Problem Solved

### The Unicode Issue

Before this fix, when uploading binary files (PDF, DOCX) to the knowledge base:

1. **Direct Database Storage**: Files were being read and content stored directly in `raw_text` column
2. **Unicode Encoding Errors**: Binary content caused Unicode decode errors
3. **Large Payloads**: Entire file contents in database made queries slow
4. **No File Preservation**: Original files were not kept for download

### Error Example
```
UnicodeDecodeError: 'utf-8' codec can't decode byte 0x89 in position 0: invalid start byte
```

This occurred when trying to store binary PDF/DOCX content as text in PostgreSQL.

---

## Solution

### Two-Stage File Handling

**Stage 1: Upload to Storage**
```typescript
// Upload file to Supabase Storage first
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('admin-knowledge-files')
  .upload(`${userId}/${Date.now()}_${file.name}`, file);

const storagePath = uploadData.path; // Store this path
```

**Stage 2: Backend Processing**
```typescript
// Backend reads from storage and extracts text
const { data: fileData } = await supabase.storage
  .from('admin-knowledge-files')
  .download(storagePath);

// Extract text based on file type
const extractedText = await extractText(fileData, fileExtension);

// Store extracted text AND storage path
await supabase.from('admin_knowledge_documents').insert({
  title: fileName,
  file_type: fileExtension,
  raw_text: extractedText,      // Extracted text for search
  storage_path: storagePath,     // Original file location
  file_size: file.size
});
```

---

## Implementation Details

### Database Schema Change

**Migration SQL**:
```sql
ALTER TABLE admin_knowledge_documents
ADD COLUMN IF NOT EXISTS storage_path TEXT;
```

**Column Purpose**:
- **`storage_path`**: Stores the Supabase Storage path to the original uploaded file
- **Type**: TEXT (nullable for backwards compatibility)
- **Example Value**: `"a1b2c3d4-uuid/1699564800000_document.pdf"`

### Updated Table Structure

```sql
admin_knowledge_documents (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  file_type text,
  raw_text text,              -- Extracted searchable text
  storage_path text,          -- NEW: Path to original file in storage
  file_size integer,
  uploaded_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
```

---

## Usage Examples

### Upload Binary File (Frontend)

```typescript
async function uploadKnowledgeDocument(file: File) {
  const userId = (await supabase.auth.getUser()).data.user?.id;

  // Step 1: Upload to storage
  const fileName = `${Date.now()}_${file.name}`;
  const storagePath = `${userId}/${fileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('admin-knowledge-files')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Step 2: Create document record with storage path
  const { data: document, error: docError } = await supabase
    .from('admin_knowledge_documents')
    .insert({
      title: file.name,
      file_type: file.name.split('.').pop(),
      storage_path: storagePath,  // Store the path
      file_size: file.size,
      uploaded_by: userId
    })
    .select()
    .single();

  if (docError) {
    // Clean up uploaded file if document creation fails
    await supabase.storage
      .from('admin-knowledge-files')
      .remove([storagePath]);
    throw new Error(`Document creation failed: ${docError.message}`);
  }

  // Step 3: Trigger backend processing (edge function)
  await supabase.functions.invoke('process-knowledge-document', {
    body: { documentId: document.id }
  });

  return document;
}
```

### Process Document (Backend Edge Function)

```typescript
// process-knowledge-document edge function
import { createClient } from 'npm:@supabase/supabase-js@2';
import { extractTextFromPDF } from './pdf-extractor.ts';
import { extractTextFromDOCX } from './docx-extractor.ts';

Deno.serve(async (req) => {
  const { documentId } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get document record
  const { data: doc } = await supabase
    .from('admin_knowledge_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (!doc.storage_path) {
    return new Response('No storage path found', { status: 400 });
  }

  // Download file from storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('admin-knowledge-files')
    .download(doc.storage_path);

  if (downloadError) {
    return new Response(`Download failed: ${downloadError.message}`, { status: 500 });
  }

  // Extract text based on file type
  let extractedText = '';
  const fileType = doc.file_type?.toLowerCase();

  if (fileType === 'pdf') {
    extractedText = await extractTextFromPDF(fileData);
  } else if (fileType === 'docx' || fileType === 'doc') {
    extractedText = await extractTextFromDOCX(fileData);
  } else if (fileType === 'txt') {
    extractedText = await fileData.text();
  } else {
    return new Response(`Unsupported file type: ${fileType}`, { status: 400 });
  }

  // Update document with extracted text
  await supabase
    .from('admin_knowledge_documents')
    .update({
      raw_text: extractedText,
      processed_at: new Date().toISOString()
    })
    .eq('id', documentId);

  // Generate embeddings and chunks (if using vector search)
  // ... additional processing ...

  return new Response(JSON.stringify({ success: true, documentId }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### Download Original File

```typescript
async function downloadOriginalFile(documentId: string) {
  // Get document with storage path
  const { data: doc } = await supabase
    .from('admin_knowledge_documents')
    .select('storage_path, title, file_type')
    .eq('id', documentId)
    .single();

  if (!doc.storage_path) {
    throw new Error('No original file available');
  }

  // Download from storage
  const { data: fileData, error } = await supabase.storage
    .from('admin-knowledge-files')
    .download(doc.storage_path);

  if (error) {
    throw new Error(`Download failed: ${error.message}`);
  }

  // Create download link
  const blob = new Blob([fileData]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${doc.title}.${doc.file_type}`;
  link.click();
  URL.revokeObjectURL(url);
}
```

---

## Benefits

### 1. **Reliable Binary File Support**
- No more Unicode encoding errors
- Handles any file type (PDF, DOCX, images, etc.)
- Original files preserved in storage

### 2. **Better Performance**
- Database doesn't store large binary blobs
- Faster queries on `admin_knowledge_documents` table
- Storage layer optimized for file serving

### 3. **File Downloads**
- Users can download original files
- No data loss during text extraction
- Maintain file fidelity

### 4. **Scalability**
- Storage bucket can scale independently
- CDN can cache file downloads
- Database remains lean

### 5. **Debugging & Reprocessing**
- Can reprocess files if extraction fails
- Original files available for troubleshooting
- Update extraction algorithms without re-upload

---

## Storage Bucket Configuration

### Bucket Setup

**Bucket Name**: `admin-knowledge-files`

**RLS Policies**:
```sql
-- Allow supa_admin to upload
CREATE POLICY "Supa admins can upload knowledge files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'admin-knowledge-files'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- Allow supa_admin to read
CREATE POLICY "Supa admins can read knowledge files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'admin-knowledge-files'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );

-- Allow supa_admin to delete
CREATE POLICY "Supa admins can delete knowledge files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'admin-knowledge-files'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role = 'supa_admin'
    )
  );
```

**Configuration**:
```javascript
{
  public: false,           // Files are private
  fileSizeLimit: 52428800, // 50 MB limit
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown'
  ]
}
```

---

## Migration Path

### For Existing Documents (Without storage_path)

Documents created before this migration will have `storage_path = NULL`:

**Option 1**: Leave as-is
- Existing documents continue to work
- Only `raw_text` is available
- No download capability

**Option 2**: Backfill
- If original files are still available, re-upload them
- Populate `storage_path` for historical documents

```sql
-- Query to find documents without storage path
SELECT id, title, file_type, created_at
FROM admin_knowledge_documents
WHERE storage_path IS NULL
ORDER BY created_at DESC;
```

---

## Error Handling

### Upload Failures

```typescript
try {
  const document = await uploadKnowledgeDocument(file);
} catch (error) {
  if (error.message.includes('Upload failed')) {
    alert('File upload failed. Please check your connection and try again.');
  } else if (error.message.includes('Document creation failed')) {
    alert('Document record could not be created. File has been removed.');
  } else {
    alert(`Unexpected error: ${error.message}`);
  }
}
```

### Processing Failures

```typescript
// In edge function
try {
  const extractedText = await extractTextFromPDF(fileData);
} catch (error) {
  // Mark document as failed
  await supabase
    .from('admin_knowledge_documents')
    .update({
      processing_status: 'failed',
      processing_error: error.message
    })
    .eq('id', documentId);

  return new Response(JSON.stringify({
    error: 'Text extraction failed',
    details: error.message
  }), { status: 500 });
}
```

---

## Testing Checklist

- [ ] Upload PDF file - verify storage path is set
- [ ] Upload DOCX file - verify storage path is set
- [ ] Upload TXT file - verify storage path is set
- [ ] Verify text extraction works for each file type
- [ ] Test download original file functionality
- [ ] Verify files are private (not publicly accessible)
- [ ] Test upload size limit enforcement (50 MB)
- [ ] Test unsupported file type rejection
- [ ] Verify cleanup when document creation fails
- [ ] Test reprocessing document from storage

---

## Related Documentation

- [FILE_UPLOAD_FIX_SUMMARY.md](./FILE_UPLOAD_FIX_SUMMARY.md) - General file upload fixes
- [ADMIN_KNOWLEDGE_BASE_SYSTEM.md](./ADMIN_KNOWLEDGE_BASE_SYSTEM.md) - Knowledge base overview
- [STORAGE_BUCKET_SETUP.md](./STORAGE_BUCKET_SETUP.md) - Storage configuration

---

**Last Updated**: November 11, 2025
**Document Version**: 1.0
**Migration**: `20251103104149_add_storage_path_to_knowledge_documents.sql`
