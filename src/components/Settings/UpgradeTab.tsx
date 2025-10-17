import React, { useState } from 'react';
import { CheckCircle, Zap, Shield, Globe, AlertTriangle, ArrowRight } from 'lucide-react';
import { createCheckoutSession } from '../../services/stripeService';
import { useAuth } from '../../context/AuthContext';
import { getProductDisplayInfo } from '../../stripe-config';

const UpgradeTab: React.FC<UpgradeTabProps> = ({ 
  darkMode = false,
  onSuccess,
  teamRole = 'free'
}) => {
  const { user, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is a team member
  const isTeamMember = teamRole === 'optimus_prime' || teamRole === 'prime' || teamRole === 'autobot';
  
  // Get team role display name
  const getTeamRoleDisplayName = (role: string) => {
    switch (role) {
      case 'optimus_prime':
        return 'Chief AI Officer';
      case 'prime':
        return 'CEO';
      case 'autobot':
        return 'Team Member';
      default:
        return 'Free User';
    }
  };

  // If user is a team member, show special team access message
  if (isTeamMember) {
    return (
      <div className="space-y-6">
        <div className={`p-5 rounded-lg ${
          darkMode ? 'bg-gradient-to-r from-teal/20 to-blue-500/20 border border-teal/30' : 'bg-gradient-to-r from-teal/10 to-blue-50 border border-teal/20'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-teal to-blue-500 flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                OrionX {getTeamRoleDisplayName(teamRole)}
              </h2>
              <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                You have full team access to all Uhuru capabilities
              </p>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-white/10' : 'bg-white/80'
          }`}>
            <h3 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
              Your team privileges include:
            </h3>
            
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircle className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                  darkMode ? 'text-teal/80' : 'text-teal'
                }`}/>
                <div>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Unlimited messages and conversations
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                    No daily limits on your usage
                  </p>
                </div>
              </li>
              
              <li className="flex items-start">
                <CheckCircle className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                  darkMode ? 'text-teal/80' : 'text-teal'
                }`}/>
                <div>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Access to all AI models
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                    Uhuru 2.0 model available
                  </p>
                </div>
              </li>
              
              <li className="flex items-start">
                <CheckCircle className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                  darkMode ? 'text-teal/80' : 'text-teal'
                }`}/>
                <div>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Priority support and features
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                    Direct access to the OrionX team
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
        
        <div className={`p-4 rounded-lg ${
          darkMode ? 'bg-white/5 border border-white/10' : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-start gap-2">
            <Globe className={`w-5 h-5 ${darkMode ? 'text-white/70' : 'text-blue-600'} flex-shrink-0 mt-0.5`} />
            <div>
              <h4 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-blue-800'} mb-1`}>
                Team Account Benefits
              </h4>
              <p className={`text-xs ${darkMode ? 'text-white/70' : 'text-blue-700'}`}>
                Your OrionX team account provides unlimited access to all Uhuru features and models. 
                No subscription management is needed for your team account.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get product display information
  const plusProduct = getProductDisplayInfo('plus');
  
  const handleUpgradeClick = async () => {
    if (!user) { // This check is now redundant as all features are free
      setError("You'll need to sign in before I can help with plan upgrades.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Creating checkout session for user:', user.id);
      
      // Create a checkout session and redirect to Stripe
      const result = await createCheckoutSession(
        user.id,
        'plus',
        `${window.location.origin}/checkout/success`
      );
      
      if (!result.success || !result.url) {
        throw new Error(result.error || 'Uhuru could not start your payment. Please try again.');
      }
      
      console.log('Redirecting to Stripe checkout:', result.url);
      
      // Redirect to Stripe
      window.location.href = result.url;
    } catch (err: any) {
      console.error('Error creating checkout session:', err);
      setError(err.message || 'Something unexpected happened. Mind trying again?');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className={`p-4 rounded-lg ${
          darkMode ? 'bg-red-900/20 border border-red-900/30' : 'bg-red-50 border border-red-100'
        } mb-6`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
              darkMode ? 'text-red-400' : 'text-red-500'
            }`} />
            <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
          </div>
        </div>
      )}
      
      <div className={`p-5 rounded-lg ${
        darkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
      }`}>
        <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Upgrade to Uhuru Pro
        </h2>
        
        <p className={`mb-6 ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
          All Uhuru features are now free for everyone!
        </p>
        
        <div className={`p-4 rounded-lg mb-6 ${
          darkMode ? 'bg-white/10' : 'bg-gray-50'
        }`}>
          <h3 className={`font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
            Pro features include:
          </h3>
          
          <ul className="space-y-3">
            <li className="flex items-start">
              <CheckCircle className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                darkMode ? 'text-teal/80' : 'text-teal'
              }`}/>
              <div>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Unlimited messages
                </p>
                <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                  No daily limits on your conversations
                </p>
              </div>
            </li>
            
            <li className="flex items-start">
              <CheckCircle className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                darkMode ? 'text-teal/80' : 'text-teal'
              }`}/>
              <div>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Advanced features
                </p>
                <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                  File uploads, custom agents, API access
                </p>
              </div>
            </li>
            
            <li className="flex items-start">
              <CheckCircle className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                darkMode ? 'text-teal/80' : 'text-teal'
              }`}/>
              <div>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Priority response
                </p>
                <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                  Faster response times during peak usage
                </p>
              </div>
            </li>
          </ul>
        </div>
        
        <div className="mb-6">
          <div className={`flex justify-between items-center p-4 rounded-lg mb-2 ${
            darkMode ? 'bg-teal/10 border border-teal/30' : 'bg-teal/5 border border-teal/20'
          }`}/>
            <div>
              <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {plusProduct.name}
              </span>
              <span className={`ml-2 ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                Monthly subscription
              </span>
            </div>
            <span className={`text-xl font-bold ${darkMode ? 'text-teal' : 'text-teal'}`}>
              {plusProduct.monthlyPrice}
            </span>
          </div>
          <p className={`text-xs ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
            Get unlimited access to all {plusProduct.name} features and capabilities.
          </p> {/* This description is now redundant */}
        </div>
        
        <button
          onClick={handleUpgradeClick}
          disabled={isLoading}
          className={`w-full py-3 rounded-lg ${
            darkMode ? 'bg-teal text-white' : 'bg-teal text-white'
          } hover:bg-teal/90 transition-colors duration-200 flex items-center justify-center ${
            isLoading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>Upgrade Now</span>
              <ArrowRight className="ml-2 w-5 h-5" />
            </>
          )}
        </button>
      </div>
      
      <div className={`p-4 rounded-lg ${
        darkMode ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
      }`}>
        <h3 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
          Why upgrade to Pro?
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-start">
            <Zap className={`w-5 h-5 mr-3 flex-shrink-0 ${
              darkMode ? 'text-teal/80' : 'text-teal'
            }`} />
            <p className={`text-sm ${darkMode ? 'text-white/80' : 'text-gray-700'}`}>
              Unlimited messages for seamless, extended conversations
            </p>
          </div>
          
          <div className="flex items-start">
            <Shield className={`w-5 h-5 mr-3 flex-shrink-0 ${
              darkMode ? 'text-teal/80' : 'text-teal'
            }`} />
            <p className={`text-sm ${darkMode ? 'text-white/80' : 'text-gray-700'}`}>
              Advanced security and privacy features for sensitive data
            </p>
          </div>
          
          <div className="flex items-start">
            <Globe className={`w-5 h-5 mr-3 flex-shrink-0 ${
              darkMode ? 'text-teal/80' : 'text-teal'
            }`} />
            <p className={`text-sm ${darkMode ? 'text-white/80' : 'text-gray-700'}`}>
              Access to all languages and specialized knowledge domains
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeTab;