import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import Stripe from 'npm:stripe@14.18.0';

// Get Stripe secret key from environment variables with multiple fallbacks
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || 
                       Deno.env.get('STRIPE_SECRET') || 
                       'sk_test_51RVCfyKhB7e46jXj1UwrN9kPGZGw7uUJt6H47kVrDBrvBGpHwGkIjJ2FNKdY3zUTXVxvLkTe0OgWztxIzH00EvOn00MGTYNuVJ';

if (!stripeSecretKey || stripeSecretKey === '') {
  console.error('WARNING: STRIPE_SECRET_KEY environment variable is not set!');
}

// Set up Stripe with your secret key from environment variables
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Set up Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Plan configuration
const PLANS = {
  free: {
    price_id: 'price_1RVCyyKhB7e46jXjp2nUltjm',
    name: 'Free Plan',
    description: 'Free tier with limited features',
    amount: 0,
  },
  pro: {
    price_id: 'price_1RVD0uKhB7e46jXj5tCpGteQ',
    name: 'Pro Plan',
    description: 'Full access to all features',
    amount: 700, // $7.00 in cents
  },
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'This request method is not supported by Uhuru.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Check if Stripe is properly configured
    if (!stripeSecretKey || stripeSecretKey === '') {
      console.error('Stripe secret key is missing');
      return new Response(JSON.stringify({ 
        error: 'The payment service is having configuration troubles. Maybe contact support?',
        details: 'Something\'s not set up right on the payment side.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { price_id, success_url, cancel_url, mode = 'subscription', plan } = await req.json();

    // Resolve the price ID either from the direct input or from the plan parameter
    let resolvedPriceId = price_id;
    if (!resolvedPriceId && plan && PLANS[plan]) {
      resolvedPriceId = PLANS[plan].price_id;
      console.log(`Using price ID ${resolvedPriceId} from plan ${plan}`);
    }

    // Validate input
    if (!resolvedPriceId) {
      return new Response(JSON.stringify({ error: 'I can\'t figure out which plan you want. Could you try selecting again?' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!success_url) {
      return new Response(JSON.stringify({ error: 'I need to know where to send you after payment. Missing redirect URL?' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the authorization header and extract user ID
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'I need to verify who you are first. Mind signing in?' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the user with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Your session doesn\'t look right. Mind signing in again?' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Creating checkout for user: ${user.id}, plan: ${plan || 'custom'}, price: ${resolvedPriceId}`);

    // Check if user already has a Stripe customer ID
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', userError);
      return new Response(JSON.stringify({ error: 'I can\'t access your account info right now. Try again?' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let customerId = userProfile?.stripe_customer_id;

    // If user doesn't have a customer ID, create one
    if (!customerId) {
      try {
        console.log(`Creating new Stripe customer for user: ${user.id}, email: ${user.email}`);
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
          },
        });

        customerId = customer.id;

        // Save the customer ID to the user's profile using upsert to avoid conflicts
        const { error: updateError } = await supabase
          .from('user_profiles')
          .upsert({ 
            id: user.id,
            stripe_customer_id: customerId 
          }, {
            onConflict: 'id'
          });

        if (updateError) {
          console.error('Error updating customer ID:', updateError);
          // Continue anyway, as this is not critical for checkout
        } else {
          console.log(`Saved Stripe customer ID ${customerId} to user profile`);
        }
      } catch (stripeError: any) {
        console.error('Error creating Stripe customer:', stripeError);
        return new Response(JSON.stringify({ error: 'I couldn\'t set up your payment account. Want to try again?' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if the user can change subscription (hasn't changed in the last month)
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('subscription_tier, subscription_end, last_subscription_change_at')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        return new Response(JSON.stringify({ 
          error: 'I can\'t access your account details right now. Try again?' 
        }), {
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      // Check if it's been less than a month since the last change
      if (userProfile.last_subscription_change_at) {
        const lastChangeDate = new Date(userProfile.last_subscription_change_at);
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        // Special case: Allow free to pro upgrades at any time
        const isFreeToPro = userProfile.subscription_tier === 'free' && plan === 'pro';
        
        // Only apply once-per-month restriction if it's not a free to pro upgrade
        if (!isFreeToPro && lastChangeDate > oneMonthAgo) {
          const nextChangeDate = new Date(lastChangeDate);
          nextChangeDate.setMonth(nextChangeDate.getMonth() + 1);
          
          return new Response(JSON.stringify({ 
            error: `Subscription change rejected: Subscription was already changed on ${lastChangeDate.toISOString().split('T')[0]} - only one change per month is allowed. You can change your subscription again after ${nextChangeDate.toISOString().split('T')[0]}.`
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      
      
      // Special case: Allow free to pro upgrades anytime
      if (userProfile.subscription_tier === 'free' && plan === 'pro') {
        console.log('Free to Pro upgrade - bypassing monthly restriction');
        // This is always allowed, continue processing
      } else {
      // For pro users, check if they're trying to upgrade again
        if (userProfile.subscription_tier === 'pro' && plan === 'pro') {
        return new Response(JSON.stringify({ 
          error: 'Looks like you\'re already on Pro! No need to upgrade.' 
        }), {
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
        }
      
        // For pro subscriptions trying to downgrade, check if the subscription period has ended
        if (userProfile.subscription_tier === 'pro' && 
          plan === 'free' && 
          userProfile.subscription_end && 
          new Date(userProfile.subscription_end) > new Date()) {
          return new Response(JSON.stringify({ 
            error: `Subscription downgrade rejected: Downgrades are only allowed after the subscription period ends on ${new Date(userProfile.subscription_end).toISOString().split('T')[0]}.` 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      
    } else {
      console.log(`Using existing Stripe customer: ${customerId}`);
    }

    // Create a checkout session
    try {
      console.log(`Creating checkout session with price: ${resolvedPriceId}, mode: ${mode}`);
      
      // For free tier, set trial period to 100 years (effectively unlimited)
      const trialSettings = plan === 'free' ? {
        trial_period_days: 36500 // ~100 years
      } : {};
      
      // For free tier, use the plan value for better metadata
      const metadata = {
        userId: user.id,
        price_id: resolvedPriceId,
        plan: plan || 'custom',
      };
      
      console.log(`Creating session with metadata:`, metadata);
      
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: resolvedPriceId,
            quantity: 1,
          },
        ],
        mode: mode as 'subscription' | 'payment',
        success_url: success_url,
        cancel_url: cancel_url || `${new URL(success_url).origin}`,
        client_reference_id: user.id,
        metadata: metadata,
        allow_promotion_codes: true, // Enable promotion code input box
        subscription_data: plan === 'free' ? {
          trial_period_days: 36500, // ~100 years of "trial" for free tier
          metadata: metadata
        } : undefined,
      });

      console.log(`Checkout session created: ${session.id}, URL: ${session.url}`);

      // Return the checkout URL
      return new Response(JSON.stringify({ success: true, url: session.url }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (stripeError: any) {
      console.error('Stripe checkout error:', stripeError);
      return new Response(JSON.stringify({ 
        error: stripeError.message || 'Checkout session creation isn\'t working. Try again?',
        details: stripeError.toString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    console.error('Checkout error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Something unexpected happened with payment. Want to try again?',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});