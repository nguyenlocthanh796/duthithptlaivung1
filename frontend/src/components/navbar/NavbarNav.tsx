/**
 * NavbarNav Component
 * Navigation buttons cho Navbar
 */
import React from 'react';
import { Home, Users } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  active?: boolean;
  onClick?: () => void;
}

interface NavbarNavProps {
  items?: NavItem[];
  activeId?: string;
}

const NavbarNav: React.FC<NavbarNavProps> = ({
  items,
  activeId = 'home',
}) => {
  const defaultItems: NavItem[] = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'groups', label: 'Nhóm', icon: Users },
  ];

  const navItems = items || defaultItems;

  return (
    <div className="hidden lg:flex items-center gap-1 flex-1 justify-center max-w-[400px]">
      {navItems.map((item) => {
        const isActive = activeId === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`flex-1 flex items-center justify-center h-12 rounded-xl transition-all duration-200 relative group ${
              isActive ? 'bg-primary-50' : 'hover:bg-neutral-100'
            }`}
            title={item.label}
          >
            <Icon
              size={22}
              className={`transition-all ${
                isActive
                  ? 'text-primary-600 scale-110'
                  : 'text-neutral-500 group-hover:text-primary-600 group-hover:scale-110'
              }`}
            />
            {isActive && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary-600 rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default NavbarNav;

