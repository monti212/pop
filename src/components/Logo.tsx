import React from 'react';
import { Pencil } from 'lucide-react';

interface LogoProps {
  className?: string;
  hideText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "h-8", hideText = false }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#0170b9] to-[#f5b233] rounded-lg shadow-md">
        <Pencil className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
      </div>
      {!hideText && (
        <div className="flex flex-col leading-tight">
          <span className="text-sm sm:text-base font-bold text-[#0170b9] font-headline tracking-tight">
            Pencils of Promise
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;