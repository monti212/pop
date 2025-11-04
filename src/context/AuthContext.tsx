import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { getCurrentUser, onAuthStateChange, UserProfile, supabase } from '../services/authService';
import { withTimeout, AUTH_TIMEOUT } from '../utils/timeout';
import { logger } from '../utils/logger';
import { validateSession } from '../utils/sessionValidator';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  profileError: string | null;
  isLoading: boolean;
  loading: boolean; // Added alias for isLoading for backwards compatibility
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const CACHE_KEY = 'uhuru_auth_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours for persistent sessions

interface AuthCache {
  user: User | null;
  profile: UserProfile | null;
  timestamp: number;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getCachedAuth = (): AuthCache | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: AuthCache = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          return parsed;
        }
      }
    } catch (error) {
      logger.warn('Failed to read auth cache:', error);
    }
    return null;
  };

  const setCachedAuth = (user: User | null, profile: UserProfile | null) => {
    try {
      const cache: AuthCache = { user, profile, timestamp: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      logger.warn('Failed to cache auth:', error);
    }
  };

  const cachedAuth = getCachedAuth();
  const [user, setUser] = useState<User | null>(cachedAuth?.user || null);
  const [profile, setProfile] = useState<UserProfile | null>(cachedAuth?.profile || null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!cachedAuth);

  const refreshProfile = async () => {
    logger.debug('Refreshing user profile...');
    if (!user) {
      setProfile(null);
      setProfileError(null);
      return;
    }

    try {
      const authUser = await withTimeout(
        getCurrentUser(),
        AUTH_TIMEOUT,
        'Profile refresh timed out'
      );
      setProfileError(null);
      logger.debug('Refreshed profile data:', authUser.profile);
      setProfile(authUser.profile);
      setCachedAuth(user, authUser.profile);
    } catch (error: any) {
      logger.error('Error refreshing profile:', error);
      setProfileError(error.message);

      if (error.message && error.message.includes('Failed to fetch')) {
        logger.info('Network error during auth setup, using offline mode');
        setUser(null);
        setProfile(null);
      }

      setProfile(null);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      if (cachedAuth) {
        logger.debug('Using cached auth, loading in background');
        setIsLoading(false);
      }

      try {
        // First, validate the current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          logger.error('Session error during initialization:', sessionError);
          throw sessionError;
        }

        if (sessionData.session) {
          const validation = validateSession(sessionData.session);

          if (!validation.valid) {
            logger.error('Cached session is invalid:', validation.errors);
            // Clear invalid session
            try {
              const keysToRemove: string[] = [];
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('supabase') && key.includes('auth')) {
                  keysToRemove.push(key);
                }
              }
              keysToRemove.forEach(key => localStorage.removeItem(key));
              await supabase.auth.signOut();
            } catch (clearError) {
              logger.warn('Failed to clear invalid session:', clearError);
            }

            setUser(null);
            setProfile(null);
            localStorage.removeItem(CACHE_KEY);
            setIsLoading(false);
            return;
          }

          logger.debug('Session validated successfully');
        }

        const authUser = await withTimeout(
          getCurrentUser(),
          AUTH_TIMEOUT,
          'Authentication check timed out'
        );
        setUser(authUser.user);
        logger.debug('Initial profile data:', authUser.profile);
        setProfile(authUser.profile);
        setCachedAuth(authUser.user, authUser.profile);
      } catch (error: any) {
        logger.error('Error getting current user:', error);

        if (error.message && error.message.includes('Invalid Refresh Token')) {
          logger.warn('Invalid refresh token during initialization, clearing session...');
          try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.includes('supabase') && key.includes('auth')) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
          } catch (clearError) {
            logger.warn('Failed to clear localStorage:', clearError);
          }
        }

        setUser(null);
        setProfile(null);
        localStorage.removeItem(CACHE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    let unsubscribe = () => {};

    try {
      unsubscribe = onAuthStateChange((user) => {
        // Only update state if user actually changed (not just token refresh)
        setUser((prevUser) => {
          if (!user && !prevUser) return prevUser; // Both null, no change
          if (user && prevUser && user.id === prevUser.id) return prevUser; // Same user, no change

          // User changed, update state
          if (!user) {
            setProfile(null);
            localStorage.removeItem(CACHE_KEY);
          } else {
            logger.debug('Auth state changed to new user, refreshing profile for user:', user.id);
            // Use queueMicrotask to avoid blocking the render cycle
            queueMicrotask(() => {
              refreshProfile().catch((error) => {
                logger.error('Error refreshing profile after auth change:', error);

                if (error.message && error.message.includes('Invalid Refresh Token')) {
                  logger.warn('Invalid refresh token during profile refresh, clearing session...');
                  setUser(null);
                  setProfile(null);
                  localStorage.removeItem(CACHE_KEY);
                }
              });
            });
          }

          return user;
        });
      });
    } catch (error: any) {
      logger.error('Error setting up auth state listener:', error);
      if (error.message && error.message.includes('Invalid Refresh Token')) {
        setUser(null);
        setProfile(null);
        localStorage.removeItem(CACHE_KEY);
      }
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const value = {
    user,
    profile,
    profileError,
    isLoading,
    loading: isLoading, // Added alias for isLoading for backwards compatibility
    isAuthenticated: !!user,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;