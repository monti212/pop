import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_VERIFY_SERVICE_SID = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function validatePhoneNumber(phoneNumber: string): { valid: boolean; normalized?: string; error?: string } {
  try {
    let normalized = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }
    const phoneRegex = /^\+\d{7,15}$/;
    if (!phoneRegex.test(normalized)) {
      return { valid: false, error: 'That phone number format doesn\'t look right. Try international format like +267 1234567?' };
    }
    return { valid: true, normalized };
  } catch (error) {
    return { valid: false, error: 'Invalid phone number format' };
  }
}

async function checkTwilioVerification(phoneNumber: string, code: string): Promise<{ success: boolean; valid?: boolean; error?: string; }> {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
      throw new Error('Phone service configuration is missing');
    }
    const accountSid = TWILIO_ACCOUNT_SID.trim();
    const authToken = TWILIO_AUTH_TOKEN.trim();
    const verifySid = TWILIO_VERIFY_SERVICE_SID.trim();
    const auth = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(`https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 'To': phoneNumber, 'Code': code })
    });
    if (!response.ok) {
      if (response.status === 404) throw new Error('Verification not found or expired');
      throw new Error(`Twilio Verify Check error: ${response.status}`);
    }
    const data = await response.json();
    return { success: true, valid: data.status === 'approved' || data.valid === true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function findUserByPhone(phoneNumber: string): Promise<{ found: boolean; userId?: string; error?: string; }> {
  try {
    const { data: profile } = await supabase.from('user_profiles').select('id').eq('phone_number', phoneNumber).maybeSingle();
    if (profile) return { found: true, userId: profile.id };
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const userWithPhone = authUsers.users?.find(user => user.phone === phoneNumber || user.user_metadata?.phone === phoneNumber);
    if (userWithPhone) return { found: true, userId: userWithPhone.id };
    return { found: false };
  } catch (error: any) {
    return { found: false, error: error.message };
  }
}

async function createUserWithPhone(phoneNumber: string, name?: string): Promise<{ success: boolean; userId?: string; error?: string; }> {
  try {
    const userId = crypto.randomUUID();
    const { error: authError } = await supabase.auth.admin.createUser({
      user_id: userId,
      phone: phoneNumber,
      phone_confirmed: true,
      user_metadata: { phone: phoneNumber, via_phone_verification: true, display_name: name || `User (${phoneNumber.slice(-4)})` }
    });
    if (authError) {
      if (authError.message?.includes('Phone number already registered')) {
        const findResult = await findUserByPhone(phoneNumber);
        if (findResult.found && findResult.userId) return { success: true, userId: findResult.userId };
      }
      throw authError;
    }
    await supabase.from('user_profiles').upsert({ id: userId, phone_number: phoneNumber, display_name: name || `User (${phoneNumber.slice(-4)})` }, { onConflict: 'id' });
    return { success: true, userId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const { phone_number, code, name } = await req.json();
    if (!phone_number || !code) {
      return new Response(JSON.stringify({ error: 'Phone number and code are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const phoneValidation = validatePhoneNumber(phone_number);
    if (!phoneValidation.valid) {
      return new Response(JSON.stringify({ error: phoneValidation.error }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const normalizedPhone = phoneValidation.normalized!;

    await supabase.from('phone_verifications').update({ status: 'expired' }).eq('phone_number', normalizedPhone).eq('status', 'pending').lte('expires_at', new Date().toISOString());

    const { data: verification } = await supabase.from('phone_verifications').select('*').eq('phone_number', normalizedPhone).eq('status', 'pending').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (!verification) {
      return new Response(JSON.stringify({ error: 'No active verification found. Please request a new code.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const twilioResult = await checkTwilioVerification(normalizedPhone, code);
    if (!twilioResult.success || !twilioResult.valid) {
      await supabase.from('phone_verifications').update({ status: 'failed' }).eq('id', verification.id);
      return new Response(JSON.stringify({ error: 'Invalid verification code' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabase.from('phone_verifications').update({ status: 'approved' }).eq('id', verification.id);

    const authHeader = req.headers.get('Authorization');
    let currentUserId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (user) currentUserId = user.id;
    }

    let userId: string;
    let isNewUser = false;

    if (currentUserId) {
      userId = currentUserId;
      await supabase.from('user_profiles').update({ phone_number: normalizedPhone, display_name: name || undefined }).eq('id', currentUserId);
      await supabase.auth.admin.updateUserById(currentUserId, { phone: normalizedPhone, phone_confirmed: true, user_metadata: { phone: normalizedPhone, phone_verified: true, display_name: name || undefined } });
    } else {
      const userResult = await findUserByPhone(normalizedPhone);
      if (userResult.found && userResult.userId) {
        userId = userResult.userId;
      } else {
        const createResult = await createUserWithPhone(normalizedPhone, name);
        if (!createResult.success) {
          return new Response(JSON.stringify({ error: 'Failed to create account' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        userId = createResult.userId!;
        isNewUser = true;
      }
    }

    await supabase.from('phone_verifications').update({ user_id: userId }).eq('id', verification.id);

    // Generate session tokens with proper JWT claims
    console.log(`[${requestId}] Generating session for user:`, userId);

    // First, ensure user exists and fetch latest data
    const { data: { user: authUser }, error: getUserError } = await supabase.auth.admin.getUserById(userId);
    if (getUserError || !authUser) {
      console.error(`[${requestId}] Failed to get user:`, getUserError);
      return new Response(JSON.stringify({ error: 'Could not retrieve user account' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[${requestId}] User retrieved:`, { id: authUser.id, phone: authUser.phone, email: authUser.email });

    // Generate a secure session using magic link generation
    // This ensures all required JWT claims including 'sub' are properly set
    const { data: otpData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: authUser.email || undefined,
      phone: authUser.phone || undefined,
      options: {
        data: {
          phone_verified: true,
          phone: normalizedPhone,
          source: 'phone_verification'
        }
      }
    });

    if (linkError) {
      console.error(`[${requestId}] Failed to generate link:`, linkError);
      return new Response(JSON.stringify({ error: 'Could not generate authentication link' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!otpData?.properties?.action_link) {
      console.error(`[${requestId}] No action link generated, falling back to client refresh`);
      return new Response(JSON.stringify({
        success: true,
        user_id: userId,
        is_new_user: isNewUser,
        phone_number: normalizedPhone,
        message: isNewUser ? 'Account created' : 'Logged in',
        requires_client_refresh: true
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Extract tokens from the magic link
    const actionLink = otpData.properties.action_link;
    console.log(`[${requestId}] Action link generated successfully`);

    const urlParams = new URLSearchParams(actionLink.split('?')[1] || '');
    const accessToken = urlParams.get('access_token') || '';
    const refreshToken = urlParams.get('refresh_token') || '';

    // Validate that tokens were extracted
    if (!accessToken || !refreshToken) {
      console.error(`[${requestId}] Failed to extract tokens from action link`);
      return new Response(JSON.stringify({
        success: true,
        user_id: userId,
        is_new_user: isNewUser,
        phone_number: normalizedPhone,
        message: isNewUser ? 'Account created' : 'Logged in',
        requires_client_refresh: true
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate access token has required JWT claims
    try {
      const tokenParts = accessToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));

        if (!payload.sub) {
          console.error(`[${requestId}] Generated access token missing 'sub' claim!`);
          console.error(`[${requestId}] Token claims:`, Object.keys(payload));
          return new Response(JSON.stringify({
            error: 'Generated session token is invalid',
            details: 'Missing required user ID claim'
          }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.log(`[${requestId}] Token validated successfully with sub claim:`, payload.sub);
      }
    } catch (decodeError) {
      console.error(`[${requestId}] Failed to decode token:`, decodeError);
      // Continue anyway - client will validate
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      is_new_user: isNewUser,
      phone_number: normalizedPhone,
      session: { access_token: accessToken, refresh_token: refreshToken, token_type: 'bearer', expires_in: 3600, user: { id: userId, phone: normalizedPhone, user_metadata: authUser.user_metadata || {} } },
      message: isNewUser ? 'Account created successfully' : 'Logged in successfully'
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error(`[${requestId}] ERROR:`, error);
    return new Response(JSON.stringify({ error: error.message || 'Verification failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});