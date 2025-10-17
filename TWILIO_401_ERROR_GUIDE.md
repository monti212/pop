# Twilio 401 Authentication Error - Troubleshooting Guide

## Issue
Phone authentication is failing with a 401 Unauthorized error from Twilio Verify API.

## Root Cause
A 401 error indicates that Twilio is rejecting the authentication credentials. This happens when:

1. **Incorrect Account SID** - Must start with "AC" and be exactly the Account SID from your Twilio Console
2. **Incorrect Auth Token** - Must be exactly 32 characters and match your Primary or Secondary Auth Token
3. **Incorrect Verify Service SID** - Must start with "VA" and be from the Verify > Services section in Twilio Console
4. **Whitespace in credentials** - Extra spaces or line breaks in environment variables
5. **Using test credentials in production** - Test Account SID won't work with live phone numbers

## How to Fix

### Step 1: Verify Your Twilio Credentials

Go to your Twilio Console (https://console.twilio.com) and verify:

1. **Account SID** (from Dashboard home page)
   - Format: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (34 characters)
   - Starts with "AC"

2. **Auth Token** (from Dashboard home page, click "Show" to reveal)
   - Format: 32 character alphanumeric string
   - Keep this secret!

3. **Verify Service SID** (from Verify > Services)
   - Format: `VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (34 characters)
   - Starts with "VA"
   - Create one if you don't have it: Verify > Services > Create new Service

### Step 2: Update Supabase Edge Function Secrets

Go to your Supabase Dashboard > Edge Functions > Secrets and verify:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your32characterauthtoken
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Important:**
- Remove any quotes around the values
- Remove any whitespace before or after the values
- Make sure there are no line breaks in the middle of values

### Step 3: Redeploy Edge Functions

After updating the secrets, you need to redeploy the Edge Functions for changes to take effect:

```bash
# From your project root
npx supabase functions deploy start-phone-verification
npx supabase functions deploy check-phone-verification
```

### Step 4: Test the Phone Verification

1. Try signing in with a phone number in international format (e.g., +267 12345678)
2. Check the Supabase Edge Function logs for detailed error messages
3. The logs will now show:
   - Which credentials are being used (first 10 characters)
   - Whether the format is correct (AC for Account SID, VA for Verify Service)
   - Specific Twilio error codes if authentication still fails

## Enhanced Error Logging

The updated Edge Functions now include:

1. **Credential Format Validation**
   - Checks if Account SID starts with "AC"
   - Checks if Verify Service SID starts with "VA"
   - Logs the first 2 characters for verification

2. **Whitespace Trimming**
   - Automatically removes whitespace from credentials
   - Prevents common copy-paste errors

3. **Detailed Error Messages**
   - Shows specific guidance for 401 errors
   - Logs credential format for debugging
   - Provides actionable next steps

## Common Mistakes to Avoid

❌ **Don't use API Key SID (SKxxxxx) - Use Account SID (ACxxxxx)**
❌ **Don't use Messaging Service SID (MGxxxxx) - Use Verify Service SID (VAxxxxx)**
❌ **Don't wrap credentials in quotes in Supabase secrets**
❌ **Don't use test credentials with real phone numbers**
❌ **Don't share Auth Token - keep it secret**

## Testing Checklist

- [ ] Account SID starts with "AC"
- [ ] Auth Token is exactly 32 characters
- [ ] Verify Service SID starts with "VA"
- [ ] No whitespace or quotes in Supabase secrets
- [ ] Edge Functions redeployed after updating secrets
- [ ] Phone number in international format (+country_code number)
- [ ] Checked Supabase Edge Function logs for detailed error messages

## Still Having Issues?

Check the Supabase Edge Function logs to see the detailed error messages:

1. Go to Supabase Dashboard > Edge Functions
2. Click on "start-phone-verification" function
3. View the logs - you should now see detailed information about:
   - Credential formats being used
   - Twilio API response codes
   - Specific authentication errors

The enhanced logging will help identify exactly which credential is causing the 401 error.
