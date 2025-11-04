import { createClient, User, UserResponse } from '@supabase/supabase-js';
import { validateSession, validateJWTClaims, waitForSessionReady, isJWTExpired as checkJWTExpired } from '../utils/sessionValidator';

// Helper function to clear Supabase auth tokens from localStorage
const clearSupabaseAuthTokens = () => {
  try {
    // Find and remove all Supabase auth-related items from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('supabase') && key.includes('auth')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to clear localStorage auth tokens:', error);
  }
};

// Get environment variables with validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Enhanced validation of environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('🔧 Missing Supabase environment variables. Please check your .env file.');
  console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  console.error('Current values:', {
    VITE_SUPABASE_URL: supabaseUrl || 'undefined',
    VITE_SUPABASE_ANON_KEY: supabaseKey ? `${supabaseKey.substring(0, 10)}...` : 'undefined'
  });
  console.error('🔧 To fix this:');
  console.error('1. Create a .env file in your project root if it doesn\'t exist');
  console.error('2. Add your Supabase credentials:');
  console.error('   VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('   VITE_SUPABASE_ANON_KEY=your-actual-anon-key');
  console.error('3. Restart your development server');
}

// Use the centralized JWT validation utilities from sessionValidator
const isJWTExpired = checkJWTExpired;

// Helper function to check if Supabase is properly configured
const isSupabaseConfigured = (): boolean => {
  // Check for missing or placeholder values
  const hasValidUrl = supabaseUrl &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseUrl !== 'your_supabase_url' &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseUrl !== 'https://your-project-ref.supabase.co' &&
    !supabaseUrl.includes('placeholder') &&
    supabaseUrl.includes('.supabase.co') &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.length > 30; // Real Supabase URLs are longer

  const hasValidKey = supabaseKey &&
    supabaseKey !== 'placeholder-key' &&
    supabaseKey !== 'your_supabase_anon_key' &&
    supabaseKey !== 'your-anon-key' &&
    !supabaseKey.includes('placeholder') &&
    !supabaseKey.includes('your-') &&
    supabaseKey.length > 50 && // Real Supabase anon keys are longer
    (supabaseKey.startsWith('eyJ') || supabaseKey.startsWith('sbp_')); // Valid Supabase key format

  // Check if JWT is not expired
  const isKeyNotExpired = hasValidKey && !isJWTExpired(supabaseKey);

  if (hasValidUrl && hasValidKey && !isKeyNotExpired) {
    console.error('❌ Supabase anonymous key has expired!');
    console.error('🔧 To fix this:');
    console.error('1. Go to your Supabase project dashboard: https://supabase.com/dashboard');
    console.error('2. Navigate to Settings → API');
    console.error('3. Copy the "anon/public" key (it should be a long JWT token)');
    console.error('4. Update VITE_SUPABASE_ANON_KEY in your .env file');
    console.error('5. Restart your development server');
  }

  return !!(hasValidUrl && isKeyNotExpired);
};

// Only initialize Supabase client if properly configured
export let supabase: any = null;

if (isSupabaseConfigured()) {
  console.log('✅ Supabase configuration valid, initializing client...');
  
  // Proactively clear any stale/invalid tokens before initializing client
  clearSupabaseAuthTokens();
  
  try {
    supabase = createClient(
      supabaseUrl!, 
      supabaseKey!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      }
    );
    
    // Add global error handler for auth errors
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('Token refresh failed, clearing local session...');
        clearSupabaseAuthTokens();
      }
    });
    
    console.log('✅ Supabase client initialized successfully');
  } catch (error: any) {
    console.error('❌ Error initializing Supabase client:', error);
    if (error.message && error.message.includes('Invalid Refresh Token')) {
      clearSupabaseAuthTokens();
    }
    // Set supabase to null so fallback mock client is used
    supabase = null;
  }
} else {
  console.error('❌ Supabase is not properly configured. Using mock client.');
  console.error('📋 Configuration checklist:');
  console.error('   □ VITE_SUPABASE_URL should start with https:// and end with .supabase.co');
  console.error('   □ VITE_SUPABASE_ANON_KEY should be a long string starting with eyJ');
  console.error('   □ Values should not contain "placeholder", "your-project", or "example"');
  console.error('   □ .env file should exist in project root directory');
  console.error('   □ Development server should be restarted after .env changes');

  // Create a mock client that returns helpful error messages
  console.warn('🔧 Supabase is not properly configured. Please check your .env file.');
  console.warn('Current values:', {
    url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing',
    key: supabaseKey ? `${supabaseKey.substring(0, 10)}...` : 'missing'
  });
  
  const configErrorMessage = supabaseKey && isJWTExpired(supabaseKey)
    ? 'Your authentication key has expired. Please update your .env file with a fresh key from your Supabase dashboard.'
    : 'Supabase authentication is not properly configured. Please check your .env file.';

  supabase = {
    auth: {
      signUp: () => Promise.resolve({ data: null, error: { message: configErrorMessage } }),
      signInWithPassword: () => Promise.resolve({ data: null, error: { message: configErrorMessage } }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      onAuthStateChange: (callback) => {
        // Call callback immediately with null user for mock mode
        setTimeout(() => callback('SIGNED_OUT', null), 0);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signOut: () => Promise.resolve({ error: null }),
      resetPasswordForEmail: () => Promise.resolve({ error: { message: configErrorMessage } }),
      updateUser: () => Promise.resolve({ error: { message: configErrorMessage } }),
      signInWithOAuth: () => Promise.resolve({ data: null, error: { message: configErrorMessage } })
    },
    from: (table) => ({
      select: (columns) => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          order: () => Promise.resolve({ data: [], error: null })
        }),
        in: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
        order: () => Promise.resolve({ data: [], error: null }),
        gte: () => Promise.resolve({ data: [], error: null }),
        lt: () => Promise.resolve({ data: [], error: null }),
        neq: () => ({ 
          single: () => Promise.resolve({ data: null, error: null }),
          order: () => Promise.resolve({ data: [], error: null })
        })
      }),
      insert: (data) => ({ 
        select: () => ({ 
          single: () => Promise.resolve({ data: null, error: null })
        }),
        eq: () => Promise.resolve({ data: null, error: null })
      }),
      update: (data) => ({ 
        eq: () => Promise.resolve({ data: null, error: null })
      }),
      delete: () => ({ 
        eq: () => Promise.resolve({ data: null, error: null }) 
      }),
      upsert: (data, options) => ({ 
        select: () => ({ 
          single: () => Promise.resolve({ data: null, error: null }) 
        }) 
      })
    })
  };
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  team_role?: 'optimus_prime' | 'prime' | 'autobot' | 'free';
  daily_message_count?: number;
  daily_image_count?: number;
  created_at: string;
  last_active_at: string;
  subscription_start?: string | null;
  subscription_end?: string | null;
  last_subscription_change_at?: string | null;
}

export type TeamRoleEnum = 'optimus_prime' | 'prime' | 'autobot' | 'free';

export interface AuthUser {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
}

// Sign up with email and password
export const signUp = async (
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: string; user?: User }> => {
  if (!isSupabaseConfigured()) {
    // Check if it's specifically a JWT expiration issue
    if (supabaseKey && isJWTExpired(supabaseKey)) {
      return {
        success: false,
        error: "Your authentication key has expired. Please contact support or update your configuration with a fresh key from the Supabase dashboard."
      };
    }
    return {
      success: false,
      error: "The sign-up service is not properly configured. Please check your connection or contact support."
    };
  }

  if (!supabase) {
    return {
      success: false,
      error: 'Something\'s not quite right on my end. Let me sort this out – try again in a moment?'
    };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        }
      }
    });

    if (error) throw error;
    
    // Wait for the database trigger to create the user profile automatically
    // The handle_new_user trigger should create the profile, but we'll add a fallback
    if (data.user) {
      // Wait a moment for the trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if profile was created by the trigger, if not create it manually as fallback
      try {
        const { data: existingProfile, error: checkError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();
        
        // If no profile exists and no error checking, create it manually
        if (!checkError && !existingProfile) {
          console.log('Profile not created by trigger, creating manually...');
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              display_name: name
            });
          
          if (profileError) {
            console.error('Error creating user profile manually:', profileError);
            // Don't throw error, just log it as auth was successful
          }
        }
      } catch (profileError) {
        console.warn('Profile creation check/fallback failed, continuing with auth success:', profileError);
      }
      
      return { success: true, user: data.user };
    }
    
    return { success: true, user: data.user || undefined };
  } catch (error: any) {
    console.error('Error signing up:', error);
    
    // Provide more helpful error messages
    if (error.message && error.message.includes('fetch')) {
      return {
        success: false,
        error: "I can't seem to connect right now. Is your internet working okay?"
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'I\'m having trouble setting up your account. Let me try that again?'
    };
  }
};

// Sign in with email and password
export const signIn = async (
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> => {
  if (!isSupabaseConfigured()) {
    // Check if it's specifically a JWT expiration issue
    if (supabaseKey && isJWTExpired(supabaseKey)) {
      return {
        success: false,
        error: "Your authentication key has expired. Please contact support or update your configuration with a fresh key from the Supabase dashboard."
      };
    }
    return {
      success: false,
      error: "The sign-in service is not properly configured. Please check your connection or contact support."
    };
  }

  if (!supabase) {
    return {
      success: false,
      error: 'Hmm, something\'s not working as expected. Mind trying again?'
    };
  }

  try {
    let data, error;
    
    try {
      const result = await supabase.auth.signInWithPassword({
        email,
        password
      });
      data = result.data;
      error = result.error;
    } catch (authError: any) {
      // Handle refresh token errors specifically
      if (authError.message && authError.message.includes('Invalid Refresh Token: Refresh Token Not Found')) {
        console.warn('Invalid refresh token detected during sign in, clearing session...');
        clearSupabaseAuthTokens();
        await supabase.auth.signOut();
        // Return error instead of retrying
        return {
          success: false,
          error: "I'm having connection issues. Could you check your internet and try again?"
        };
      } else {
        throw authError;
      }
    }

    if (error) throw error;

    // Update last_active_at for the logged-in user
    if (data.user) {
      const { error: updateProfileError } = await supabase
        .from('user_profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', data.user.id);

      if (updateProfileError) {
        console.error('Error updating last_active_at:', updateProfileError);
        // Log the error but don't prevent login success
      }
    }

    return { success: true, user: data.user };
  } catch (error: any) {
    console.error('Error signing in:', error);
    
    // Handle refresh token errors in caught errors
    if (error.message && error.message.includes('Invalid Refresh Token: Refresh Token Not Found')) {
      clearSupabaseAuthTokens();
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Looks like you\'ve been away for a while. Mind signing in again?'
      };
    }
    
    // If this is a trigger exception, pass it through
    if (error.message && (
      error.message.includes("Subscription change rejected") || 
      error.message.includes("only one change per month") ||
      error.message.includes("subscription period ends")
    )) {
      return { 
        success: false, 
        error: error.message
      };
    }
    
    // Provide more helpful error messages for common issues
    if (error.message && error.message.includes('fetch')) {
      return {
        success: false,
        error: "I'm having connection issues. Could you check your internet and try again?"
      };
    }
    
    if (error.message && error.message.includes('Invalid login credentials')) {
      return {
        success: false,
        error: 'Those login details don\'t look right. Mind double-checking them?'
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Those details don\'t seem right. Could you double-check and try again?'
    };
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  // Always clear local auth tokens first
  clearSupabaseAuthTokens();
  
  if (!isSupabaseConfigured()) {
    console.warn('Something\'s not configured properly. I can\'t sign you out right now.');
    return;
  }

  if (!supabase) {
    console.warn('I\'m having trouble with the sign-out process, but I\'ve cleared your local session.');
    return;
  }

  try {
    await supabase.auth.signOut();
  } catch (error: any) {
    // Handle cases where the server session doesn't exist or is invalid
    // This can happen when the session has already expired or been invalidated
    console.warn('Error during sign out:', error);
    
    // Even if the server-side logout fails, we still want to clear the local session
    // The user should be logged out from the client perspective regardless
  }
};

// Get current user
export const getCurrentUser = async (): Promise<AuthUser> => {
  if (!isSupabaseConfigured()) {
    return { user: null, profile: null, isLoading: false };
  }

  if (!supabase) {
    return { user: null, profile: null, isLoading: false };
  }

  try {
    // Additional check to prevent fetch attempts with invalid URLs
    if (!supabaseUrl.includes('supabase.co')) {
      return { user: null, profile: null, isLoading: false };
    }

    // First check if we have a valid session using the session validator
    let session, sessionError;

    try {
      // Wrap in additional try-catch to handle network errors
      const result = await supabase.auth.getSession();
      session = result.data.session;
      sessionError = result.error;

      // Validate session has required claims
      if (session) {
        const validation = validateSession(session);
        if (!validation.valid) {
          console.error('Session validation failed:', validation.errors);
          // Clear invalid session
          clearSupabaseAuthTokens();
          await supabase.auth.signOut();
          return { user: null, profile: null, isLoading: false };
        }
      }
    } catch (error: any) {
      // Handle network/fetch errors specifically
      if (error.message && (
        error.message.includes('Failed to fetch') || 
        error.message.includes('fetch') ||
        error.message.includes('NetworkError') ||
        error.name === 'TypeError'
      )) {
        console.warn('Network error when getting session:', error.message);
        return { user: null, profile: null, isLoading: false };
      }
      
      // Handle refresh token errors specifically
      if (error.message && error.message.includes('Invalid Refresh Token: Refresh Token Not Found')) {
        console.warn('Invalid session detected, clearing...');
        clearSupabaseAuthTokens();
        await supabase.auth.signOut();
        return { user: null, profile: null, isLoading: false };
      }
      throw error;
    }
    
    if (sessionError) {
      // Handle refresh token errors in the session error
      if (sessionError.message && sessionError.message.includes('Invalid Refresh Token: Refresh Token Not Found')) {
        console.warn('Invalid session detected in session error, clearing...');
        clearSupabaseAuthTokens();
        await supabase.auth.signOut();
        return { user: null, profile: null, isLoading: false };
      }
      console.error('Session error:', sessionError);
      return { user: null, profile: null, isLoading: false };
    }
    
    if (!session || !session.user) {
      return { user: null, profile: null, isLoading: false };
    }
    
    // Get the current user from the session
    const user = session.user;
    
    // Only try to fetch profile if we have an authenticated user
    if (!user || !user.id) {
      return { user: null, profile: null, isLoading: false };
    }
    
    try {
      // Get user profile - using maybeSingle() instead of single()
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        // If it's a permission error, just return user without profile
        if (error.code === '42501' || error.message.includes('permission denied')) {
          console.warn('Permission denied accessing user profile');
          return { user, profile: null, isLoading: false };
        }
        console.error('Error fetching user profile:', error);
        return { user, profile: null, isLoading: false };
      }
      
      // If profile doesn't exist, try to create it using upsert to avoid duplicate key errors
      if (!profile) {
        try {
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .upsert({
              id: user.id,
             display_name: user.user_metadata.name || null,
             subscription_tier: 'free',
             team_role: determineTeamRole(user.email || '')
            }, {
              onConflict: 'id'
            })
            .select()
            .single();
          
          if (createError) {
            console.error('Error creating user profile:', createError);
            return { user, profile: null, isLoading: false };
          }
          
          return { 
            user, 
            profile: newProfile as UserProfile,
            isLoading: false 
          };
        } catch (createError) {
          console.error('Failed to create user profile:', createError);
          return { user, profile: null, isLoading: false };
        }
      }
      
      // Handle existing users who don't have a subscription_tier set (legacy accounts)
      if (!profile.subscription_tier) {
        console.log('Setting default subscription tier for existing user:', user.id);
        try {
          const { data: updatedProfile, error: updateError } = await supabase
            .from('user_profiles')
            .update({ 
              subscription_tier: 'free',
              team_role: determineTeamRole(user.email || '')
            })
            .eq('id', user.id)
            .select()
            .single();
          
          if (updateError) {
            console.error('Error updating subscription tier for existing user:', updateError);
            // Still return the profile with a default subscription_tier
            return { 
              user, 
              profile: { ...profile, subscription_tier: 'free' } as UserProfile,
              isLoading: false 
            };
          }
          
          return { 
            user, 
            profile: updatedProfile as UserProfile,
            isLoading: false 
          };
        } catch (updateError) {
          console.error('Failed to update subscription tier for existing user:', updateError);
          // Still return the profile with a default subscription_tier
          return { 
            user, 
            profile: { ...profile, subscription_tier: 'free' } as UserProfile,
            isLoading: false 
          };
        }
      }
      
      return { 
        user, 
        profile: profile as UserProfile,
        isLoading: false 
      };
    } catch (profileError: any) {
      console.error('Error handling user profile:', profileError);
      // Return user even if profile operations fail
      return { user, profile: null, isLoading: false };
    }
  } catch (error) {
    console.error('Error getting current user:', error);
    return { user: null, profile: null, isLoading: false };
  }
};

// Listen for auth state changes
export const onAuthStateChange = (
  callback: (user: User | null) => void
) => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase is not configured. Cannot listen for auth state changes.');
    // Return a no-op unsubscribe function
    return () => {};
  }

  if (!supabase) {
    console.warn('Supabase client not initialized. Cannot listen for auth state changes.');
    return () => {};
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
  
  return () => {
    data.subscription.unsubscribe();
  };
};

// Reset password
export const resetPassword = async (
  email: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "The email checking service is being a bit temperamental. Try again in a moment?"
    };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error resetting password:', error);
    
    if (error.message && error.message.includes('fetch')) {
      return {
        success: false,
        error: "I can't connect right now. Could you check your internet connection?"
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'I\'m having trouble sending that reset email. Let me try again?'
    };
  }
};

// Change password
export const changePassword = async (
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Something\'s not working right now. Give me a moment to sort this out?'
    };
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error changing password:', error);
    
    if (error.message && error.message.includes('fetch')) {
      return {
        success: false,
        error: "I can't seem to connect. Is your internet working okay?"
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'I\'m having trouble updating your password. Mind trying that again?'
    };
  }
};

// Check if email exists
export const checkEmailExists = async (
  email: string
): Promise<{ exists: boolean; error?: string }> => {
  if (!isSupabaseConfigured()) {
    return {
      exists: false,
      error: "The email checking service is being a bit temperamental. Try again in a moment?"
    };
  }

  try {
    // This is just a simple way to check if an email exists
    // A more robust solution would use a server-side function for this check
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false
      }
    });
    
    if (error && error.message.includes("User not found")) {
      return { exists: false };
    }
    
    // If we get here, the email likely exists
    return { exists: true };
  } catch (error: any) {
    console.error('Error checking email:', error);
    
    if (error.message && error.message.includes('fetch')) {
      return {
        exists: false,
        error: "I can't connect to check that email right now. Internet issues perhaps?"
      };
    }
    
    return { 
      exists: false, 
      error: error.message || 'I\'m having trouble checking that email. Let me try again?'
    };
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "The Google sign-in service is having a moment. Try again shortly?"
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error signing in with Google:', error);
    
    if (error.message && error.message.includes('fetch')) {
      return {
        success: false,
        error: "I can't connect to Google right now. Internet troubles?"
      };
    }
    
    return {
      success: false,
      error: error.message || 'Google sign-in isn\'t cooperating right now. Want to try again?'
    };
  }
};

// Helper function to determine team role based on email
const determineTeamRole = (email: string): TeamRoleEnum => {
  return 'free';
};