# Supabase Edge Function Secrets Configuration

This document provides instructions for configuring the required environment variables in your Supabase Edge Functions to resolve the "Gateway not configured" error.

## Required Configuration

You need to configure the following secrets in your Supabase Dashboard for your Edge Functions to work properly.

### How to Configure Secrets

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Edge Functions** → **Secrets**
4. Add the following environment variables

---

## Edge Function Secrets to Configure

### Core API Configuration

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `UHURU_API_URL` | API endpoint URL for LLM responses using Responses API | `https://api.uhuru.ai/v1/chat/response` |
| `UHURU_IMAGES_URL` | API endpoint URL for image generation | `https://api.uhuru.ai/v1/images/generations` |
| `UHURU_API_KEY` | Your API key for authentication | `your-api-key-here` |

### Model Configuration

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `UHURU_MODEL_20` | Model identifier for Uhuru 2.0 | `gpt-5-mini` |

### Image Model Configuration

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `UHURU_IMAGE_MODEL_20` | Standard image model (dall-e-3) | `dall-e-3` |
| `UHURU_IMAGE_MODEL_21` | Advanced image model with background transparency support | `gpt-image-1` |

**Note**: Only model version 2.0 is supported for text generation. Image generation supports both 2.0 (dall-e-3) and 2.1 (gpt-image-1).

### Additional Configuration

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `UHURU_INTERNAL_API_KEY` | Secure UUID for internal authentication between Edge Functions | Generate with `uuidgen` or online UUID generator |

---

## Quick Setup Guide

Configure these secrets in your Supabase Dashboard:

```bash
# Core API Configuration
UHURU_API_URL=https://api.uhuru.ai/v1/chat/response
UHURU_IMAGES_URL=https://api.uhuru.ai/v1/images/generations
UHURU_API_KEY=<your-api-key>

# Model Configuration
UHURU_MODEL_20=gpt-5-mini

# Image Models
UHURU_IMAGE_MODEL_20=dall-e-3
UHURU_IMAGE_MODEL_21=gpt-image-1

# Internal Authentication
UHURU_INTERNAL_API_KEY=<generate-a-uuid>
```

---

## Verification Steps

After configuring the secrets:

1. **Redeploy Edge Functions** (if needed)
   - Supabase automatically picks up new secrets
   - No redeployment is typically needed

2. **Test the Configuration**
   - Open your application
   - Try sending a chat message
   - Check the Edge Function logs in Supabase Dashboard

3. **Check Logs**
   - Go to **Edge Functions** → **Logs**
   - Look for configuration debug messages
   - Verify that all required variables are detected

---

## Troubleshooting

### Error: "Gateway not configured"

**Cause**: Missing or incorrectly set environment variables

**Solution**:
1. Verify all required secrets are set in Supabase Dashboard
2. Check that `UHURU_API_URL` and `UHURU_API_KEY` are correctly configured
3. Ensure there are no typos in variable names

### Error: "Authentication failed"

**Cause**: Invalid API key

**Solution**:
1. Verify your API key is valid
2. Check that the key has proper permissions
3. Ensure the key hasn't expired or been revoked

### Configuration Not Loading

**Cause**: Secrets not applied to Edge Functions

**Solution**:
1. Wait a few minutes for secrets to propagate
2. Refresh the Edge Function logs page
3. Try redeploying the affected Edge Function

---

## Security Notes

- **Never commit secrets to version control**
- All secrets are stored securely in Supabase
- Secrets are only accessible by Edge Functions, not frontend code
- Use different API keys for development and production if possible
- Generate a strong, unique UUID for `UHURU_INTERNAL_API_KEY`

---

## Changes Made

The configuration has been simplified to only support the essential model versions:

### Removed:
- `UHURU_20_API_KEY` (now uses single `UHURU_API_KEY`)
- `UHURU_MODEL_15` and `UHURU_MODEL_21` (only 2.0 supported)
- `UHURU_IMAGE_MODEL_15` (only 2.0 and 2.1 supported)
- `UHURU_EXTRA_HEADERS` (not needed)
- Origin-based CORS restrictions (now allows all origins)

### Updated:
- Uses Responses API endpoint: `https://api.uhuru.ai/v1/chat/response`
- Single API key for all operations
- Simplified model configuration with only 2.0 support
- Two image models: 2.0 (dall-e-3) and 2.1 (gpt-image-1)

This change:
- Simplifies configuration significantly
- Reduces maintenance overhead
- Removes unused features
- Improves security and maintainability

---

## Support

If you encounter issues after configuring these secrets:
1. Check Edge Function logs for specific error messages
2. Verify all secrets are correctly spelled
3. Ensure your API keys are valid and have sufficient quota
4. Contact support if the issue persists
