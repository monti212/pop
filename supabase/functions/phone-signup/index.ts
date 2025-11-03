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
    const { phone_number, password, name } = await req.json();

    if (!phone_number || !password || !name) {
      return new Response(JSON.stringify({
        error: 'Phone number, password, and name are required.'
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

    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({
        error: 'This phone number is already registered.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      phone: normalizedPhone,
      password: password,
      options: {
        data: {
          name: name,
          phone: normalizedPhone
        }
      }
    });

    if (signUpError) {
      console.error('Sign up error:', signUpError);
      return new Response(JSON.stringify({
        error: signUpError.message || 'Failed to create account.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!authData.user) {
      return new Response(JSON.stringify({
        error: 'Failed to create user account.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: authData.user.id,
        phone_number: normalizedPhone,
        display_name: name,
        team_role: 'free'
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Account created successfully!',
      user: {
        id: authData.user.id,
        phone: normalizedPhone,
        name: name
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in phone-signup:', error);
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});