/**
 * NavbarProfile Component
 * Profile dropdown menu cho Navbar
 */
import React, { useState, useEffect, useRef } from 'react';
import { LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavbarProfileProps {
  onLogout: () => void;
}

const NavbarProfile: React.FC<NavbarProfileProps> = ({ onLogout }) => {
  const { currentUser } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const getInitials = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName.charAt(0).toUpperCase();
    }
    if (currentUser?.email) {
      return currentUser.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center hover:shadow-md hover:scale-105 transition-all duration-200 shadow-md shadow-primary-500/30"
        aria-label="Profile menu"
      >
        <span className="text-white font-semibold text-xs sm:text-sm">{getInitials()}</span>
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-large border border-neutral-200 z-50 overflow-hidden animate-scale-in">
            {/* Profile header */}
            <div className="p-4 border-b border-neutral-200 bg-gradient-to-r from-primary-50 to-accent-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center shadow-md">
                  <span className="text-white font-semibold text-lg">{getInitials()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-neutral-900 truncate">
                    {currentUser?.displayName || currentUser?.email || 'Người dùng'}
                  </div>
                  <div className="text-xs text-neutral-600 truncate">
                    {currentUser?.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-2">
              <button
                onClick={() => {
                  setShowMenu(false);
                  // Navigate to profile
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 transition-all duration-200 text-left group"
              >
                <User size={18} className="text-neutral-600 group-hover:text-primary-600 transition-colors" />
                <span className="text-sm font-medium text-neutral-700">Hồ sơ</span>
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  // Navigate to settings
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 transition-all duration-200 text-left group"
              >
                <Settings size={18} className="text-neutral-600 group-hover:text-primary-600 transition-colors" />
                <span className="text-sm font-medium text-neutral-700">Cài đặt</span>
              </button>
              <div className="h-px bg-neutral-200 my-1" />
              <button
                onClick={() => {
                  setShowMenu(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-error-50 transition-all duration-200 text-left group"
              >
                <LogOut
                  size={18}
                  className="text-error-600 group-hover:scale-110 transition-transform"
                />
                <span className="text-sm font-medium text-error-600">Đăng xuất</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NavbarProfile;

