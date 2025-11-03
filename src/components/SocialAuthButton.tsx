import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface SocialAuthButtonProps {
  provider: string;
  icon: LucideIcon;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'outlined' | 'filled';
}

const SocialAuthButton: React.FC<SocialAuthButtonProps> = ({
  provider,
  icon: Icon,
  onClick,
  isLoading = false,
  disabled = false,
  variant = 'outlined'
}) => {
  const baseClasses = "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all duration-200 text-sm min-h-[44px]";

  const variantClasses = variant === 'outlined'
    ? "border border-[#0170b9]/20 bg-white text-[#002F4B] hover:bg-[#0170b9]/5 hover:border-[#0170b9]/40"
    : "bg-gradient-to-r from-[#0170b9] to-[#0096B3] hover:from-[#015a94] hover:to-[#007a94] text-white shadow-lg";

  const disabledClasses = disabled || isLoading
    ? "opacity-50 cursor-not-allowed"
    : "";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses} ${disabledClasses}`}
      whileHover={!disabled && !isLoading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <Icon className="w-5 h-5" />
          <span>Continue with {provider}</span>
        </>
      )}
    </motion.button>
  );
};

export default SocialAuthButton;
