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
      return {
        valid: false,
        error: 'That phone number format doesn\'t look right. Try international format like +267 1234567?'
      };
    }
    return { valid: true, normalized };
  } catch {
    return { valid: false, error: 'Invalid phone number format' };
  }
}

async function startTwilioWhatsAppVerification(phoneNumber: string): Promise<{
  success: boolean;
  sid?: string;
  error?: string;
}> {
  const funcId = crypto.randomUUID().substring(0, 6);
  console.log(`[Twilio-${funcId}] === Starting Twilio WhatsApp verification ===`);
  console.log(`[Twilio-${funcId}] Phone:`, phoneNumber);

  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
      const missing: string[] = [];
      if (!TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID');
      if (!TWILIO_AUTH_TOKEN) missing.push('TWILIO_AUTH_TOKEN');
      if (!TWILIO_VERIFY_SERVICE_SID) missing.push('TWILIO_VERIFY_SERVICE_SID');
      console.error(`[Twilio-${funcId}] Missing env vars:`, missing);
      throw new Error('WhatsApp service configuration is missing. Please contact support.');
    }

    const accountSid = TWILIO_ACCOUNT_SID.trim();
    const authToken = TWILIO_AUTH_TOKEN.trim();
    const verifySid = TWILIO_VERIFY_SERVICE_SID.trim();
    const auth = btoa(`${accountSid}:${authToken}`);

    const twilioUrl = `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`;
    const requestBody = new URLSearchParams({
      'To': phoneNumber,
      'Channel': 'whatsapp'
    });

    console.log(`[Twilio-${funcId}] POST ${twilioUrl} body=${requestBody.toString()}`);
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: requestBody
    });

    if (!response.ok) {
      let errorMessage = `Twilio Verify API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        console.error(`[Twilio-${funcId}] Error response:`, JSON.stringify(errorData));
        if (errorData.message) {
          errorMessage = `Twilio Error: ${errorData.message}`;
        }
        if (response.status === 400 && errorData.code === 60200) {
          errorMessage = 'That phone number format doesn\'t look right. Try international format like +267 1234567?';
        } else if (response.status === 400 && errorData.code === 60203) {
          errorMessage = 'Too many verification attempts. Give it a few minutes and try again?';
        } else if (response.status === 400 && errorData.code === 60410) {
          errorMessage = 'This number can\'t receive a WhatsApp code right now. Make sure WhatsApp is installed and reachable on this number, or try SMS instead.';
        } else if (response.status === 401) {
          errorMessage = 'WhatsApp service authentication failed. Please contact support.';
        } else if (response.status === 429) {
          errorMessage = 'Too many requests right now. Wait a bit and try again?';
        }
      } catch (parseError) {
        console.error(`[Twilio-${funcId}] Failed to parse error:`, parseError);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`[Twilio-${funcId}] OK sid=${data.sid} status=${data.status}`);
    return { success: true, sid: data.sid };
  } catch (error: any) {
    console.error(`[Twilio-${funcId}] ERROR:`, error.message);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] ===== START WHATSAPP VERIFICATION =====`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { phone_number } = await req.json();
    if (!phone_number) {
      return new Response(JSON.stringify({
        error: 'I need your phone number to send you a WhatsApp code.'
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const phoneValidation = validatePhoneNumber(phone_number);
    if (!phoneValidation.valid) {
      return new Response(JSON.stringify({ error: phoneValidation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const normalizedPhone = phoneValidation.normalized!;

    // Expire any stale pending verifications for this number
    await supabase
      .from('phone_verifications')
      .update({ status: 'expired' })
      .eq('phone_number', normalizedPhone)
      .eq('status', 'pending')
      .lte('expires_at', new Date().toISOString());

    // Check rate limit against any active pending verification (SMS or WhatsApp share the
    // phone_verifications table by phone number)
    const { data: activeVerification } = await supabase
      .from('phone_verifications')
      .select('attempted_at')
      .eq('phone_number', normalizedPhone)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeVerification) {
      const minutesSinceAttempt = Math.floor(
        (Date.now() - new Date(activeVerification.attempted_at).getTime()) / 60000
      );
      if (minutesSinceAttempt < 4) {
        const waitMinutes = 4 - minutesSinceAttempt;
        return new Response(JSON.stringify({
          error: `I just sent you a code ${minutesSinceAttempt} minute${minutesSinceAttempt !== 1 ? 's' : ''} ago! Please wait ${waitMinutes} more minute${waitMinutes !== 1 ? 's' : ''} before requesting another.`
        }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      await supabase
        .from('phone_verifications')
        .update({ status: 'expired' })
        .eq('phone_number', normalizedPhone)
        .eq('status', 'pending');
    }

    const verificationResult = await startTwilioWhatsAppVerification(normalizedPhone);
    if (!verificationResult.success) {
      return new Response(JSON.stringify({
        error: verificationResult.error || 'WhatsApp verification isn\'t starting. Want to try again?'
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const { error: insertError } = await supabase
      .from('phone_verifications')
      .insert({
        phone_number: normalizedPhone,
        twilio_sid: verificationResult.sid!,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        attempted_at: new Date().toISOString()
      });

    if (insertError) {
      console.error(`[${requestId}] DB insert failed:`, insertError);
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({
          error: 'There\'s already an active verification for this number. Please wait a few minutes and try again.'
        }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        error: 'I had trouble saving your verification request. Please try again.'
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: true,
      channel: 'whatsapp',
      message: 'WhatsApp code sent! Check your WhatsApp messages.',
      phone_number: normalizedPhone
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error(`[${requestId}] ERROR:`, error);
    return new Response(JSON.stringify({
      error: error.message || 'Something unexpected happened with WhatsApp verification. Try again?'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
