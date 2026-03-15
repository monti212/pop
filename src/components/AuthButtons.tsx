import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, LogIn, MessageSquare } from 'lucide-react';

interface AuthButtonsProps {
  isAuthenticated: boolean;
  onSignIn: () => void;
  onSignUp: () => void;
  heroMode?: boolean;
}

const AuthButtons: React.FC<AuthButtonsProps> = ({
  isAuthenticated,
  onSignIn,
  onSignUp,
  heroMode = false,
}) => {
  const [, _setShowTooltip] = useState(false);

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <motion.button
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-2 rounded-12 border border-teal/30 text-teal hover:bg-teal/10 font-medium transition-colors duration-200 text-xs sm:text-sm"
          onClick={() => {}} // No longer opens chat directly
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Open Uhuru</span>
        </motion.button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
      <motion.button
        className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm ${
          heroMode
            ? 'bg-white/80 backdrop-blur-sm border border-teal hover:bg-white/90 hover:shadow-lg hero-gradient-text'
            : 'border border-teal/30 text-teal hover:bg-teal/10'
        }`}
        onClick={onSignIn}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
      >
        <LogIn className="w-4 h-4" />
        <span>Log In</span>
      </motion.button>

      <motion.button
        data-testid="signup-button"
        className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm ${
          heroMode
            ? 'bg-white/80 backdrop-blur-sm border border-teal hover:bg-white/90 hover:shadow-lg hero-gradient-text'
            : 'bg-teal hover:bg-teal/90 text-white shadow-glow'
        }`}
        onClick={onSignUp}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
      >
        <User className="w-4 h-4" />
        <span>Sign Up for Free</span>
      </motion.button>
    </div>
  );
};

export default AuthButtons;