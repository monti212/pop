import React from 'react';
import logoImage from '../assets/pencils-of-promise-logo.png';

interface LogoProps {
  className?: string;
  hideText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "h-8", hideText = false }) => {
  return (
    <img
      src={logoImage}
      alt="Pencils of Promise"
      className={className}
    />
  );
};

export default Logo;