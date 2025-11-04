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
    // Remove any whitespace, dashes, parentheses
    let normalized = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Ensure it starts with +
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }

    // Basic validation: should be + followed by 7-15 digits
    const phoneRegex = /^\+\d{7,15}$/;

    if (!phoneRegex.test(normalized)) {
      return {
        valid: false,
        error: 'That phone number format doesn\'t look right. Try international format like +267 1234567?'
      };
    }

    return {
      valid: true,
      normalized
    };
  } catch (error) {
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
        throw new Error('Phone service authentication failed');
      } else if (response.status === 404) {
        throw new Error('Verification not found or expired');
      }

      throw new Error(`Twilio Verify Check error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Verification check result:', data.status);

    // Check for multiple possible success statuses
    const isValid = data.status === 'approved' || data.valid === true;

    return {
      success: true,
      valid: isValid
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
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] ===== CHECK PHONE VERIFICATION REQUEST =====`);
  console.log(`[${requestId}] Method:`, req.method);
  console.log(`[${requestId}] URL:`, req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] Handling CORS preflight`);
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    console.error(`[${requestId}] Invalid method:`, req.method);
    return new Response(JSON.stringify({ error: 'That request method isn\'t quite right. Try POST?' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parse request body
    const requestText = await req.text();
    console.log(`[${requestId}] Raw request body:`, requestText);

    const requestBody = JSON.parse(requestText);
    console.log(`[${requestId}] Parsed request body:`, requestBody);

    const { phone_number, code, merge_accounts } = requestBody;
    console.log(`[${requestId}] Phone:`, phone_number, 'Code length:', code?.length, 'Merge:', merge_accounts);

    if (!phone_number || !code) {
      console.error(`[${requestId}] Missing required fields - phone:`, !!phone_number, 'code:', !!code);
      return new Response(JSON.stringify({
        error: 'I need both your phone number and that verification code to continue.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate phone number format
    console.log(`[${requestId}] Validating phone number...`);
    const phoneValidation = validatePhoneNumber(phone_number);
    console.log(`[${requestId}] Validation result:`, phoneValidation);

    if (!phoneValidation.valid) {
      console.error(`[${requestId}] Invalid phone number:`, phoneValidation.error);
      return new Response(JSON.stringify({
        error: phoneValidation.error
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedPhone = phoneValidation.normalized!;
    console.log(`[${requestId}] Normalized phone:`, normalizedPhone);

    // First, expire old pending verifications
    console.log(`[${requestId}] Expiring old pending verifications...`);
    await supabase
      .from('phone_verifications')
      .update({ status: 'expired' })
      .eq('phone_number', normalizedPhone)
      .eq('status', 'pending')
      .lte('expires_at', new Date().toISOString());

    // Check if there's an active (not expired) pending verification for this phone number
    console.log(`[${requestId}] Checking for active pending verification...`);
    const { data: verification, error: verificationError } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log(`[${requestId}] Verification lookup result:`, { verification, verificationError });

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
        error: 'I can\'t find an active verification for that number. The code may have expired. Need a new code?'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if verification has expired
    if (new Date(verification.expires_at) <= new Date()) {
      console.log(`[${requestId}] Verification has expired`);
      await supabase
        .from('phone_verifications')
        .update({ status: 'expired' })
        .eq('id', verification.id);

      return new Response(JSON.stringify({
        error: 'That verification code has expired. Please request a new one.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check verification code with Twilio
    console.log(`[${requestId}] Checking verification code with Twilio...`);
    const twilioResult = await checkTwilioVerification(normalizedPhone, code);
    console.log(`[${requestId}] Twilio check result:`, twilioResult);

    if (!twilioResult.success) {
      console.error(`[${requestId}] Twilio verification check failed:`, twilioResult.error);
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
    console.log(`[${requestId}] Updating verification status to approved...`);
    const { error: updateError } = await supabase
      .from('phone_verifications')
      .update({ status: 'approved' })
      .eq('id', verification.id);

    if (updateError) {
      console.error(`[${requestId}] Error updating verification status:`, updateError);
    } else {
      console.log(`[${requestId}] Verification status updated successfully`);
    }

    // Get current authenticated user from request (if any)
    const authHeader = req.headers.get('Authorization');
    let currentUserId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (!userError && user) {
          currentUserId = user.id;
          console.log(`[${requestId}] Authenticated user making request: ${currentUserId}`);
        }
      } catch (err) {
        console.log(`[${requestId}] Could not get authenticated user:`, err);
      }
    }

    // Check if user already exists with this phone number
    console.log(`[${requestId}] Checking if user exists with this phone...`);
    const userResult = await findUserByPhone(normalizedPhone);
    console.log(`[${requestId}] User lookup result:`, userResult);

    let userId: string;
    let isNewUser = false;
    let accountMerged = false;
    let whatsappDataTransferred = false;

    // If current user is authenticated, link phone to their account
    if (currentUserId) {
      userId = currentUserId;
      console.log(`[${requestId}] Linking phone to authenticated user: ${userId}`);

      // First, transfer WhatsApp data if this phone has existing WhatsApp conversations
      const { data: existingWhatsAppUsers, error: whatsappLookupError } = await supabase
        .from('whatsapp_users')
        .select('id, user_id, phone_number')
        .eq('phone_number', normalizedPhone);

      if (!whatsappLookupError && existingWhatsAppUsers && existingWhatsAppUsers.length > 0) {
        console.log(`[${requestId}] Found ${existingWhatsAppUsers.length} WhatsApp account(s) for this phone`);

        for (const whatsappUser of existingWhatsAppUsers) {
          if (whatsappUser.user_id !== currentUserId) {
            console.log(`[${requestId}] Transferring WhatsApp account ${whatsappUser.id} to current user`);

            const { error: transferError } = await supabase
              .from('whatsapp_users')
              .update({
                user_id: currentUserId
              })
              .eq('id', whatsappUser.id);

            if (transferError) {
              console.error(`[${requestId}] Error transferring WhatsApp account:`, transferError);
            } else {
              console.log(`[${requestId}] WhatsApp account ${whatsappUser.id} transferred successfully`);
              whatsappDataTransferred = true;
            }
          }
        }
      }

      // CRITICAL: Update user_profiles FIRST (source of truth)
      console.log(`[${requestId}] Step 1: Updating user_profiles phone to: ${normalizedPhone}`);
      const { error: profileUpdateError } = await supabase
        .from('user_profiles')
        .update({
          phone_number: normalizedPhone
        })
        .eq('id', currentUserId);

      if (profileUpdateError) {
        console.error(`[${requestId}] CRITICAL: Failed to update user_profiles:`, profileUpdateError);
        return new Response(JSON.stringify({
          error: 'Could not link phone to your account. Please try again.'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log(`[${requestId}]  Phone successfully saved to user_profiles`);

      // Step 2: Update auth.users (best effort, may fail due to duplicate constraints)
      console.log(`[${requestId}] Step 2: Updating auth.users phone to: ${normalizedPhone}`);
      const { error: updatePhoneError, data: updatePhoneData } = await supabase.auth.admin.updateUserById(
        currentUserId,
        {
          phone: normalizedPhone,
          phone_confirmed: true,
          user_metadata: {
            phone: normalizedPhone,
            phone_number: normalizedPhone,
            phone_verified: true,
            phone_linked_at: new Date().toISOString()
          }
        }
      );

      if (updatePhoneError) {
        console.error(`[${requestId}] Warning: auth.users update failed:`, updatePhoneError);

        const isDuplicateError = updatePhoneError.message?.toLowerCase().includes('already') ||
                                  updatePhoneError.message?.toLowerCase().includes('duplicate') ||
                                  updatePhoneError.message?.toLowerCase().includes('registered');

        if (isDuplicateError) {
          console.log(`[${requestId}] � Duplicate phone in auth.users (expected) - phone saved to user_profiles`);
          // Store in user_metadata as fallback
          await supabase.auth.admin.updateUserById(
            currentUserId,
            {
              user_metadata: {
                phone: normalizedPhone,
                phone_number: normalizedPhone,
                phone_verified: true,
                phone_linked_at: new Date().toISOString()
              }
            }
          );
        } else {
          console.error(`[${requestId}] � Non-duplicate error in auth.users, but phone saved to user_profiles`);
        }
      } else {
        console.log(`[${requestId}]  Phone successfully updated in auth.users`);
      }

      // Step 3: Verify phone was saved
      console.log(`[${requestId}] Step 3: Verifying phone number persistence...`);
      const { data: verifyProfile } = await supabase
        .from('user_profiles')
        .select('phone_number')
        .eq('id', currentUserId)
        .maybeSingle();

      if (verifyProfile?.phone_number === normalizedPhone) {
        console.log(`[${requestId}]  VERIFIED: Phone number persisted in user_profiles`);
      } else {
        console.error(`[${requestId}]  CRITICAL: Phone number NOT found in user_profiles after update!`);
        return new Response(JSON.stringify({
          error: 'Phone linking verification failed. Please try again.'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (whatsappDataTransferred) {
        accountMerged = true;
        console.log(`[${requestId}] WhatsApp data successfully transferred to current user`);
      }

      console.log(`[${requestId}] Phone successfully linked to user account`);
    } else if (userResult.found && userResult.userId) {
      // No authenticated user, but phone number exists - phone login
      userId = userResult.userId;
      console.log(`[${requestId}] Existing user found: ${userId}`);

      if (merge_accounts === false) {
        console.log(`[${requestId}] User chose to keep accounts separate`);
      } else if (merge_accounts === true) {
        accountMerged = true;
        console.log(`[${requestId}] User chose to merge accounts`);
      }
    } else {
      // No authenticated user and phone doesn't exist - create new user
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
      console.log(`[${requestId}] New user created: ${userId}`);
    }

    // Update the phone verification record with the user_id
    console.log(`[${requestId}] Linking phone verification to user: ${userId}`);
    await supabase
      .from('phone_verifications')
      .update({ user_id: userId })
      .eq('id', verification.id);

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

    console.log(`[${requestId}] Verification complete, sending success response`);
    console.log(`[${requestId}] ===== END CHECK PHONE VERIFICATION REQUEST =====`);

    // Determine success message
    let successMessage = 'Logged in successfully';
    if (isNewUser) {
      successMessage = 'Account created successfully';
    } else if (accountMerged || whatsappDataTransferred) {
      successMessage = 'WhatsApp number linked! Your WhatsApp conversations have been transferred to your account.';
    } else if (currentUserId) {
      successMessage = 'WhatsApp number linked successfully!';
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      is_new_user: isNewUser,
      account_merged: accountMerged,
      whatsapp_data_transferred: whatsappDataTransferred,
      phone_number: normalizedPhone,
      session: sessionResult.session,
      message: successMessage
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error(`[${requestId}] ERROR in check-phone-verification:`, error);
    console.error(`[${requestId}] Error stack:`, error.stack);
    console.error(`[${requestId}] ===== END CHECK PHONE VERIFICATION REQUEST (ERROR) =====`);
    return new Response(JSON.stringify({
      error: error.message || 'Something unexpected happened during phone verification. Try again?'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
