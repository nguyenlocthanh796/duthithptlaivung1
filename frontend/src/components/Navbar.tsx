/**
 * Navbar Component - Optimized & Modular
 * Thanh điều hướng trên cùng được tối ưu và chia nhỏ thành các component
 */
import React from 'react';
import NavbarLogo from './navbar/NavbarLogo';
import NavbarSearch from './navbar/NavbarSearch';
import NavbarNav from './navbar/NavbarNav';
import NavbarActions from './navbar/NavbarActions';
import NavbarProfile from './navbar/NavbarProfile';

interface NavbarProps {
  onMenuClick: () => void;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick, onLogout }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-lg border-b border-neutral-200 z-50 flex items-center px-2 sm:px-3 md:px-4 shadow-soft">
      <div className="max-w-[1920px] mx-auto w-full flex items-center justify-between gap-1 sm:gap-2">
        {/* Left: Logo & Search */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-1 min-w-0">
          <NavbarLogo showText={false} />
          <NavbarSearch placeholder="Tìm kiếm..." />
        </div>

        {/* Center: Main Navigation - Hidden on mobile/tablet */}
        <NavbarNav activeId="home" />

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <NavbarActions onMenuClick={onMenuClick} />
          <NavbarProfile onLogout={onLogout} />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

