# Storage Bucket Setup Guide

## Overview
The `user-files` storage bucket has been created for handling file uploads in the application. This guide documents the setup and manual configuration steps required.

## Automatic Setup (Completed)
- ✅ Storage bucket `user-files` created with 2GB file size limit
- ✅ Bucket configured as public for direct URL access
- ✅ Cleanup trigger added to remove files when database records are deleted

## Manual Configuration Required

Since RLS policies on `storage.objects` cannot be created via migrations due to permissions, you need to configure them manually in the Supabase dashboard:

### Step 1: Access Storage Policies
1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/jdcsogwwrbzkqhhadjlv
2. Navigate to **Storage** in the left sidebar
3. Click on the **Policies** tab
4. Select the `objects` table under `storage` schema

### Step 2: Create RLS Policies

Create the following policies for the `storage.objects` table:

#### Policy 1: Users can upload to their own folder
```sql
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 2: Users can read their own files
```sql
CREATE POLICY "Users can read their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 3: Public can read files
```sql
CREATE POLICY "Public can read files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-files');
```

#### Policy 4: Users can update their own files
```sql
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 5: Users can delete their own files
```sql
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 6: Admins can read all files
```sql
CREATE POLICY "Admins can read all files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.team_role IN ('optimus_prime', 'prime')
  )
);
```

#### Policy 7: Admins can delete any file
```sql
CREATE POLICY "Admins can delete any file"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.team_role IN ('optimus_prime', 'prime')
  )
);
```

### Step 3: Enable RLS
Ensure RLS is enabled on the `storage.objects` table:
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

## Folder Structure
Files are organized in the bucket with the following structure:
- `{user_id}/chat-images/` - Images attached to chat messages
- `{user_id}/chat-documents/` - Documents attached to chat messages
- `{user_id}/generated-images/` - AI-generated images
- `{user_id}/` - Regular file uploads

## Security Features
- Path-based access control ensures users can only access their own folders
- Admins (optimus_prime, prime roles) have oversight capability for moderation
- Public bucket allows sharing file URLs in chat
- 2GB file size limit per file
- Automatic cleanup when database records are deleted

## Verification
After setup, test the following:
1. Upload a file through the chat interface
2. Verify the file appears in storage under the correct user folder
3. Verify the file URL is accessible
4. Verify the file persists after sending the message
5. Delete a file and verify it's removed from both database and storage

## Troubleshooting
If you encounter "Bucket not found" errors:
- Verify the bucket exists in the Storage section of Supabase dashboard
- Check that the bucket name is exactly 'user-files'
- Ensure the bucket is set to public

If uploads fail:
- Check that RLS policies are configured correctly
- Verify user authentication is working
- Check browser console for detailed error messages
- Ensure file size is under 2GB limit
