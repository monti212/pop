import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ExternalLink,
  Check,
  AlertTriangle,
  Loader,
  Shield,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updatePaymentMethod } from '../../services/stripeService';
import { supabase } from '../../services/authService';

interface SubscriptionPaymentMethod {
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
}

interface PaymentMethodSettingsProps {
  darkMode?: boolean;
  userSubscription?: any;
  teamRole?: 'supa_admin' | 'admin' | 'prime' | 'free';
}

const PaymentMethodSettings: React.FC<PaymentMethodSettingsProps> = ({ 
  darkMode = false,
  userSubscription,
  teamRole = 'free'
}) => {
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<SubscriptionPaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if user is a team member
  const isTeamMember = teamRole === 'supa_admin' || teamRole === 'admin' || teamRole === 'prime';
  
  // Get team role display name
  const getTeamRoleDisplayName = (role: string) => {
    switch (role) {
      case 'supa_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'prime':
        return 'Premium User';
      default:
        return 'Free User';
    }
  };

  // If user is a team member, show team account message
  if (isTeamMember) {
    return (
      <div className="space-y-6">
        <div className={`p-5 rounded-lg ${
          darkMode ? 'bg-gradient-to-r from-teal/20 to-blue-500/20 border border-teal/30' : 'bg-gradient-to-r from-teal/10 to-blue-50 border border-teal/20'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-teal to-blue-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                OrionX Team Account
              </h2>
              <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                {getTeamRoleDisplayName(teamRole)} - No payment management needed
              </p>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-white/10' : 'bg-white/80'
          }`}>
            <h3 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
              Team Account Information:
            </h3>
            
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircle className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                  darkMode ? 'text-teal/80' : 'text-teal'
                }`}/>
                <div>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Organization-managed account
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                    Your access is provided through OrionX team membership
                  </p>
                </div>
              </li>
              
              <li className="flex items-start">
                <CheckCircle className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                  darkMode ? 'text-teal/80' : 'text-teal'
                }`}/>
                <div>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    No billing or payment methods
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                    Team accounts do not require individual payment setup
                  </p>
                </div>
              </li>
              
              <li className="flex items-start">
                <CheckCircle className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                  darkMode ? 'text-teal/80' : 'text-teal'
                }`}/>
                <div>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Full feature access included
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                    All Uhuru capabilities are available to your role
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
        
        <div className={`p-4 rounded-lg ${
          darkMode ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
        }`}>
          <div className="flex items-start gap-2">
            <Calendar className={`w-5 h-5 ${darkMode ? 'text-white/70' : 'text-gray-600'} flex-shrink-0 mt-0.5`} />
            <div>
              <h4 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'} mb-1`}>
                Need Help?
              </h4>
              <p className={`text-xs ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                For account questions or team management, contact{' '}
                <a 
                  href="mailto:admin@orionx.xyz" 
                  className={`underline ${darkMode ? 'text-teal' : 'text-teal'}`}
                >
                  admin@orionx.xyz
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  useEffect(() => {
    if (user) { // All users are now "pro" in terms of features
      fetchSubscriptionPaymentMethod();
    } else {
      setIsLoading(false);
    }
  }, [user, userSubscription]);

  const fetchSubscriptionPaymentMethod = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get the user's Stripe customer ID
      const { data: customerData, error: customerError } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (customerError) {
        throw new Error('Uhuru could not find your customer data. Please try again or contact support.');
        throw new Error('I can\'t find your customer details. Maybe contact support?');
      }
      
      if (!customerData) {
        setPaymentMethod(null);
        return;
      }

      // Get subscription payment method details
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('stripe_subscriptions')
        .select('payment_method_brand, payment_method_last4')
        .eq('customer_id', customerData.customer_id)
        .maybeSingle();
      
      if (subscriptionError) {
        throw new Error('Uhuru could not retrieve your payment details. Please try again.');
        throw new Error('I couldn\'t grab your payment details. Want to try again?');
      }
      
      if (subscriptionData && subscriptionData.payment_method_brand && subscriptionData.payment_method_last4) {
        setPaymentMethod({
          brand: subscriptionData.payment_method_brand,
          last4: subscriptionData.payment_method_last4
        });
      } else {
        setPaymentMethod(null);
      }
    } catch (err: any) {
      console.error('Error fetching subscription payment method:', err);
      setError(err.message || 'Uhuru could not load your payment method. Please try again.');
      setError(err.message || 'I couldn\'t load your payment method. Try again?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!user) return;
    
    setIsUpdating(true);
    setError(null);
    
    try {
      const result = await updatePaymentMethod(
        `${window.location.origin}/settings?tab=payment-methods`
      );
      
      if (!result.success || !result.url) {
        throw new Error(result.error || 'The billing portal is being difficult. Maybe contact support?');
      }
      
      // Redirect to Stripe Customer Portal
      window.location.href = result.url;
    } catch (err: any) {
      console.error('Error opening billing portal:', err);
      setError(err.message || 'Uhuru could not open billing management. Please try again or contact support.');
      setError(err.message || 'Billing management isn\'t cooperating. Try again or contact support?');
    } finally {
      setIsUpdating(false);
    }
  };

  const getCardBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      case 'discover':
        return '💳';
      default:
        return '💳';
    }
  };

  return (
    <div className="space-y-6">
      <div className={`p-4 rounded-lg ${
        darkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Subscription Payment Method
            </h3>
            <p className={`text-sm mt-1 ${darkMode ? 'text-white/70' : 'text-gray-500'}`}>
              Manage the payment method for your Uhuru subscription
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Content based on subscription status */}
        {false ? ( // This section is now always false as all features are free
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <h4 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              No Active Subscription
            </h4>
            <p className={`text-sm mb-4 ${darkMode ? 'text-white/70' : 'text-gray-500'}`}>
              You're currently on the free plan. Upgrade to Pro to manage subscription billing.
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader className="w-6 h-6 animate-spin text-teal" />
          </div>
        ) : paymentMethod ? (
          <div className="space-y-4">
            {/* Current Payment Method Display */}
            <div className="p-4 rounded-lg border border-teal bg-teal/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {getCardBrandIcon(paymentMethod.brand || '')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {paymentMethod.brand?.toUpperCase()} •••• {paymentMethod.last4}
                      </span>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-teal/20 text-teal rounded-full">
                        <Check className="w-3 h-3" />
                        <span className="text-xs font-medium">Active</span>
                      </div>
                    </div>
                    <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-500'}`}>
                      Default payment method for your subscription
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Manage Billing Button */}
            <button
              onClick={handleManageBilling}
              disabled={isUpdating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Opening Billing Portal...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Manage Billing & Payment Methods
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* No Payment Method Found */}
            <div className="text-center py-6">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-orange-500" />
              <h4 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                No Payment Method Found
              </h4>
              <p className={`text-sm mb-4 ${darkMode ? 'text-white/70' : 'text-gray-500'}`}>
                Your Pro subscription doesn't have payment method details available.
              </p>
            </div>

            {/* Manage Billing Button */}
            <button
              onClick={handleManageBilling}
              disabled={isUpdating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Opening Billing Portal...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Manage Billing & Payment Methods
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Information Cards */}
      <div className="space-y-4">
        {/* Security Notice */}
        <div className="p-4 rounded-lg bg-green-50 border border-green-100">
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-green-800">
                Secure Payment Processing
              </h3>
              <p className="text-xs mt-1 text-green-700">
                Your payment information is securely processed and stored by Stripe. We never store your card details on our servers.
              </p>
            </div>
          </div>
        </div>

        {/* Billing Information */}
        {true && ( // This section is now always true as all features are free
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
            <div className="flex items-start gap-2">
              <Calendar className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  Billing Management
                </h3>
                <p className="text-xs mt-1 text-blue-700">
                  Use the "Manage Billing" button to:
                </p>
                <ul className="text-xs mt-1 text-blue-700 list-disc list-inside">
                  <li>Update your payment method</li>
                  <li>View and download invoices</li>
                  <li>Update billing address</li>
                  <li>Cancel or modify your subscription</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentMethodSettings;