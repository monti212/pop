import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, Shield, Zap, Globe, ArrowRight, MessageSquare, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createCheckoutSession } from '../services/stripeService';
import { STRIPE_PRODUCTS, getProductDisplayInfo } from '../stripe-config';
import SignUpModal from './SignUpModal';

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onClose, onSuccess, darkMode = false }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'plans' | 'checkout' | 'success'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<'pro'>('pro');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  // Get product display information
  const plusProduct = getProductDisplayInfo('plus');
  
  const plans = [
    { // This plan is now free for everyone
      id: 'pro',
      name: plusProduct.name,
      price: plusProduct.monthlyPrice,
      description: 'Unlimited messages, file uploads, and all advanced features',
      features: [
        'Unlimited daily messages',
        'File uploads and analysis',
        'Access to all supported languages',
        'Priority support',
        'Advanced features'
      ],
      isPopular: true,
      comingSoon: false // All features are now free
    }
  ];

  const handleSelectPlan = async (planId: 'pro') => {
    setSelectedPlan(planId);
    
    if (!user) {
      // Show sign up modal instead of error
      setShowSignUpModal(true);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create a checkout session for the plus tier
      const result = await createCheckoutSession(
        user.id,
        'plus',
        `${window.location.origin}/checkout/success`
      );
      
      if (!result.success || !result.url) {
        throw new Error(result.error || 'Failed to create checkout session');
      }
      
      // Redirect to Stripe Checkout
      window.location.href = result.url;
    } catch (err: any) {
      console.error('Error creating checkout session:', err);
      setError(err.message || 'An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSignUpSuccess = () => {
    // Close the sign up modal and redirect to checkout with the newly created user
    setShowSignUpModal(false);
    
    // We need to get the new user
    if (user) {
      handleSelectPlan(selectedPlan);
    } else {
      // If user isn't available immediately, we'll wait a moment
      setTimeout(() => {
        if (user) {
          handleSelectPlan(selectedPlan);
        } else {
          setError('Login successful, but user session not found. Please try again.');
        }
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      {showSignUpModal ? (
        <SignUpModal 
          onClose={() => setShowSignUpModal(false)}
          onSuccess={handleSignUpSuccess}
          onSignIn={() => setShowSignUpModal(false)}
        />
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`${
            darkMode ? 'bg-navy-500' : 'bg-white'
          } rounded-xl shadow-lg max-w-2xl w-full overflow-hidden`}
        >
          {/* Header */}
          <div className={`p-6 flex justify-between items-center border-b ${
            darkMode ? 'border-white/10' : 'border-gray-200'
          }`}>
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {step === 'plans' ? 'Choose a Plan' : 
               step === 'checkout' ? 'Complete Your Purchase' : 
               'Subscription Complete!'}
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full ${
                darkMode 
                  ? 'hover:bg-white/10 text-white/70' 
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

                  Upgrade to {plusProduct.name} • {plusProduct.monthlyPrice}
            {step === 'plans' && (
              <div className="space-y-6">
                <p className={`text-center ${darkMode ? 'text-white/80' : 'text-gray-600'}`}>
                  Choose the plan that's right for you. All plans include our core AI features.
                </p>
                
                {error && (
                  <div className={`p-3 rounded-lg ${
                    darkMode ? 'bg-red-900/30 border border-red-800/30' : 'bg-red-50 border border-red-100'
                  } mb-4`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                        darkMode ? 'text-red-400' : 'text-red-500'
                      }`} />
                      <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  {plans.map(plan => (
                    <motion.div
                      key={plan.id}
                      className={`p-5 rounded-lg border ${
                        plan.isPopular
                          ? darkMode 
                            ? 'border-teal bg-teal/10' 
                            : 'border-teal bg-teal/5'
                          : darkMode 
                            ? 'border-white/10 hover:border-white/20' 
                            : 'border-gray-200 hover:border-gray-300'
                      } transition-all duration-200`}
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {plan.name}
                          </h3>
                          <p className={`text-xl font-bold ${
                            darkMode ? 'text-teal' : 'text-teal-600'
                          }`}>{plan.price}</p>
                        </div>
                        
                        {plan.isPopular && (
                          <span className="px-2 py-1 bg-teal text-white text-xs rounded-full font-medium">
                            Most Popular
                          </span>
                        )}
                      </div>
                      
                      <p className={`mb-4 ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                        {plan.description}
                      </p>
                      
                      <div className="mb-4 space-y-2">
                        {plan.features.map((feature, i) => (
                          <div key={i} className="flex items-start">
                            <CheckCircle className={`w-5 h-5 mr-2 text-teal flex-shrink-0 mt-0.5`} />
                            <p className={`${darkMode ? 'text-white/90' : 'text-gray-700'}`}>{feature}</p>
                          </div>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => handleSelectPlan('pro')}
                        disabled={true} // Temporarily disabled
                        className={`w-full py-2.5 rounded-lg ${
                          plan.isCurrent
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        } transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-1.5`}
                      >
                        {plan.isCurrent && plan.id === 'free' ? (
                          <Check className="w-4 h-4 mr-1" />
                        ) : null}
                        {plan.id === 'pro' ? 'Coming Soon' : plan.buttonText}
                      </button>
                    </motion.div>
                  ))}
                </div>
                
                <div className="space-y-2 pt-4">
                  <div className="flex items-start">
                    <Shield className={`w-4 h-4 mr-2 text-teal flex-shrink-0 mt-0.5`} />
                    <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                      All subscriptions include a 7-day money-back guarantee
                    </p>
                  </div>
                  
                  <div className="flex items-start">
                    <Zap className={`w-4 h-4 mr-2 text-teal flex-shrink-0 mt-0.5`} />
                    <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                      Instant access to all premium features after payment
                    </p>
                  </div>
                  
                  <div className="flex items-start">
                    <Globe className={`w-4 h-4 mr-2 text-teal flex-shrink-0 mt-0.5`} />
                    <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                      Cancel anytime - no hidden fees or commitments
                    </p>
                  </div>
                </div>
              </div>
            )}
        </motion.div>
      )}
    </div>
  );
};

export default SubscriptionModal;