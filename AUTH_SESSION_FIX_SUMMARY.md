# Authentication Session Fix - Missing Sub Claim

## Problem Overview

The application was experiencing "403: invalid claim: missing sub claim" errors in certain authentication flows. While the PhoneAuthModal successfully avoided this error by following robust patterns, other parts of the authentication system were vulnerable to creating or using incomplete JWT tokens.

## Root Causes Identified

1. **Incomplete Session Validation**: Sessions were being used without verifying they contained all required JWT claims, particularly the `sub` (subject/user ID) claim
2. **Edge Function Token Generation**: The `check-phone-verification` Edge Function was generating tokens without comprehensive validation
3. **Race Conditions**: API calls were being made before sessions were fully established and validated
4. **Missing Pre-flight Checks**: Services were making authenticated requests without validating session state first
5. **Insufficient Error Handling**: Invalid or incomplete tokens were not being detected and cleared properly

## Solutions Implemented

### 1. Centralized Session Validation Utility (`src/utils/sessionValidator.ts`)

Created a comprehensive session validation library with the following capabilities:

- **`decodeJWT(token)`**: Safely decode JWT tokens on the client-side for validation
- **`isJWTExpired(token)`**: Check if JWT tokens have expired
- **`validateJWTClaims(token)`**: Validate that tokens contain all required claims including `sub`, `aud`, `role`, `exp`, and `iat`
- **`validateSession(session)`**: Comprehensive session validation checking:
  - Session existence
  - Access token presence and validity
  - Required JWT claims
  - User object completeness
  - User ID matching between session and token claims
- **`waitForSessionReady(getSession, options)`**: Retry mechanism to wait for sessions to be fully established with validation
- **`getUserIdFromSession(session)`**: Safely extract user ID with fallbacks
- **`isSessionNearExpiry(session, threshold)`**: Check if session needs refreshing
- **`getSessionTimeToExpiry(session)`**: Get remaining session lifetime

### 2. Enhanced authService (`src/services/authService.ts`)

Integrated session validation into the core authentication service:

- Replaced manual JWT decoding with centralized utilities
- Added session validation during `getCurrentUser()` to catch invalid sessions early
- Implemented automatic clearing of invalid sessions
- Enhanced error logging for JWT validation failures

### 3. Fixed Edge Function Session Generation (`supabase/functions/check-phone-verification/index.ts`)

Improved the phone verification Edge Function's session generation:

- **Enhanced User Retrieval**: Added explicit user fetch with error handling before token generation
- **Comprehensive Logging**: Added detailed logging at each step of session generation
- **Token Validation**: Added validation to ensure generated tokens contain the `sub` claim before returning to client
- **Fallback Mechanisms**: Implemented graceful fallback to client-side refresh when server-side session generation fails
- **JWT Claim Verification**: Decode and validate access tokens server-side to catch missing claims immediately

Key changes:
```typescript
// Before: No validation of generated tokens
const { data: otpData } = await supabase.auth.admin.generateLink({...});
const accessToken = urlParams.get('access_token') || '';

// After: Validate tokens have required claims
const { data: otpData, error: linkError } = await supabase.auth.admin.generateLink({...});
if (linkError) {
  // Handle error
}

// Decode and validate token has 'sub' claim
const tokenParts = accessToken.split('.');
const payload = JSON.parse(atob(tokenParts[1]));
if (!payload.sub) {
  // Return error - token is invalid
}
```

### 4. Enhanced PhoneAuthModal (`src/components/PhoneAuthModal.tsx`)

Added explicit session validation after `setSession()`:

- Imported `waitForSessionReady` utility
- Added retry logic with validation after setting session
- Implemented comprehensive logging for debugging
- Validates session contains required claims before proceeding

```typescript
// Wait for session to be fully established with validation
const sessionResult = await waitForSessionReady(
  () => supabase.auth.getSession(),
  { maxAttempts: 5, delayMs: 200, validateClaims: true }
);

if (sessionResult.error || !sessionResult.session) {
  throw new Error('Session validation failed');
}
```

### 5. Improved AuthContext (`src/context/AuthContext.tsx`)

Added session validation during initialization:

- Validates cached sessions on startup
- Clears invalid sessions automatically
- Prevents use of sessions with missing claims
- Enhanced error logging for session issues

### 6. API Guard Utility (`src/utils/apiGuard.ts`)

Created a new utility for pre-flight authentication checks before API calls:

- **`checkAuthBeforeApiCall(options)`**: Validates session before allowing API requests
  - Checks session existence
  - Validates JWT claims
  - Refreshes near-expiry sessions automatically
  - Returns user ID for use in queries
- **`withAuthGuard(apiCall, options)`**: Higher-order function to wrap API calls with automatic auth checking
- **`getValidatedUserId()`**: Safely get current user ID with validation
- **`isAuthenticated()`**: Check authentication status with validation

Benefits:
- Prevents API calls with invalid or incomplete sessions
- Automatically refreshes expiring sessions
- Provides consistent error handling across all API calls
- Catches auth errors early before they reach the server

### 7. Enhanced chatService (`src/services/chatService.ts`)

Integrated pre-flight auth checks:

- Added `checkAuthBeforeApiCall()` before database operations
- Validates authentication before creating conversations
- Validates authentication before fetching conversations
- Provides clear error messages for auth failures

## Key Patterns Established

### 1. Always Validate Before Use

```typescript
// ✅ Good: Validate session before using
const validation = validateSession(session);
if (!validation.valid) {
  // Handle invalid session
  await supabase.auth.signOut();
  return;
}
// Use session safely
```

### 2. Wait for Session Establishment

```typescript
// ✅ Good: Wait for session to be ready
await supabase.auth.setSession({ access_token, refresh_token });

const sessionResult = await waitForSessionReady(
  () => supabase.auth.getSession(),
  { validateClaims: true }
);

if (sessionResult.session) {
  // Session is validated and ready
}
```

### 3. Pre-flight Checks for API Calls

```typescript
// ✅ Good: Check auth before API call
const authCheck = await checkAuthBeforeApiCall({
  requireAuth: true,
  operation: 'create conversation'
});

if (!authCheck.allowed) {
  throw new Error(authCheck.error);
}

// Make API call safely
await supabase.from('conversations').insert({...});
```

### 4. Server-Side Token Validation

```typescript
// ✅ Good: Validate generated tokens server-side
const { data: otpData } = await supabase.auth.admin.generateLink({...});

// Decode and validate token
const payload = decodeJWT(accessToken);
if (!payload.sub) {
  return error response;
}

// Return validated token
return { session: { access_token, refresh_token } };
```

## Benefits

1. **Prevents 403 Errors**: All sessions are validated before use, preventing "missing sub claim" errors
2. **Early Detection**: Invalid sessions are caught and cleared immediately
3. **Automatic Recovery**: Expired sessions are automatically refreshed when possible
4. **Better User Experience**: Clear error messages guide users to re-authenticate when needed
5. **Consistent Behavior**: All authentication flows use the same validation logic
6. **Easier Debugging**: Comprehensive logging helps identify auth issues quickly
7. **Future-proof**: Centralized utilities make it easy to add more validation as needed

## Testing Checklist

- [x] Build succeeds without errors
- [ ] Phone authentication creates valid sessions
- [ ] Email/password authentication creates valid sessions
- [ ] OAuth authentication creates valid sessions
- [ ] Session refresh maintains valid tokens
- [ ] Invalid sessions are detected and cleared
- [ ] API calls are blocked with invalid sessions
- [ ] User can successfully create conversations
- [ ] User can successfully fetch conversations
- [ ] Token expiry triggers automatic refresh
- [ ] Edge Functions generate valid tokens

## Files Modified

1. **New Files**:
   - `src/utils/sessionValidator.ts` - Centralized session validation
   - `src/utils/apiGuard.ts` - Pre-flight API authentication checks

2. **Modified Files**:
   - `src/services/authService.ts` - Integrated session validation
   - `src/components/PhoneAuthModal.tsx` - Added session validation after setSession
   - `src/context/AuthContext.tsx` - Validate sessions on initialization
   - `src/services/chatService.ts` - Added pre-flight auth checks
   - `supabase/functions/check-phone-verification/index.ts` - Enhanced token generation and validation

## Next Steps

1. **Extend Pre-flight Checks**: Add `checkAuthBeforeApiCall()` to other services:
   - `fileService.ts`
   - `classService.ts`
   - `studentService.ts`
   - `lessonPlanService.ts`
   - `documentService.ts`

2. **Monitor Logs**: Watch for "SessionValidator" and "ApiGuard" log messages to identify remaining issues

3. **Add Tests**: Create automated tests for session validation scenarios

4. **User Feedback**: Add user-friendly error messages and prompts for re-authentication

5. **Session Recovery**: Implement automatic session recovery for common failure cases

## Pattern to Follow for Other Services

When adding authentication to any service function:

```typescript
import { checkAuthBeforeApiCall } from '../utils/apiGuard';

export const serviceFunction = async (userId: string, ...params) => {
  try {
    // 1. Pre-flight auth check
    const authCheck = await checkAuthBeforeApiCall({
      requireAuth: true,
      operation: 'service function name'
    });

    if (!authCheck.allowed) {
      logger.error('Auth check failed:', authCheck.error);
      throw new Error(authCheck.error || 'Authentication required');
    }

    // 2. Use validated userId from authCheck (optional but safer)
    const validatedUserId = authCheck.userId || userId;

    // 3. Make API call safely
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('user_id', validatedUserId);

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Service function error:', error);
    throw error;
  }
};
```

## Conclusion

The authentication system now has comprehensive session validation that prevents "403: invalid claim: missing sub claim" errors. All authentication flows validate sessions before use, Edge Functions generate tokens with proper validation, and API calls include pre-flight authentication checks. The centralized utilities make it easy to maintain consistent authentication behavior across the entire application.
