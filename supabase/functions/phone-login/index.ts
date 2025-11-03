import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function validatePhoneNumber(phoneNumber: string): { valid: boolean; normalized?: string; error?: string } {
  try {
    let normalized = phoneNumber.trim();
    const digitsOnly = normalized.replace(/\D/g, '');
    normalized = '+' + digitsOnly;

    const phoneRegex = /^\+\d{7,15}$/;

    if (!phoneRegex.test(normalized)) {
      return {
        valid: false,
        error: 'Phone number format is invalid. Use international format like +267 72123456'
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { phone_number, password } = await req.json();

    if (!phone_number || !password) {
      return new Response(JSON.stringify({
        error: 'Phone number and password are required.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      phone: normalizedPhone,
      password: password
    });

    if (signInError) {
      console.error('Sign in error:', signInError);
      return new Response(JSON.stringify({
        error: 'Invalid phone number or password.'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!authData.user) {
      return new Response(JSON.stringify({
        error: 'Login failed. Please try again.'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', authData.user.id);

    if (updateError) {
      console.error('Error updating last_active_at:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Login successful!',
      user: {
        id: authData.user.id,
        phone: normalizedPhone
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in phone-login:', error);
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});