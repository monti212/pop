import React from 'react';

interface LogoProps {
  className?: string;
  hideText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "h-8", hideText = false }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/PoPLogo_color-01-01 copy.png"
        alt="Pencils of Promise Logo"
        className="h-8 sm:h-10 w-auto"
      />
    </div>
  );
};

export default Logo;