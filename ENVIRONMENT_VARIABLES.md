# Environment Variables Documentation

This document provides comprehensive information about all environment variables used in the Uhuru platform, including both frontend `.env` variables and Supabase Edge Function secrets.

## Table of Contents

- [Frontend Environment Variables](#frontend-environment-variables)
- [Supabase Edge Function Environment Variables](#supabase-edge-function-environment-variables)
- [Configuration Guide](#configuration-guide)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

---

## Frontend Environment Variables

These variables are stored in the `.env` file at the project root and are used by the Vite frontend application.

### Supabase Configuration

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes | `https://abcdefghijklm.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public API key | Yes | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_SUPABASE_FUNCTIONS_URL` | Supabase Edge Functions URL | Yes | `https://abcdefghijklm.functions.supabase.co` |
| `SUPABASE_PROJECT_ID` | Supabase project ID (used in config.toml) | Yes | `abcdefghijklm` |

**How to obtain these values:**
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the Project URL, anon/public key, and project reference ID

### Stripe Configuration

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for frontend | Yes | `pk_live_...` or `pk_test_...` |
| `STRIPE_SECRET_KEY` | Stripe secret key (backend only) | Yes | `sk_live_...` or `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Yes | `whsec_...` |

**How to obtain these values:**
1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to Developers → API keys
3. Copy your publishable and secret keys
4. For webhook secret: Go to Developers → Webhooks → Add endpoint → Copy signing secret

### Netlify Configuration

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NETLIFY_AUTH_TOKEN` | Netlify personal access token | Optional | `nfp_...` |

**Note:** This is only required if you're using Netlify deployment features.

---

## Supabase Edge Function Environment Variables

These variables are configured in the Supabase Dashboard under Settings → Edge Functions → Secrets. They are available to all edge functions but must be set in your Supabase project dashboard.

### Core Edge Function Variables

All edge functions have automatic access to:
- `SUPABASE_URL` - Auto-populated by Supabase
- `SUPABASE_ANON_KEY` - Auto-populated by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-populated by Supabase
- `SUPABASE_DB_URL` - Auto-populated by Supabase

**You do NOT need to manually configure these variables.**

### uhuru-llm-api Edge Function

The main AI chat service that calls external LLM providers.

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `UHURU_API_URL` | API endpoint URL for LLM responses | Yes | `https://api.provider.com/v1/responses` |
| `UHURU_IMAGES_URL` | API endpoint URL for image generation | Yes | `https://api.provider.com/v1/images/generations` |
| `UHURU_API_KEY` | API key for LLM provider | Yes | `your-api-key` |
| `UHURU_20_API_KEY` | API key for model 2.0 (optional, can use UHURU_API_KEY) | No | `your-api-key` |
| `UHURU_MODEL_20` | Text model identifier for Uhuru 2.0 (used for chat) | Yes | `gpt-5-nano` |
| `UHURU_IMAGE_MODEL_20` | Image model for Craft-1 | Yes | `dall-e-3` |
| `UHURU_IMAGE_MODEL_21` | Image model for Craft-2 (advanced) | Yes | `gpt-image-1` |
| `UHURU_EXTRA_HEADERS` | Optional JSON object with additional headers | No | `{"X-Custom":"value"}` |
| `UHURU_INTERNAL_API_KEY` | Internal authentication key for Supabase edge function calls | Yes | `your-secure-random-uuid` |

**Important Notes:**
- `UHURU_INTERNAL_API_KEY` must be the same value in both `uhuru-llm-api` and `twilio-whatsapp-webhook` edge function secrets
- Use a secure random UUID or similar strong random value for the internal API key
- This key enables secure communication between Supabase edge functions without CORS issues

### webhook-stripe Edge Function

Handles incoming Stripe webhook events.

| Variable | Description | Required | Source |
|----------|-------------|----------|--------|
| `STRIPE_SECRET_KEY` | Stripe secret API key | Yes | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Yes | Stripe Dashboard |

### Phone Verification Edge Functions

Used by `start-phone-verification` and `check-phone-verification`.

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID | Yes | `AC...` |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Yes | `...` |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify service SID | Yes | `VA...` |

**Note:** If phone verification is not used, these can be omitted.

### Stripe Payment Edge Functions

Used by `stripe-checkout`, `stripe-subscription`, and `stripe-update-payment`.

| Variable | Description | Required | Source |
|----------|-------------|----------|--------|
| `STRIPE_SECRET_KEY` | Stripe secret API key | Yes | Stripe Dashboard |

### uhuru-whatsapp-api Edge Function

Dedicated WhatsApp AI service with minimal system prompts. This is a streamlined version of uhuru-llm-api optimized for WhatsApp messaging with concise responses and no system prompt leakage.

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `UHURU_API_URL` | API endpoint URL for LLM responses | Yes | `https://api.provider.com/v1/responses` |
| `UHURU_IMAGES_URL` | API endpoint URL for image generation | Yes | `https://api.provider.com/v1/images/generations` |
| `UHURU_API_KEY` | API key for LLM provider | Yes | `your-api-key` |
| `UHURU_MODEL_20` | Text model identifier for Uhuru 2.0 (WhatsApp uses 2.0 only) | Yes | `gpt-5-nano` |
| `UHURU_IMAGE_MODEL_20` | Image model for Craft-1 | Yes | `dall-e-3` |
| `UHURU_INTERNAL_API_KEY` | Internal authentication key for Supabase edge function calls | Yes | `your-secure-random-uuid` |
| `UHURU_EXTRA_HEADERS` | Optional JSON object with additional headers | No | `{"X-Custom":"value"}` |

**Important Notes:**
- This function is specifically designed for WhatsApp with a minimal, concise system prompt
- Only requires Uhuru 2.0 model configuration (not 1.5 or 2.1)
- Supports multimodal capabilities: text, images, and documents
- `UHURU_INTERNAL_API_KEY` must match the value in `twilio-whatsapp-webhook`
- Includes enhanced sanitization to prevent system prompt exposure

### uhuru-files Edge Function

Handles file uploads for chat attachments.

No additional environment variables required beyond core Supabase variables.

### admin-data Edge Function

Provides administrative dashboard data.

No additional environment variables required beyond core Supabase variables.

### twilio-whatsapp-webhook Edge Function

Handles incoming WhatsApp messages via Twilio and processes them with Uhuru AI.

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID | Yes | `AC...` |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Yes | `...` |
| `TWILIO_WHATSAPP_NUMBER` | Your Twilio WhatsApp number (without whatsapp: prefix) | Yes | `+26772224340` |
| `UHURU_WHATSAPP_API_URL` | URL to the uhuru-whatsapp-api edge function | Yes | `https://your-project.functions.supabase.co/uhuru-whatsapp-api` |
| `UHURU_INTERNAL_API_KEY` | Internal authentication key for Supabase edge function calls | Yes | `your-secure-random-uuid` |

**Important Notes:**
- `TWILIO_WHATSAPP_NUMBER` must be in E.164 format (e.g., +26772224340) without the "whatsapp:" prefix
- `UHURU_WHATSAPP_API_URL` should point to your deployed uhuru-whatsapp-api edge function endpoint (dedicated WhatsApp API with minimal system prompts)
- `UHURU_INTERNAL_API_KEY` is a secure random key (UUID recommended) used to authenticate internal Supabase edge function calls. This must be configured in both `uhuru-whatsapp-api` and `twilio-whatsapp-webhook` edge function secrets.
- All Twilio credentials can be found in your [Twilio Console](https://console.twilio.com)

**How to obtain Twilio WhatsApp credentials:**
1. Log in to your [Twilio Console](https://console.twilio.com)
2. Navigate to Messaging → Try it out → Send a WhatsApp message
3. Follow Twilio's setup wizard to activate WhatsApp on your Twilio number
4. Copy your Account SID and Auth Token from the Console dashboard
5. Copy your WhatsApp-enabled phone number (format: +1234567890)

---

## Configuration Guide

### Initial Setup

1. **Clone the repository** and navigate to the project directory

2. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Configure frontend variables** in `.env`:
   - Add your Supabase project credentials
   - Add your Stripe keys (if using payments)
   - Add any optional service credentials

4. **Configure Supabase Edge Function secrets:**
   - Log in to [Supabase Dashboard](https://supabase.com/dashboard)
   - Navigate to Settings → Edge Functions → Secrets
   - Add each required secret for your edge functions
   - Click "Add new secret" for each variable

### Production vs Development

#### Development Environment

For local development:
- Use test/sandbox credentials (Stripe test keys, etc.)
- Localhost origins are allowed in uhuru-llm-api CORS configuration
- Bolt.new/WebContainer origins are automatically allowed via pattern matching
- Use `.env.local` for local overrides (never commit this file)

#### Production Environment

For production deployment:
- Use live/production credentials
- Ensure CORS origins in uhuru-llm-api match your production domains
- Configure secure webhook endpoints
- Enable additional security features in Supabase dashboard

**Allowed Origins in uhuru-llm-api:**
- `https://uhuru.orionx.xyz` (production)
- `https://orionx.xyz` (main domain)
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (alternative dev server)
- `*.local-credentialless.webcontainer-api.io` (Bolt.new/WebContainer environments)

### Verifying Configuration

To verify your environment variables are configured correctly:

1. **Frontend variables:**
   ```bash
   npm run dev
   ```
   Check browser console for any missing environment variable warnings

2. **Edge function variables:**
   - Deploy an edge function
   - Check function logs in Supabase Dashboard → Edge Functions → Logs
   - Look for validation errors about missing environment variables

---

## Security Best Practices

### General Security

1. **Never commit secrets to version control**
   - Add `.env` to `.gitignore`
   - Never commit `.env.local` or `.env.production`
   - Use `.env.example` with placeholder values only

2. **Use environment-specific credentials**
   - Development: Test/sandbox credentials
   - Production: Live credentials
   - Never mix credentials between environments

3. **Rotate credentials regularly**
   - Change API keys every 90 days
   - Immediately rotate if credentials are compromised
   - Update both frontend `.env` and Supabase secrets

4. **Limit credential access**
   - Use minimal required permissions
   - Create service-specific API keys when possible
   - Restrict IP addresses where applicable

### Supabase-Specific Security

1. **Use Row Level Security (RLS)**
   - Enable RLS on all tables
   - Never expose service_role_key to frontend
   - Test policies thoroughly

2. **Edge Function Security**
   - All secrets stored in Supabase dashboard are encrypted
   - Secrets are injected at runtime, not stored in function code
   - Use origin validation in CORS headers (already implemented in uhuru-llm-api)

3. **API Key Management**
   - Anon key is safe for frontend use
   - Service role key should NEVER be in frontend code
   - Service role key is only for backend/edge functions

### Stripe-Specific Security

1. **Webhook Security**
   - Always verify webhook signatures
   - Use webhook signing secrets
   - Validate event types before processing

2. **Key Types**
   - Publishable key: Safe for frontend
   - Secret key: Backend/edge functions only
   - Webhook secret: Backend only

---

## Troubleshooting

### Common Issues

#### "Missing required environment variables"

**Problem:** Edge function logs show missing environment variable errors

**Solution:**
1. Log in to Supabase Dashboard
2. Navigate to Settings → Edge Functions → Secrets
3. Add the missing variables
4. Redeploy the edge function

#### "CORS error when calling edge function"

**Problem:** Browser shows CORS policy error

**Solution:**
1. Check that your origin is in the ALLOWED_ORIGINS array in uhuru-llm-api
2. Verify origin header matches exactly (including protocol and port)
3. Check edge function logs for origin validation errors

#### "Stripe webhook signature verification failed"

**Problem:** Webhook events are rejected

**Solution:**
1. Verify STRIPE_WEBHOOK_SECRET matches your Stripe dashboard
2. Ensure webhook endpoint URL is correct
3. Check that raw request body is being used for verification

#### "Supabase client not initialized"

**Problem:** Frontend shows Supabase connection errors

**Solution:**
1. Verify VITE_SUPABASE_URL is correct
2. Check VITE_SUPABASE_ANON_KEY is valid
3. Ensure variables are prefixed with `VITE_` for Vite access
4. Restart dev server after changing `.env`

#### "Invalid Twilio WhatsApp number configured"

**Problem:** WhatsApp webhook shows invalid phone number errors

**Solution:**
1. Check that TWILIO_WHATSAPP_NUMBER is set in Supabase Edge Function secrets
2. Ensure the format is E.164 without "whatsapp:" prefix (e.g., +26772224340)
3. Remove any spaces, dashes, or special characters
4. Verify the number is WhatsApp-enabled in your Twilio Console

#### "Invalid URL" or "Uhuru processing error: TypeError: Invalid URL"

**Problem:** WhatsApp webhook fails to connect to Uhuru API

**Solution:**
1. Verify UHURU_API_URL is set in Supabase Edge Function secrets
2. Ensure it points to your deployed uhuru-llm-api edge function
3. Format should be: https://your-project.functions.supabase.co/uhuru-llm-api
4. Check edge function logs to confirm the URL is not empty
5. Redeploy the twilio-whatsapp-webhook function after setting variables

#### "Origin not allowed" or "Authentication required" (401 error)

**Problem:** WhatsApp webhook gets 401 errors when calling uhuru-llm-api

**Solution:**
1. Verify UHURU_INTERNAL_API_KEY is set in BOTH edge function secrets:
   - uhuru-llm-api
   - twilio-whatsapp-webhook
2. Ensure the key is EXACTLY the same in both functions
3. Generate a secure random UUID for the key (use `uuidgen` or online UUID generator)
4. Redeploy both edge functions after setting the variable
5. Check edge function logs to confirm internal authentication is validated

### Validation Checklist

Use this checklist when setting up a new environment:

- [ ] Frontend `.env` file exists and has all required variables
- [ ] Supabase credentials are valid and accessible
- [ ] Stripe keys match the intended environment (test vs live)
- [ ] All edge function secrets are configured in Supabase dashboard
- [ ] CORS origins in uhuru-llm-api include your domain
- [ ] Webhook endpoints are configured correctly
- [ ] Test a simple API call to verify connectivity
- [ ] Check edge function logs for any warnings

### Getting Help

If you encounter issues not covered in this guide:

1. Check edge function logs in Supabase Dashboard
2. Review browser console for frontend errors
3. Verify all credentials are for the same environment
4. Contact support at support@orionx.xyz

---

## Credential Rotation Procedure

Follow this procedure when rotating credentials:

### 1. Rotating Supabase Credentials

Supabase credentials rarely need rotation, but if required:

1. Generate new keys in Supabase Dashboard → Settings → API
2. Update `.env` with new values
3. Update Supabase secrets if service_role_key changed
4. Redeploy all edge functions
5. Restart frontend application
6. Verify all functionality works
7. Revoke old credentials

### 2. Rotating Stripe Credentials

For Stripe key rotation:

1. Create new API keys in Stripe Dashboard
2. Update `STRIPE_SECRET_KEY` in Supabase Edge Function secrets
3. Update `VITE_STRIPE_PUBLISHABLE_KEY` in `.env`
4. Update `STRIPE_WEBHOOK_SECRET` if rotating webhooks
5. Redeploy affected edge functions
6. Test payment flow end-to-end
7. Roll back old keys after verification

### 3. Rotating LLM Provider Credentials

For UHURU_API_KEY rotation:

1. Generate new API key from your LLM provider
2. Update `UHURU_API_KEY` in Supabase Edge Function secrets
3. Redeploy uhuru-llm-api edge function
4. Test chat functionality
5. Monitor for any authentication errors
6. Revoke old API key

---

## Appendix

### Environment Variable Naming Conventions

- `VITE_*` - Frontend accessible variables (Vite convention)
- `SUPABASE_*` - Supabase-related configuration
- `STRIPE_*` - Stripe payment processing
- `UHURU_*` - Uhuru-specific AI configuration
- `TWILIO_*` - Twilio phone verification

### Related Documentation

- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)

### Version History

- **v1.0** (2025-10-02) - Initial documentation with security hardening for uhuru-llm-api
