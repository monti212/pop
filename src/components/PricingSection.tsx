import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, CloudLightning as Lightning, MessageSquare, FileText, Globe } from 'lucide-react';
import SubscriptionModal from './SubscriptionModal';
import { STRIPE_PRODUCTS, getProductDisplayInfo } from '../stripe-config';

interface PricingSectionProps {
  onSignUp: () => void;
}

const PricingSection: React.FC<PricingSectionProps> = ({ onSignUp }) => {
  const [showProModal, setShowProModal] = useState(false);
  
  // Get product information with pricing
  const freeProduct = getProductDisplayInfo('free');
  const plusProduct = getProductDisplayInfo('plus');
  
  const plans = [
    {
      id: 'free',
      name: freeProduct.name,
      price: freeProduct.price,
      period: '',
      features: [
        'Up to 25 messages per day',
        'Core AI Access for locally relevant insights',
        'Basic Language Support: English, Setswana, and Swahili',
        'Text-only queries and responses',
        'Ideal for individual learners and small-scale pilots'
      ],
      buttonText: 'Sign Up',
      buttonStyle: 'secondary',
      disabled: false
    },
    {
      id: 'pro',
      name: plusProduct.name,
      price: plusProduct.monthlyPrice,
      period: '/month',
      features: [
        'Unlimited messages',
        'File uploads and analysis',
        'Access to all languages',
        'Priority support'
      ],
      buttonText: 'Coming Soon',
      buttonStyle: 'primary',
      disabled: true,
      isPopular: true
    },
    {
      id: 'business',
      name: 'Business',
      price: 'Custom',
      period: '',
      features: [
        'API keys',
        'Dedicated uptime',
        'On-prem option',
        'Custom integrations',
        'Premium support'
      ],
      buttonText: 'Talk to Sales',
      buttonStyle: 'secondary',
      disabled: false
    }
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-deep-navy">
            Simple, Transparent Pricing
          </h2>
          <p className="text-deep-navy/70 text-lg">
            Start with Uhuru Free, upgrade to Plus when you're ready. No hidden fees, cancel anytime.
          </p>
        </motion.div>
        
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              className={`relative bg-white rounded-2xl p-8 border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                plan.isPopular 
                  ? 'border-teal shadow-lg' 
                  : 'border-gray-100 hover:border-teal/50'
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
              viewport={{ once: true }}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-teal to-accent-orange text-white px-4 py-1 text-sm font-semibold rounded-full">
                    Most Popular
                  </div>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="font-headline text-2xl font-bold text-deep-navy mb-4">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-deep-navy">{plan.price}</span>
                  {plan.period && <span className="text-deep-navy/60 ml-1">{plan.period}</span>}
                </div>
              </div>
              
              <div className="space-y-4 mb-8">
                {plan.features.map((feature: string, featureIndex: number) => (
                  <div key={featureIndex} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-teal mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-deep-navy">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => {
                  if (plan.id === 'pro') setShowProModal(true);
                  else if (plan.id === 'free') onSignUp();
                  else if (plan.id === 'business') window.open('mailto:sales@orionx.xyz', '_blank');
                }}
                disabled={plan.disabled}
                className={`w-full py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-[0.97] disabled:hover:scale-100 disabled:cursor-not-allowed ${
                  plan.buttonStyle === 'primary'
                    ? plan.disabled 
                      ? 'bg-gray-300 text-gray-500'
                      : 'bg-gradient-to-r from-teal to-teal-600 text-white shadow-lg hover:shadow-xl'
                    : 'border-2 border-deep-navy text-deep-navy hover:bg-deep-navy hover:text-white'
                }`}
              >
                {plan.buttonText}
              </button>
              
              <div className="absolute -top-6 -left-6 w-12 h-12 rounded-full bg-teal/5"></div>
              <div className="absolute -bottom-10 -right-10 w-20 h-20 rounded-full bg-teal/5"></div>
            </motion.div>
          ))}
        </div>
        
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center text-sm text-deep-navy/60 mt-8"
        >
          All plans include encrypted storage and simple cancellation anytime.
        </motion.p>
      </div>
      
      {showProModal && (
        <SubscriptionModal 
          onClose={() => setShowProModal(false)}
          onSuccess={() => setShowProModal(false)}
        />
      )}
    </section>
  );
};

export default PricingSection;