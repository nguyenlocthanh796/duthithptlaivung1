/**
 * NavbarLogo Component
 * Logo component cho Navbar
 */
import React from 'react';
import { Sparkles } from 'lucide-react';

interface NavbarLogoProps {
  showText?: boolean;
}

const NavbarLogo: React.FC<NavbarLogoProps> = ({ showText = true }) => {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center shadow-md shadow-primary-500/30">
        <Sparkles className="text-white" size={16} />
      </div>
      {showText && (
        <span className="text-lg sm:text-xl font-display font-bold text-gradient hidden sm:block">
          EduSystem
        </span>
      )}
    </div>
  );
};

export default NavbarLogo;

