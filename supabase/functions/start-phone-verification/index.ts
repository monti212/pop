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

    // First, check if it has a plus at the start
    const hasPlus = normalized.startsWith('+');

    // Remove everything except digits
    const digitsOnly = normalized.replace(/\D/g, '');

    // Reconstruct with plus sign
    normalized = '+' + digitsOnly;

    console.log(`[Validation] Original: "${phoneNumber}" -> Normalized: "${normalized}"`);
    console.log(`[Validation] Character breakdown:`, normalized.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' '));

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

// Helper function to start phone verification with Twilio
async function startTwilioVerification(phoneNumber: string): Promise<{
  success: boolean;
  sid?: string;
  error?: string;
}> {
  const funcId = crypto.randomUUID().substring(0, 6);
  console.log(`[Twilio-${funcId}] === Starting Twilio verification ===`);
  console.log(`[Twilio-${funcId}] Phone number:`, phoneNumber);

  try {
    console.log(`[Twilio-${funcId}] Checking environment variables...`);
    console.log(`[Twilio-${funcId}] TWILIO_ACCOUNT_SID present:`, !!TWILIO_ACCOUNT_SID);
    console.log(`[Twilio-${funcId}] TWILIO_AUTH_TOKEN present:`, !!TWILIO_AUTH_TOKEN);
    console.log(`[Twilio-${funcId}] TWILIO_VERIFY_SERVICE_SID present:`, !!TWILIO_VERIFY_SERVICE_SID);

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
      const missingVars = [];
      if (!TWILIO_ACCOUNT_SID) missingVars.push('TWILIO_ACCOUNT_SID');
      if (!TWILIO_AUTH_TOKEN) missingVars.push('TWILIO_AUTH_TOKEN');
      if (!TWILIO_VERIFY_SERVICE_SID) missingVars.push('TWILIO_VERIFY_SERVICE_SID');

      console.error(`[Twilio-${funcId}] Missing Twilio environment variables:`, missingVars);
      throw new Error('Phone service configuration is missing. Please contact support.');
    }

    console.log(`[Twilio-${funcId}] Using Twilio Account SID: ${TWILIO_ACCOUNT_SID?.substring(0, 10)}...`);
    console.log(`[Twilio-${funcId}] Using Verify Service SID: ${TWILIO_VERIFY_SERVICE_SID?.substring(0, 10)}...`);

    console.log(`[Twilio-${funcId}] Preparing credentials...`);
    const accountSid = TWILIO_ACCOUNT_SID.trim();
    const authToken = TWILIO_AUTH_TOKEN.trim();
    const verifySid = TWILIO_VERIFY_SERVICE_SID.trim();

    const auth = btoa(`${accountSid}:${authToken}`);
    const twilioUrl = `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`;

    console.log(`[Twilio-${funcId}] Twilio API URL:`, twilioUrl);

    const requestBody = new URLSearchParams({
      'To': phoneNumber,
      'Channel': 'sms'
    });

    console.log(`[Twilio-${funcId}] Request body:`, requestBody.toString());
    console.log(`[Twilio-${funcId}] Sending request to Twilio...`);

    const startTime = Date.now();
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: requestBody
    });

    const duration = Date.now() - startTime;
    console.log(`[Twilio-${funcId}] Twilio response received in ${duration}ms`);
    console.log(`[Twilio-${funcId}] Response status:`, response.status, response.statusText);

    if (!response.ok) {
      console.error(`[Twilio-${funcId}] Twilio API returned error status:`, response.status);
      let errorMessage = `Twilio Verify API error: ${response.status} ${response.statusText}`;
      let errorDetails = {};

      try {
        const errorData = await response.json();
        errorDetails = errorData;
        console.error(`[Twilio-${funcId}] Twilio Verify API error response:`, JSON.stringify(errorData, null, 2));

        // Extract specific error message from Twilio response
        if (errorData.message) {
          errorMessage = `Twilio Error: ${errorData.message}`;
        } else if (errorData.code) {
          errorMessage = `Twilio Error Code ${errorData.code}: ${errorData.message || 'Unknown error'}`;
        } else if (errorData.detail) {
          errorMessage = `Twilio Error: ${errorData.detail}`;
        }

        // Add specific guidance for common errors
        if (response.status === 401) {
          console.error(`[Twilio-${funcId}] Twilio 401 Authentication Error - Check your credentials:`);
          console.error(`[Twilio-${funcId}] - TWILIO_ACCOUNT_SID should start with "AC"`);
          console.error(`[Twilio-${funcId}] - TWILIO_AUTH_TOKEN should be 32 characters`);
          console.error(`[Twilio-${funcId}] - TWILIO_VERIFY_SERVICE_SID should start with "VA"`);
          console.error(`[Twilio-${funcId}] Account SID format:`, accountSid.substring(0, 2), '(should be AC)');
          console.error(`[Twilio-${funcId}] Verify Service format:`, verifySid.substring(0, 2), '(should be VA)');
          errorMessage = 'Phone service authentication failed. Please verify your Twilio credentials are correct.';
        } else if (response.status === 404) {
          console.error(`[Twilio-${funcId}] Twilio 404 Error - Service not found. Verify Service SID:`, verifySid);
          errorMessage = 'Phone verification service not found. Check your Twilio Verify Service SID.';
        } else if (response.status === 400 && errorData.code === 60200) {
          console.error(`[Twilio-${funcId}] Twilio rejected phone number. Exact phone sent:`, phoneNumber);
          console.error(`[Twilio-${funcId}] Phone length:`, phoneNumber.length);
          console.error(`[Twilio-${funcId}] Phone characters:`, phoneNumber.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' '));
          errorMessage = 'That phone number format doesn\'t look right. Try international format like +267 1234567?';
        } else if (response.status === 400 && errorData.code === 60203) {
          errorMessage = 'That phone number has had too many verification attempts. Give it a rest and try later?';
        } else if (response.status === 429) {
          errorMessage = 'I\'ve got too many verification requests right now. Wait a bit and try again?';
        }
      } catch (parseError) {
        const errorText = await response.text();
        console.error(`[Twilio-${funcId}] Failed to parse Twilio error response as JSON:`, parseError);
        console.error(`[Twilio-${funcId}] Raw Twilio error response:`, errorText);
        errorMessage = `Phone verification service error (${response.status}). Please try again later.`;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`[Twilio-${funcId}] Phone verification started successfully`);
    console.log(`[Twilio-${funcId}] Verification SID:`, data.sid);
    console.log(`[Twilio-${funcId}] Response data:`, JSON.stringify(data, null, 2));
    console.log(`[Twilio-${funcId}] === Twilio verification complete ===`);

    return {
      success: true,
      sid: data.sid
    };
  } catch (error: any) {
    console.error(`[Twilio-${funcId}] ERROR starting phone verification:`, error);
    console.error(`[Twilio-${funcId}] Error message:`, error.message);
    console.error(`[Twilio-${funcId}] Error stack:`, error.stack);
    console.error(`[Twilio-${funcId}] === Twilio verification failed ===`);
    return {
      success: false,
      error: error.message
    };
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] ===== START PHONE VERIFICATION REQUEST =====`);
  console.log(`[${requestId}] Method:`, req.method);
  console.log(`[${requestId}] URL:`, req.url);
  console.log(`[${requestId}] Headers:`, Object.fromEntries(req.headers.entries()));

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
    const requestText = await req.text();
    console.log(`[${requestId}] Raw request body:`, requestText);

    const requestBody = JSON.parse(requestText);
    console.log(`[${requestId}] Parsed request body:`, requestBody);

    // Accept both snake_case (phone_number) and camelCase (phoneNumber) for backward compatibility
    const phoneNumberInput = requestBody.phone_number || requestBody.phoneNumber;

    if (!phoneNumberInput) {
      console.error(`[${requestId}] Missing phone number in request. Keys provided:`, Object.keys(requestBody));
      return new Response(JSON.stringify({
        error: 'I need your phone number to send you a verification code.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[${requestId}] Raw phone number input:`, phoneNumberInput);
    console.log(`[${requestId}] Phone input type:`, typeof phoneNumberInput);
    console.log(`[${requestId}] Phone input length:`, phoneNumberInput.length);

    console.log(`[${requestId}] Processing phone number:`, phoneNumberInput);
    console.log(`[${requestId}] Validating phone number...`);

    const phoneValidation = validatePhoneNumber(phoneNumberInput);
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

    console.log(`[${requestId}] Checking for recent verification attempts...`);
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    const { data: recentAttempt, error: recentError } = await supabase
      .from('phone_verifications')
      .select('created_at, status')
      .eq('phone_number', normalizedPhone)
      .gte('created_at', fiveMinutesAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log(`[${requestId}] Recent attempt check result:`, { recentAttempt, recentError });

    if (recentError) {
      console.error(`[${requestId}] Error checking recent attempts:`, recentError);
    }

    if (recentAttempt && recentAttempt.status === 'pending') {
      console.log(`[${requestId}] Recent pending verification found, rejecting request`);
      return new Response(JSON.stringify({
        error: 'I just sent you a code! Give it 5 minutes before asking for another one?'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[${requestId}] Starting Twilio verification...`);
    const verificationResult = await startTwilioVerification(normalizedPhone);
    console.log(`[${requestId}] Twilio verification result:`, verificationResult);

    if (!verificationResult.success) {
      console.error(`[${requestId}] Twilio verification failed:`, verificationResult.error);
      return new Response(JSON.stringify({
        error: verificationResult.error || 'Phone verification isn\'t starting. Want to try again?'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[${requestId}] Storing verification attempt in database...`);
    const { error: insertError } = await supabase
      .from('phone_verifications')
      .insert({
        phone_number: normalizedPhone,
        twilio_sid: verificationResult.sid!,
        status: 'pending'
      });

    if (insertError) {
      console.error(`[${requestId}] Error storing verification attempt:`, insertError);
    } else {
      console.log(`[${requestId}] Verification attempt stored successfully`);
    }

    console.log(`[${requestId}] Verification code sent successfully`);
    console.log(`[${requestId}] ===== END PHONE VERIFICATION REQUEST =====`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Verification code sent! Check your phone.',
      phone_number: normalizedPhone
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error(`[${requestId}] ERROR in start-phone-verification:`, error);
    console.error(`[${requestId}] Error stack:`, error.stack);
    console.error(`[${requestId}] ===== END PHONE VERIFICATION REQUEST (ERROR) =====`);
    return new Response(JSON.stringify({
      error: error.message || 'Something unexpected happened with phone verification. Try again?'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});