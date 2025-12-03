/**
 * NavbarActions Component
 * Action buttons (notifications, messages, etc.) cho Navbar
 */
import React from 'react';
import { Bell, MessageCircle, User, Menu } from 'lucide-react';

interface NavbarActionsProps {
  onMenuClick?: () => void;
  showMobileMenu?: boolean;
  notificationsCount?: number;
  messagesCount?: number;
}

const NavbarActions: React.FC<NavbarActionsProps> = ({
  onMenuClick,
  showMobileMenu = true,
  notificationsCount = 0,
  messagesCount = 0,
}) => {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {/* Mobile menu button */}
      {showMobileMenu && (
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-all duration-200"
          aria-label="Menu"
        >
          <Menu size={18} className="text-neutral-700 sm:w-5 sm:h-5" />
        </button>
      )}

      {/* Profile shortcut - Desktop only */}
      <button
        className="hidden lg:flex w-9 h-9 xl:w-10 xl:h-10 rounded-xl bg-neutral-100 items-center justify-center hover:bg-neutral-200 transition-all duration-200 group"
        aria-label="Profile"
      >
        <User size={18} className="text-neutral-600 group-hover:text-primary-600 transition-colors xl:w-5 xl:h-5" />
      </button>

      {/* Messages - Desktop only */}
      <button
        className="hidden lg:flex w-9 h-9 xl:w-10 xl:h-10 rounded-xl bg-neutral-100 items-center justify-center hover:bg-neutral-200 transition-all duration-200 relative group"
        aria-label="Messages"
      >
        <MessageCircle
          size={18}
          className="text-neutral-600 group-hover:text-primary-600 transition-colors xl:w-5 xl:h-5"
        />
        {messagesCount > 0 && (
          <span className="absolute top-1 right-1 xl:top-1.5 xl:right-1.5 w-1.5 h-1.5 xl:w-2 xl:h-2 bg-error-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>

      {/* Notifications - Desktop only */}
      <button
        className="hidden lg:flex w-9 h-9 xl:w-10 xl:h-10 rounded-xl bg-neutral-100 items-center justify-center hover:bg-neutral-200 transition-all duration-200 relative group"
        aria-label="Notifications"
      >
        <Bell
          size={18}
          className="text-neutral-600 group-hover:text-primary-600 transition-colors xl:w-5 xl:h-5"
        />
        {notificationsCount > 0 && (
          <span className="absolute top-1 right-1 xl:top-1.5 xl:right-1.5 w-1.5 h-1.5 xl:w-2 xl:h-2 bg-error-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>
    </div>
  );
};

export default NavbarActions;

