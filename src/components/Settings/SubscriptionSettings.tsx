import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle, MessageSquare, FileText, Globe, Bot,
  User,
  Heart,
  Key
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SubscriptionSettingsProps {
  darkMode?: boolean;
  userSubscription?: any;
  teamRole?: 'optimus_prime' | 'prime' | 'autobot' | 'free';
}

const SubscriptionSettings: React.FC<SubscriptionSettingsProps> = ({ 
  darkMode = false,
  userSubscription,
  teamRole = 'free'
}) => {
  const { user, profile } = useAuth();

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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

  // All features are now free for everyone, so this list represents what's available
  const allFeatures = [
    {
      icon: <MessageSquare className="w-4 h-4 text-teal" />,
      title: "Unlimited Messages",
      description: "Chat as much as you need with no daily limits"
    },
    {
      icon: <FileText className="w-4 h-4 text-teal" />,
      title: "File Uploads & Analysis",
      description: "Upload and analyze documents with AI assistance"
    },
    {
      icon: <Globe className="w-4 h-4 text-teal" />,
      title: "Multi-Language Support",
      description: "Communicate in 25+ African and international languages"
    },
    {
      icon: <Bot className="w-4 h-4 text-teal" />,
      title: "Advanced AI Models",
      description: "Access to Uhuru 2.0 model"
    },
    {
      icon: <Globe className="w-4 h-4 text-teal" />,
      title: "Web Search & Research",
      description: "Search the web and gather information from multiple sources"
    },
    {
      icon: <FileText className="w-4 h-4 text-teal" />,
      title: "Uhuru Docs & Sheets",
      description: "Create documents and spreadsheets with AI assistance"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Account Information */}
      <div className={`p-5 rounded-lg ${
        darkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            'bg-teal/20'
          }`}>
            <User className="w-6 h-6 text-teal" />
          </div>
          <div>
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Your Uhuru Account
            </h3>
            <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
              Free access to all Uhuru features and capabilities
            </p>
          </div>
        </div>

        {/* Account Details */}
        {profile && (
          <div className={`p-4 rounded-lg mb-4 ${
              isTeamMember ? 'bg-gradient-to-r from-teal to-blue-500 text-white' : 'bg-teal/20'
          }`}>
            <div className="flex items-center gap-3">
              <User className={`w-6 h-6 ${isTeamMember ? 'text-white' : 'text-teal'}`} />
              <div>
                <p className={`text-xs font-medium ${darkMode ? 'text-white/70' : 'text-gray-500'} mb-1`}>
                  {isTeamMember ? 'TEAM ROLE' : 'MEMBER SINCE'}
                </p>
                <h3 className="text-lg font-medium text-gray-900">
                  {isTeamMember ? `Your OrionX ${getTeamRoleDisplayName(teamRole)} Account` : 'Your Uhuru Account'}
                </h3>
                <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {isTeamMember ? 'Full team access with unlimited features' : 'Free access to all Uhuru features and capabilities'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* All Available Features */}
      <div className={`p-5 rounded-lg ${
        darkMode ? 'bg-white/5 border border-white/10' : isTeamMember ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' : 'bg-white border border-gray-200'
      }`}>
        <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {isTeamMember ? 'Your Team Features' : 'Your Uhuru Features'}
        </h4>
        
        <div className="space-y-4">
          {allFeatures.map((feature, index) => (
            <div 
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg ${
                darkMode ? 'bg-white/5' : 'bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                darkMode ? 'bg-teal/20' : isTeamMember ? 'bg-green-100' : 'bg-teal/10'
              }`}>
                <div className={isTeamMember ? 'text-green-600' : ''}>
                  {feature.icon}
                </div>
              </div>
              <div className="flex-1">
                <h5 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {feature.title}
                </h5>
                <p className={`text-xs mt-1 ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                  {feature.description}
                </p>
              </div>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-teal/20 text-teal' : isTeamMember ? 'bg-green-100 text-green-600' : 'bg-teal/10 text-teal'
              }`}>
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
        
        {isTeamMember && (
          <div className={`p-4 rounded-lg mt-4 ${
            darkMode ? 'bg-white/5 border border-white/10' : 'bg-gradient-to-r from-teal/5 to-blue-50 border border-teal/20'
          }`}>
            <div>
              <p className={`text-xs font-medium ${darkMode ? 'text-white/70' : 'text-gray-500'} mb-1`}>
                PRIVILEGES
              </p>
              <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Unlimited messages • All AI models • Priority support
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mission Statement */}
      <div className={`p-5 rounded-lg ${
        darkMode ? 'bg-navy/20 border border-navy/30' : isTeamMember ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200' : 'bg-navy/5 border border-navy/20'
      }`}>
        <div className="flex items-start gap-2">
          <Globe className={\`w-5 h-5 flex-shrink-0 ${
            darkMode ? 'text-navy/70' : isTeamMember ? 'text-blue-600' : 'text-navy'
          }`} />
          <div>
            <h3 className={\`text-sm font-medium ${darkMode ? 'text-white' : 'text-navy'}`}>
              {isTeamMember ? 'OrionX Team Member' : 'Our Mission'}
            </h3>
            <p className={\`text-xs mt-1 ${darkMode ? 'text-white/70' : 'text-navy/70'}`}>
              {isTeamMember ? (
                \`As an OrionX ${getTeamRoleDisplayName(teamRole)}, you have full access to all Uhuru capabilities and advanced AI models. Your usage helps us refine the platform for all users across Africa.`
              ) : (
                <>
                  Uhuru is committed to democratizing access to advanced AI technology for every African. 
                  All features are free because we believe everyone deserves access to intelligent assistance.
                  For support, contact us at{' '}
                  <a 
                    href="mailto:support@orionx.xyz" 
                    className={\`underline ${darkMode ? 'text-teal' : 'text-teal'}`}
                  >
                    support@orionx.xyz
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSettings;