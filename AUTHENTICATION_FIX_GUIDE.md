# Authentication Fix Guide

## Issue Detected

Your application's authentication is currently failing because the Supabase anonymous key (JWT token) in your `.env` file has expired.

### Current Status
- ✅ Database is properly configured
- ✅ User profiles table exists with correct schema
- ✅ Row Level Security (RLS) policies are in place
- ✅ Authentication trigger is working correctly
- ❌ **JWT token has expired and needs to be refreshed**

## How to Fix

### Step 1: Get a Fresh Supabase Anonymous Key

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project (the one with URL: `https://0ec90b57d6e95fcbda19832f.supabase.co`)
3. Navigate to **Settings** → **API**
4. In the "Project API keys" section, find the **anon/public** key
5. Copy this key (it should be a very long string starting with `eyJ`)

### Step 2: Update Your .env File

1. Open the `.env` file in your project root directory
2. Replace the current `VITE_SUPABASE_ANON_KEY` value with the new key you just copied
3. The line should look like this:
   ```
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_NEW_KEY_HERE
   ```

### Step 3: Restart Your Development Server

1. Stop your current development server (if running)
2. Clear any cached data:
   ```bash
   rm -rf node_modules/.vite
   ```
3. Restart the development server:
   ```bash
   npm run dev
   ```

### Step 4: Clear Browser Cache

1. Open your browser's Developer Tools (F12)
2. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Under **Local Storage**, find your app's URL
4. Delete all Supabase-related keys (they contain "supabase" and "auth" in their names)
5. Refresh the page

## Verification

After completing these steps, you should see in the browser console:
```
✅ Supabase configuration valid, initializing client...
✅ Supabase client initialized successfully
```

If you still see errors about expired tokens or configuration issues, double-check that:
- You copied the entire anonymous key from the Supabase dashboard
- You pasted it correctly without any extra spaces or line breaks
- You restarted the development server after making changes

## What Was Fixed

The following improvements have been made to help diagnose and fix authentication issues:

1. **JWT Token Validation**: Added automatic detection of expired JWT tokens
2. **Better Error Messages**: The app now provides specific error messages when the JWT token is expired
3. **Enhanced Logging**: Console logs now show detailed information about JWT expiration
4. **Improved Error Handling**: Sign-in and sign-up flows now provide clearer feedback about configuration issues

## Database Configuration

Your database is properly set up with:
- ✅ `user_profiles` table with all required columns
- ✅ `handle_new_user` trigger for automatic profile creation
- ✅ RLS policies for secure data access
- ✅ Team roles and subscription management

## Support

If you continue to experience issues after following these steps:
1. Check the browser console for specific error messages
2. Verify your Supabase project is active and not suspended
3. Ensure your database migrations have all been applied successfully
4. Contact your development team or Supabase support

## Technical Details

The JWT token in your `.env` file had the following issue:
- **Issued At (iat)**: 1758881574 (same as expiration)
- **Expiration (exp)**: 1758881574 (already expired)
- **Current Time**: Much later than expiration

This indicates the token was either a placeholder or was created with an immediate expiration for testing purposes.
