/**
 * API Guard Utility
 *
 * Provides pre-flight checks for authenticated API requests to prevent
 * "403: invalid claim: missing sub claim" errors by validating session
 * state before making requests to Supabase or Edge Functions.
 */

import { supabase } from '../services/authService';
import { validateSession, isSessionNearExpiry } from './sessionValidator';
import { logger } from './logger';

export interface ApiGuardResult {
  allowed: boolean;
  error?: string;
  userId?: string;
  shouldRefresh?: boolean;
}

/**
 * Pre-flight check before making authenticated API requests
 * Validates that the current session is valid and has required claims
 */
export async function checkAuthBeforeApiCall(options: {
  requireAuth?: boolean;
  operation?: string;
  refreshIfNeeded?: boolean;
} = {}): Promise<ApiGuardResult> {
  const {
    requireAuth = true,
    operation = 'API call',
    refreshIfNeeded = true
  } = options;

  try {
    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      logger.error(`[ApiGuard] Session error before ${operation}:`, sessionError);
      return {
        allowed: false,
        error: 'Authentication error. Please sign in again.'
      };
    }

    const session = sessionData.session;

    // If auth is not required and no session exists, allow the call
    if (!requireAuth && !session) {
      return { allowed: true };
    }

    // If auth is required but no session, deny
    if (requireAuth && !session) {
      logger.warn(`[ApiGuard] No session for authenticated ${operation}`);
      return {
        allowed: false,
        error: 'Please sign in to continue.'
      };
    }

    // Validate session has required claims
    if (session) {
      const validation = validateSession(session);

      if (!validation.valid) {
        logger.error(`[ApiGuard] Invalid session for ${operation}:`, validation.errors);

        // Clear invalid session
        try {
          await supabase.auth.signOut();
          logger.info('[ApiGuard] Cleared invalid session');
        } catch (signOutError) {
          logger.warn('[ApiGuard] Failed to sign out invalid session:', signOutError);
        }

        return {
          allowed: false,
          error: 'Your session is invalid. Please sign in again.'
        };
      }

      // Check if session is near expiry and should be refreshed
      if (refreshIfNeeded && isSessionNearExpiry(session, 300)) { // 5 minutes
        logger.info(`[ApiGuard] Session near expiry for ${operation}, requesting refresh`);

        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError) {
            logger.error('[ApiGuard] Session refresh failed:', refreshError);
            return {
              allowed: false,
              error: 'Your session has expired. Please sign in again.',
              shouldRefresh: true
            };
          }

          if (refreshData.session) {
            logger.info('[ApiGuard] Session refreshed successfully');
            // Validate refreshed session
            const refreshedValidation = validateSession(refreshData.session);
            if (!refreshedValidation.valid) {
              logger.error('[ApiGuard] Refreshed session is invalid:', refreshedValidation.errors);
              return {
                allowed: false,
                error: 'Session refresh failed. Please sign in again.'
              };
            }
          }
        } catch (refreshError) {
          logger.error('[ApiGuard] Exception during session refresh:', refreshError);
          return {
            allowed: false,
            error: 'Failed to refresh session. Please sign in again.'
          };
        }
      }

      // All checks passed
      const userId = validation.user?.id;
      if (!userId) {
        logger.error(`[ApiGuard] Session valid but no user ID for ${operation}`);
        return {
          allowed: false,
          error: 'Authentication error. Please sign in again.'
        };
      }

      logger.debug(`[ApiGuard] Session validated for ${operation}, user: ${userId}`);
      return {
        allowed: true,
        userId
      };
    }

    // Fallback - should not reach here
    return {
      allowed: false,
      error: 'Authentication state unknown. Please sign in again.'
    };
  } catch (error: any) {
    logger.error(`[ApiGuard] Exception in checkAuthBeforeApiCall for ${operation}:`, error);
    return {
      allowed: false,
      error: error.message || 'Authentication check failed.'
    };
  }
}

/**
 * Higher-order function to wrap API calls with authentication guard
 * Usage: const result = await withAuthGuard(() => apiCall(), { operation: 'create conversation' });
 */
export async function withAuthGuard<T>(
  apiCall: () => Promise<T>,
  options: {
    requireAuth?: boolean;
    operation?: string;
    onError?: (error: string) => void;
  } = {}
): Promise<T | null> {
  const {
    requireAuth = true,
    operation = 'API call',
    onError
  } = options;

  // Pre-flight check
  const guardResult = await checkAuthBeforeApiCall({
    requireAuth,
    operation,
    refreshIfNeeded: true
  });

  if (!guardResult.allowed) {
    logger.error(`[ApiGuard] ${operation} blocked:`, guardResult.error);
    if (onError) {
      onError(guardResult.error || 'Authentication required');
    }
    return null;
  }

  // Execute API call
  try {
    return await apiCall();
  } catch (error: any) {
    // Check if error is auth-related
    if (error.message && (
      error.message.includes('missing sub claim') ||
      error.message.includes('invalid claim') ||
      error.message.includes('JWT')
    )) {
      logger.error(`[ApiGuard] Auth error during ${operation}:`, error.message);

      // Clear session and prompt re-auth
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        logger.warn('[ApiGuard] Failed to sign out after auth error:', signOutError);
      }

      if (onError) {
        onError('Your session is invalid. Please sign in again.');
      }
      return null;
    }

    // Re-throw non-auth errors
    throw error;
  }
}

/**
 * Get current user ID with validation
 * Safe helper that ensures session is valid before returning user ID
 */
export async function getValidatedUserId(): Promise<string | null> {
  const guardResult = await checkAuthBeforeApiCall({
    requireAuth: true,
    operation: 'get user ID'
  });

  if (!guardResult.allowed || !guardResult.userId) {
    return null;
  }

  return guardResult.userId;
}

/**
 * Check if user is authenticated with valid session
 */
export async function isAuthenticated(): Promise<boolean> {
  const guardResult = await checkAuthBeforeApiCall({
    requireAuth: false,
    operation: 'auth check'
  });

  return guardResult.allowed && !!guardResult.userId;
}
