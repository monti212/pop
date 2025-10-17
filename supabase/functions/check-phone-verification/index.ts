import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Twilio configuration
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_VERIFY_SERVICE_SID = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

// Supabase configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to validate phone number format
function validatePhoneNumber(phoneNumber: string): { valid: boolean; normalized?: string; error?: string } {
  try {
    // Remove ALL non-digit characters except the leading plus sign
    let normalized = phoneNumber.trim();

    // Remove everything except digits
    const digitsOnly = normalized.replace(/\D/g, '');

    // Reconstruct with plus sign
    normalized = '+' + digitsOnly;

    console.log(`[Validation] Original: "${phoneNumber}" -> Normalized: "${normalized}"`);

    // Validation: should be + followed by 7-15 digits
    const phoneRegex = /^\+\d{7,15}$/;

    if (!phoneRegex.test(normalized)) {
      console.error(`[Validation] Failed regex test. Length: ${normalized.length}, Digits: ${digitsOnly.length}`);
      return {
        valid: false,
        error: 'That phone number format doesn\'t look right. Try international format like +267 72123456'
      };
    }

    // Country-specific validation for common issues
    // Botswana: +267 followed by 7-8 digits
    if (normalized.startsWith('+267')) {
      const localPart = normalized.substring(4);
      if (localPart.length < 7 || localPart.length > 8) {
        console.error(`[Validation] Botswana number has invalid length: ${localPart.length} digits`);
        return {
          valid: false,
          error: 'Botswana phone numbers should have 7-8 digits after the country code (+267)'
        };
      }
    }

    console.log(`[Validation] Phone number validated successfully: ${normalized}`);

    return {
      valid: true,
      normalized
    };
  } catch (error) {
    console.error('[Validation] Exception during validation:', error);
    return {
      valid: false,
      error: 'Invalid phone number format'
    };
  }
}

// Helper function to check verification code with Twilio
async function checkTwilioVerification(phoneNumber: string, code: string): Promise<{
  success: boolean;
  valid?: boolean;
  error?: string;
}> {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
      console.error('Missing Twilio environment variables for verification check');
      throw new Error('Phone service configuration is missing');
    }

    console.log(`Checking verification code for: ${phoneNumber}`);

    // Ensure credentials are properly trimmed (remove any whitespace)
    const accountSid = TWILIO_ACCOUNT_SID.trim();
    const authToken = TWILIO_AUTH_TOKEN.trim();
    const verifySid = TWILIO_VERIFY_SERVICE_SID.trim();

    const auth = btoa(`${accountSid}:${authToken}`);

    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'To': phoneNumber,
          'Code': code
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Twilio Verify Check API error:', errorData);
      console.error('Response status:', response.status);

      if (response.status === 401) {
        console.error('Twilio 401 Authentication Error during verification check');
        console.error('Account SID format:', accountSid.substring(0, 2), '(should be AC)');
        console.error('Verify Service format:', verifySid.substring(0, 2), '(should be VA)');
        throw new Error('Phone service authentication failed');
      } else if (response.status === 404) {
        throw new Error('Verification not found or expired');
      }

      throw new Error(`Twilio Verify Check error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Verification check result:', data.status);

    return {
      success: true,
      valid: data.status === 'approved'
    };
  } catch (error: any) {
    console.error('Error checking phone verification:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to find existing user by phone number
async function findUserByPhone(phoneNumber: string): Promise<{
  found: boolean;
  userId?: string;
  error?: string;
}> {
  try {
    // First check user_profiles table
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (profileError) {
      console.error('Error checking user_profiles:', profileError);
      // Continue to check auth.users as fallback
    }

    if (profile) {
      return { found: true, userId: profile.id };
    }

    // If not found in user_profiles, check auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error listing auth users:', authError);
      return { found: false, error: authError.message };
    }

    const userWithPhone = authUsers.users?.find(user => 
      user.phone === phoneNumber || 
      user.user_metadata?.phone === phoneNumber
    );

    if (userWithPhone) {
      return { found: true, userId: userWithPhone.id };
    }

    return { found: false };
  } catch (error: any) {
    console.error('Error finding user by phone:', error);
    return { found: false, error: error.message };
  }
}

// Helper function to create new user with phone number
async function createUserWithPhone(phoneNumber: string): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
}> {
  try {
    const userId = crypto.randomUUID();
    
    // Create auth user with phone number
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      user_id: userId,
      phone: phoneNumber,
      phone_confirmed: true,
      user_metadata: {
        phone: phoneNumber,
        via_phone_verification: true
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      
      // If phone already exists, try to find the existing user
      if (authError.message?.includes('Phone number already registered')) {
        console.log('Phone already registered, finding existing user...');
        const findResult = await findUserByPhone(phoneNumber);
        if (findResult.found && findResult.userId) {
          return { success: true, userId: findResult.userId };
        }
      }
      
      throw authError;
    }

    // Create user profile (the handle_new_user trigger should do this, but let's ensure it)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        phone_number: phoneNumber,
        display_name: `User (${phoneNumber.slice(-4)})`,
        subscription_tier: 'free'
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      // Don't fail if profile creation fails - the auth user was created successfully
    }

    console.log(`Created new user: ${userId} for phone: ${phoneNumber}`);
    return { success: true, userId };
  } catch (error: any) {
    console.error('Error creating user with phone:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to generate session for user
async function generateUserSession(userId: string): Promise<{
  success: boolean;
  session?: any;
  error?: string;
}> {
  try {
    // Generate a sign-in link/session for the user
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: undefined,
      password: undefined,
      options: {
        data: {
          phone_verified: true
        }
      }
    });

    if (error) {
      console.error('Error generating session:', error);
      
      // Alternative approach: create a custom JWT token
      const customToken = {
        sub: userId,
        aud: 'authenticated',
        role: 'authenticated',
        phone_verified: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
      };
      
      return {
        success: true,
        session: {
          access_token: btoa(JSON.stringify(customToken)),
          user_id: userId,
          phone_verified: true
        }
      };
    }

    return {
      success: true,
      session: data
    };
  } catch (error: any) {
    console.error('Error generating user session:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'That request method isn\'t quite right. Try POST?' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parse request body
    const { phone_number, code } = await req.json();

    if (!phone_number || !code) {
      return new Response(JSON.stringify({ 
        error: 'I need both your phone number and that verification code to continue.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate phone number format
    const phoneValidation = validatePhoneNumber(phone_number);
    if (!phoneValidation.valid) {
      return new Response(JSON.stringify({ 
        error: phoneValidation.error 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedPhone = phoneValidation.normalized!;

    // Check if there's a pending verification for this phone number
    const { data: verification, error: verificationError } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verificationError) {
      console.error('Error checking verification record:', verificationError);
      return new Response(JSON.stringify({ 
        error: 'I couldn\'t check your verification status. Want to try again?' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!verification) {
      return new Response(JSON.stringify({ 
        error: 'I can\'t find a pending verification for that number. Need a new code?' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check verification code with Twilio
    const twilioResult = await checkTwilioVerification(normalizedPhone, code);

    if (!twilioResult.success) {
      // Update verification status to failed
      await supabase
        .from('phone_verifications')
        .update({ status: 'failed' })
        .eq('id', verification.id);

      return new Response(JSON.stringify({ 
        error: twilioResult.error || 'I couldn\'t verify that code. Want to try again?' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!twilioResult.valid) {
      // Update verification status to failed
      await supabase
        .from('phone_verifications')
        .update({ status: 'failed' })
        .eq('id', verification.id);

      return new Response(JSON.stringify({ 
        error: 'That verification code doesn\'t look right. Mind checking it and trying again?' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verification successful - update status
    const { error: updateError } = await supabase
      .from('phone_verifications')
      .update({ status: 'approved' })
      .eq('id', verification.id);

    if (updateError) {
      console.error('Error updating verification status:', updateError);
      // Continue anyway - verification was successful
    }

    // Check if user already exists
    const userResult = await findUserByPhone(normalizedPhone);
    
    let userId: string;
    let isNewUser = false;

    if (userResult.found && userResult.userId) {
      userId = userResult.userId;
      console.log(`Existing user found: ${userId}`);
    } else {
      // Create new user
      const createResult = await createUserWithPhone(normalizedPhone);
      
      if (!createResult.success) {
        return new Response(JSON.stringify({ 
          error: createResult.error || 'I couldn\'t set up your account. Want to try again?' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      userId = createResult.userId!;
      isNewUser = true;
      console.log(`New user created: ${userId}`);
    }

    // Generate session for the user
    const sessionResult = await generateUserSession(userId);
    
    if (!sessionResult.success) {
      return new Response(JSON.stringify({ 
        error: sessionResult.error || 'I couldn\'t create your session. Try again?' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      user_id: userId,
      is_new_user: isNewUser,
      phone_number: normalizedPhone,
      session: sessionResult.session,
      message: isNewUser ? 'Account created successfully' : 'Logged in successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in check-phone-verification:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Something unexpected happened during phone verification. Try again?'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});