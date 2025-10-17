import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import Stripe from 'npm:stripe@14.18.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Your Stripe webhook secret
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  // Only allow POST requests for webhooks
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get the raw request body
    const body = await req.text();
    
    // Get the signature from headers
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verify the webhook signature
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook Error: ${err.message}`);
      return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
        
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      default:
        // Unexpected event type
        console.log(`Unhandled event type ${event.type}`);
    }
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error(`Error handling webhook: ${err.message}`);
    return new Response(JSON.stringify({ error: `Server Error: ${err.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Handler functions

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Extract userId and plan from metadata
    const { userId, plan = 'pro' } = paymentIntent.metadata;
    
    if (!userId) {
      console.error('No userId found in payment intent metadata');
      return;
    }
    
    // Record payment
    await supabase.from('payments').insert({
      user_id: userId,
      amount: paymentIntent.amount / 100, // Convert from cents to dollars
      currency: paymentIntent.currency,
      status: 'succeeded',
      provider: 'stripe',
      provider_payment_id: paymentIntent.id
    });
    
    // Calculate subscription period (one month)
    const now = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    
    // Update user subscription tier
    await supabase
      .from('user_profiles')
      .update({
        subscription_tier: plan,
        subscription_start: now.toISOString(),
        subscription_end: end.toISOString()
      })
      .eq('id', userId);
      
  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error);
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const { client_reference_id: userId } = session;
    
    if (!userId) {
      console.error('No client_reference_id found in checkout session');
      return;
    }
    
    if (session.payment_status === 'paid') {
      // If this is a one-time payment (not subscription)
      if (!session.subscription && session.amount_total) {
        await supabase.from('payments').insert({
          user_id: userId,
          amount: session.amount_total / 100,
          currency: session.currency || 'usd',
          status: 'succeeded',
          provider: 'stripe',
          provider_payment_id: session.payment_intent as string
        });
      
        // Calculate subscription period (one month)
        const now = new Date();
        const end = new Date();
        end.setMonth(end.getMonth() + 1);
        
        // Update user subscription tier
        await supabase
          .from('user_profiles')
          .update({
            subscription_tier: 'pro', // Default to pro plan
            subscription_start: now.toISOString(),
            subscription_end: end.toISOString()
          })
          .eq('id', userId);
      }
      // Subscription payments are handled by the subscription events
    }
  } catch (error) {
    console.error('Error handling checkout.session.completed:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    // Get metadata from the subscription
    const { metadata } = subscription;
    
    // Get the customer, then get their email
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    
    if (!metadata?.userId && customer.email) {
      // Try to find the user by email
      const { data: userData } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', customer.email)
        .single();
        
      if (userData) {
        // Update metadata on the subscription for future events
        await stripe.subscriptions.update(subscription.id, {
          metadata: { 
            ...metadata,
            userId: userData.id 
          }
        });
      }
    }
    
    const userId = metadata?.userId;
    
    if (!userId) {
      console.error('No userId found in subscription metadata or related customer');
      return;
    }
    
    // Check subscription status
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      // Get plan details
      const product = await stripe.products.retrieve(
        subscription.items.data[0]?.price.product as string
      );
      
      const plan = product.name?.toLowerCase().includes('pro') ? 'pro' : 'freemium';
      const period_start = new Date(subscription.current_period_start * 1000);
      const period_end = new Date(subscription.current_period_end * 1000);
      
      // Update user subscription tier
      await supabase
        .from('user_profiles')
        .update({
          subscription_tier: plan,
          subscription_start: period_start.toISOString(),
          subscription_end: period_end.toISOString()
        })
        .eq('id', userId);
    }
  } catch (error) {
    console.error('Error handling customer.subscription.updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const userId = subscription.metadata?.userId;
    
    if (!userId) {
      console.error('No userId found in subscription metadata');
      return;
    }
    
    // Check if subscription period has ended
    const now = new Date();
    const endDate = new Date(subscription.current_period_end * 1000);
    
    if (now >= endDate) {
      // Subscription has ended, downgrade to freemium
      await supabase
        .from('user_profiles')
        .update({
          subscription_tier: 'freemium',
          subscription_end: null
        })
        .eq('id', userId);
    } else {
      // Subscription canceled but not yet ended - keep access until end of period
      await supabase
        .from('user_profiles')
        .update({
          subscription_end: endDate.toISOString()
        })
        .eq('id', userId);
    }
  } catch (error) {
    console.error('Error handling customer.subscription.deleted:', error);
  }
}