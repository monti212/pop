# Bolt.new / WebContainer Support

## Summary

The uhuru-llm-api edge function has been updated to support requests from Bolt.new and WebContainer environments, which use dynamically generated subdomains.

## Problem

Bolt.new and similar WebContainer environments generate random subdomain URLs like:
```
https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--96435430.local-credentialless.webcontainer-api.io
```

These URLs are dynamically generated and cannot be added to a static whitelist, causing requests to be blocked by the CORS origin validation in uhuru-llm-api.

## Solution

Implemented pattern-based origin matching to allow all WebContainer subdomains while maintaining security.

### Implementation Details

**Pattern Added:**
```typescript
const BOLT_WEBCONTAINER_PATTERN = /^https:\/\/[a-z0-9-]+\.local-credentialless\.webcontainer-api\.io$/;
```

This regex pattern matches:
- Protocol: `https://` (required)
- Subdomain: Any combination of lowercase letters, numbers, and hyphens
- Domain: `.local-credentialless.webcontainer-api.io` (exact match required)

**Origin Validation Function:**
```typescript
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  // Check exact matches
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  // Check Bolt/WebContainer pattern
  if (BOLT_WEBCONTAINER_PATTERN.test(origin)) return true;

  return false;
}
```

## Allowed Origins

After this update, the uhuru-llm-api accepts requests from:

### Static Origins (Exact Match)
- `https://uhuru.orionx.xyz` - Production Uhuru platform
- `https://orionx.xyz` - Main OrionX domain
- `http://localhost:5173` - Vite dev server
- `http://localhost:3000` - Alternative dev server

### Dynamic Origins (Pattern Match)
- `*.local-credentialless.webcontainer-api.io` - All Bolt.new/WebContainer environments

## Security Considerations

### Why This is Safe

1. **Limited Pattern:** The pattern only matches the specific WebContainer domain structure
2. **HTTPS Only:** The pattern requires HTTPS, preventing man-in-the-middle attacks
3. **Specific Domain:** Only `.local-credentialless.webcontainer-api.io` is matched, not arbitrary domains
4. **Character Restrictions:** The subdomain pattern is restricted to alphanumeric and hyphens only

### What's Protected

- Other random domains are still blocked
- Only legitimate WebContainer environments can access the API
- All other security measures remain in place (authentication, rate limiting, etc.)

## Testing

To test the WebContainer support:

1. Open your project in Bolt.new or a WebContainer environment
2. Ensure the Uhuru chat functionality works without CORS errors
3. Check edge function logs to see successful origin validation
4. Verify that requests from other domains are still blocked

Expected log output for WebContainer requests:
```
🌍 [abc12345] Uhuru request start: POST from origin: https://[subdomain].local-credentialless.webcontainer-api.io
```

## Rollback Instructions

If you need to disable WebContainer support:

1. Edit `/supabase/functions/uhuru-llm-api/index.ts`
2. Remove or comment out the pattern check in `isOriginAllowed()`:
   ```typescript
   // if (BOLT_WEBCONTAINER_PATTERN.test(origin)) return true;
   ```
3. Redeploy the edge function

## Related Documentation

- [SECURITY_HARDENING_SUMMARY.md](./SECURITY_HARDENING_SUMMARY.md) - Complete security hardening details
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - Environment configuration guide

## Version History

- **v1.1** (2025-10-02) - Added Bolt.new/WebContainer pattern matching support
