import { supabase } from './authService';
import { getProductById } from '../stripe-config';

// Create a Stripe checkout session
export const createCheckoutSession = async (
  _userId: string,
  plan: 'plus' | 'free', 
  successUrl: string,
  cancelUrl: string = window.location.origin
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // Get the session and access token properly
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    
    if (!accessToken) { 
      throw new Error('Looks like you need to sign in again. Your session expired!');
    }
    
    // Get the price ID from the plan name
    const product = getProductById(plan);
    if (!product) {
      throw new Error(`Hmm, that plan doesn't look right. Could you try selecting it again?`);
    }
    
    const priceId = product.priceId;
    console.log(`Creating checkout session for ${plan} plan (${product.name}) with price ID: ${priceId}`);
    
    // Call the edge function to create a checkout session
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        price_id: priceId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        mode: 'subscription',
        plan: plan, // Explicitly pass the plan parameter
        allow_promotion_codes: true
      })
    });

    // Handle any errors from the edge function, including trigger exceptions
    if (!response.ok) {
      const errorData = await response.json();
      
      // Look for specific error messages from our database trigger
      if (errorData.error && (
        errorData.error.includes("Subscription change rejected") || 
        errorData.error.includes("only one change per month") ||
        errorData.error.includes("subscription period ends")
      )) {
        return {
          success: false,
          error: "Oops, " + errorData.error.charAt(0).toLowerCase() + errorData.error.slice(1)
        };
      } else {
        throw new Error(errorData.error || `I'm having trouble with the payment service right now. Let me try that again?`);
      }
    }

    const data = await response.json();
    
    if (!data.success || !data.url) {
      throw new Error(data.error || 'Something weird happened with the payment service. Mind trying again?');
    }
    
    return {
      success: true,
      url: data.url
    };
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return {
      success: false,
      error: error.message || 'Something unexpected happened on my end. Let me sort this out?'
    };
  }
};

// Cancel a subscription
export const cancelSubscription = async (
  _userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get the session and access token properly
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    
    if (!accessToken) {
      throw new Error('Looks like you need to sign in again!');
    }
    
    // Call the edge function to cancel the subscription
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-subscription`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Look for specific error messages from our database trigger
      if (errorData.error && (
        errorData.error.includes("Subscription change rejected") || 
        errorData.error.includes("only one change per month") ||
        errorData.error.includes("subscription period ends")
      )) {
        return {
          success: false,
          error: "Hmm, " + errorData.error.charAt(0).toLowerCase() + errorData.error.slice(1)
        };
      } else {
        throw new Error(errorData.error || `I'm having trouble canceling that subscription. Let me try again?`);
      }
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'The subscription service gave me a weird response. Want to try again?');
    }
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return {
      success: false,
      error: error.message || 'I\'m having trouble canceling that subscription. Maybe contact support?'
    };
  }
};

// Update payment method
export const updatePaymentMethod = async (
  returnUrl: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // Get the session and access token properly
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    
    if (!accessToken) {
      throw new Error('Your session looks a bit wonky. Mind signing in again?');
    }
    
    // Call the edge function to update payment method
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-update-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        return_url: returnUrl
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `The billing portal is being difficult. Let me try that again?`);
    }

    const data = await response.json();
    
    if (!data.success || !data.url) {
      throw new Error(data.error || 'Got a strange response from the billing service. Try again?');
    }
    
    return {
      success: true,
      url: data.url
    };
  } catch (error: any) {
    console.error('Error updating payment method:', error);
    return {
      success: false,
      error: error.message || 'The payment update service is acting up. Want to give it another go?'
    };
  }
};