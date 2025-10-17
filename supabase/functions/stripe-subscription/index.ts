import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import Stripe from 'npm:stripe@14.18.0';

// Set up Stripe with your secret key
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
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
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Extract the JWT token from the Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the JWT token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token or unauthorized access' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if the user has changed their subscription in the last month
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscription_tier, subscription_end, last_subscription_change_at')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      return new Response(JSON.stringify({ error: 'Error fetching user profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check if it's been less than a month since the last change
    if (userProfile.last_subscription_change_at) {
      const lastChangeDate = new Date(userProfile.last_subscription_change_at);
      const oneMonthAgo = new Date();
                       req.method === 'POST'; // POST would be for upgrades

      // Skip the once-per-month check for free to pro upgrades
      const isFreeToPro = (userProfile.subscription_tier === 'freemium' || userProfile.subscription_tier === 'free') && 
                           req.method === 'POST'; // POST would be for upgrades
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
    if ((userProfile.subscription_tier === 'freemium' || userProfile.subscription_tier === 'free') && 
        req.method === 'POST') { // POST would be for upgrades
      console.log('Free to Pro upgrade - bypassing monthly restriction');
      // Continue processing the upgrade
    }
    // Add another special case: Allow free tier to be treated as an actual subscription
    else if (req.method === 'POST' && req.url.includes('free-tier')) {
      console.log('Free tier subscription - always allowed');
      // Continue processing the free tier subscription
    }
    // Only check subscription period for downgrades (DELETE method)
    else if (req.method === 'DELETE') {
    // For pro subscriptions, check if the subscription period has ended
      if (userProfile.subscription_tier === 'pro' && 
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

    // Handle different HTTP methods
    if (req.method === 'DELETE') {
      // Cancel the user's subscription
      return await handleCancelSubscription(user.id);
    } else if (req.method === 'GET') {
      // Get the user's subscription details
      return await handleGetSubscription(user.id);
    } else {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleCancelSubscription(userId: string) {
  try {
    // First, check the user's current subscription tier
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .maybeSingle();
    
    if (profileError) {
      return new Response(JSON.stringify({ 
        error: profileError.message || 'Error fetching user profile' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the user's Stripe customer ID from stripe_customers table
    const { data: customer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (customerError) {
      return new Response(JSON.stringify({ 
        error: customerError.message || 'Error fetching customer data' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    let customerId = customer?.customer_id;
    
    // If no customer found in stripe_customers, check user_profiles as fallback
    if (!customerId) {
      const { data: profileData, error: profileDataError } = await supabase
        .from('user_profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileDataError) {
        return new Response(JSON.stringify({ 
          error: profileDataError.message || 'Error fetching user profile' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      customerId = profileData?.stripe_customer_id;
      
      // If found in user_profiles but not in stripe_customers, sync it
      if (customerId) {
        await supabase
          .from('stripe_customers')
          .insert({
            user_id: userId,
            customer_id: customerId,
          });
      }
    }
    
    if (!customerId) {
      // If user is on free tier and no Stripe customer found, that's expected
      if (userProfile?.subscription_tier === 'free') {
        return new Response(JSON.stringify({ 
          success: true,
          message: 'No active subscription to cancel - user is on free tier'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // If user is on pro tier but no Stripe customer found, this indicates data inconsistency
      return new Response(JSON.stringify({ 
        error: 'Data inconsistency: User marked as paid tier but no Stripe customer record found' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get the customer's active subscription
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('stripe_subscriptions')
      .select('subscription_id')
      .eq('customer_id', customerId)
      .maybeSingle();
    
    if (subscriptionError) {
      return new Response(JSON.stringify({ 
        error: subscriptionError.message || 'Error fetching subscription data' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!subscriptionData || !subscriptionData.subscription_id) {
      return new Response(JSON.stringify({ 
        error: 'No active subscription found for this customer' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cancel the subscription at period end with Stripe
    const canceledSubscription = await stripe.subscriptions.update(
      subscriptionData.subscription_id,
      { cancel_at_period_end: true }
    );
    
    // Update the subscription in the database
    await supabase
      .from('stripe_subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('subscription_id', subscriptionData.subscription_id);
    
    return new Response(JSON.stringify({ 
      success: true,
      canceledSubscription: {
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        cancel_at_period_end: canceledSubscription.cancel_at_period_end,
        current_period_end: canceledSubscription.current_period_end,
      }
    }), {
      status: 200,
    // If still no customer ID found and user is on pro tier, this indicates a data inconsistency
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to cancel subscription', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetSubscription(userId: string) {
  try {
    // Get the user's subscription data
    const { data: subscriptionView, error: viewError } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .single();
    
    if (viewError) {
      return new Response(JSON.stringify({ 
        error: 'Data inconsistency: User is marked as having a pro subscription but no Stripe customer record exists. Please contact support.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      subscription: subscriptionView 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch subscription data', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}