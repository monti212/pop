/**
 * Session Validation Utility
 *
 * Centralized utilities to validate Supabase authentication sessions and JWT tokens.
 * Prevents "403: invalid claim: missing sub claim" errors by ensuring all sessions
 * contain required JWT claims before being used for authenticated requests.
 */

import { Session, User } from '@supabase/supabase-js';

export interface JWTClaims {
  sub?: string;
  aud?: string;
  role?: string;
  exp?: number;
  iat?: number;
  email?: string;
  phone?: string;
  [key: string]: any;
}

/**
 * Decode a JWT token without verification (for client-side validation only)
 * DO NOT use this for security-critical operations - server must verify tokens
 */
export function decodeJWT(token: string): JWTClaims | null {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[SessionValidator] Invalid JWT format: expected 3 parts, got', parts.length);
      return null;
    }

    const payload = parts[1];
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    );

    return decoded as JWTClaims;
  } catch (error) {
    console.error('[SessionValidator] Error decoding JWT:', error);
    return null;
  }
}

/**
 * Check if a JWT token has expired
 */
export function isJWTExpired(token: string): boolean {
  const claims = decodeJWT(token);

  if (!claims || !claims.exp) {
    console.warn('[SessionValidator] JWT missing expiration claim');
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  const isExpired = claims.exp <= now;

  if (isExpired) {
    const expiredAt = new Date(claims.exp * 1000);
    const expiredAgo = Math.floor((now - claims.exp) / 60); // minutes
    console.warn(`[SessionValidator] JWT expired ${expiredAgo} minutes ago at ${expiredAt.toISOString()}`);
  }

  return isExpired;
}

/**
 * Validate that a JWT token contains all required claims
 * The 'sub' claim (subject/user ID) is absolutely required
 */
export function validateJWTClaims(token: string): { valid: boolean; missingClaims: string[]; claims: JWTClaims | null } {
  const claims = decodeJWT(token);

  if (!claims) {
    return {
      valid: false,
      missingClaims: ['all_claims'],
      claims: null
    };
  }

  const requiredClaims = ['sub', 'aud', 'role', 'exp', 'iat'];
  const missingClaims: string[] = [];

  for (const claim of requiredClaims) {
    if (!claims[claim]) {
      missingClaims.push(claim);
    }
  }

  const isValid = missingClaims.length === 0;

  if (!isValid) {
    console.error('[SessionValidator] JWT missing required claims:', missingClaims);
    console.error('[SessionValidator] Available claims:', Object.keys(claims));
  }

  return {
    valid: isValid,
    missingClaims,
    claims
  };
}

/**
 * Comprehensive session validation
 * Checks if a session object is valid and contains required information
 */
export interface SessionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export function validateSession(session: Session | null): SessionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if session exists
  if (!session) {
    errors.push('Session is null or undefined');
    return {
      valid: false,
      errors,
      warnings,
      user: null,
      accessToken: null,
      refreshToken: null
    };
  }

  // Check if session has access_token
  if (!session.access_token) {
    errors.push('Session missing access_token');
  } else {
    // Validate access token format and claims
    const tokenValidation = validateJWTClaims(session.access_token);

    if (!tokenValidation.valid) {
      errors.push(`Access token missing required claims: ${tokenValidation.missingClaims.join(', ')}`);
    }

    // Check if access token is expired
    if (isJWTExpired(session.access_token)) {
      errors.push('Access token is expired');
    }
  }

  // Check if session has refresh_token
  if (!session.refresh_token) {
    warnings.push('Session missing refresh_token (may not be able to refresh)');
  }

  // Check if session has user object
  if (!session.user) {
    errors.push('Session missing user object');
  } else {
    // Validate user has ID
    if (!session.user.id) {
      errors.push('User object missing id');
    }

    // Check if user ID matches token sub claim
    if (session.access_token) {
      const claims = decodeJWT(session.access_token);
      if (claims && claims.sub && session.user.id !== claims.sub) {
        errors.push(`User ID mismatch: user.id=${session.user.id}, token.sub=${claims.sub}`);
      }
    }
  }

  const isValid = errors.length === 0;

  if (!isValid) {
    console.error('[SessionValidator] Session validation failed:', { errors, warnings });
  } else if (warnings.length > 0) {
    console.warn('[SessionValidator] Session validation succeeded with warnings:', warnings);
  }

  return {
    valid: isValid,
    errors,
    warnings,
    user: session.user || null,
    accessToken: session.access_token || null,
    refreshToken: session.refresh_token || null
  };
}

/**
 * Wait for session to be fully established with retries
 * Useful after setSession() calls to ensure the session is ready for use
 */
export async function waitForSessionReady(
  getSession: () => Promise<{ data: { session: Session | null }; error: any }>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    validateClaims?: boolean;
  } = {}
): Promise<{ session: Session | null; error: string | null }> {
  const {
    maxAttempts = 5,
    delayMs = 200,
    validateClaims = true
  } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[SessionValidator] Waiting for session (attempt ${attempt}/${maxAttempts})...`);

    const { data, error } = await getSession();

    if (error) {
      console.error(`[SessionValidator] Error getting session on attempt ${attempt}:`, error);
      if (attempt === maxAttempts) {
        return { session: null, error: error.message || 'Failed to get session' };
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
      continue;
    }

    const session = data.session;

    if (!session) {
      console.warn(`[SessionValidator] No session on attempt ${attempt}`);
      if (attempt === maxAttempts) {
        return { session: null, error: 'Session not established after maximum attempts' };
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
      continue;
    }

    // Validate session has required claims
    if (validateClaims) {
      const validation = validateSession(session);

      if (!validation.valid) {
        console.error(`[SessionValidator] Session invalid on attempt ${attempt}:`, validation.errors);
        if (attempt === maxAttempts) {
          return {
            session: null,
            error: `Session validation failed: ${validation.errors.join(', ')}`
          };
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
    }

    console.log(`[SessionValidator] Session ready on attempt ${attempt}`);
    return { session, error: null };
  }

  return { session: null, error: 'Session establishment timeout' };
}

/**
 * Extract user ID from session with fallbacks
 */
export function getUserIdFromSession(session: Session | null): string | null {
  if (!session) {
    return null;
  }

  // Priority 1: User object ID
  if (session.user?.id) {
    return session.user.id;
  }

  // Priority 2: Extract from access token
  if (session.access_token) {
    const claims = decodeJWT(session.access_token);
    if (claims?.sub) {
      console.warn('[SessionValidator] User ID extracted from token sub claim (user object missing)');
      return claims.sub;
    }
  }

  console.error('[SessionValidator] Could not extract user ID from session');
  return null;
}

/**
 * Check if a session is about to expire (within threshold)
 */
export function isSessionNearExpiry(session: Session | null, thresholdSeconds: number = 300): boolean {
  if (!session || !session.access_token) {
    return true;
  }

  const claims = decodeJWT(session.access_token);
  if (!claims || !claims.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = claims.exp - now;

  return expiresIn < thresholdSeconds;
}

/**
 * Get time until session expiry
 */
export function getSessionTimeToExpiry(session: Session | null): { seconds: number; expired: boolean } | null {
  if (!session || !session.access_token) {
    return null;
  }

  const claims = decodeJWT(session.access_token);
  if (!claims || !claims.exp) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const seconds = claims.exp - now;
  const expired = seconds <= 0;

  return { seconds: Math.max(0, seconds), expired };
}
