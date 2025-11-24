import { Link, useLocation } from 'react-router-dom'

/**
 * Navigation Sidebar Component
 * Tối ưu hóa và tách riêng để code sạch hơn
 */
export function NavigationSidebar({ navLinks, isMobile }) {
  const location = useLocation()

  return (
    <nav className="space-y-1">
      {navLinks.map((link) => {
        const isActive = location.pathname === link.to
        
        return (
          <Link
            key={link.to}
            to={link.to}
            className={`flex items-center gap-3 px-3 py-2.5 transition-all duration-200 rounded-lg ${
              isActive
                ? 'bg-gemini-blue/10 text-gemini-blue font-semibold'
                : 'hover:bg-slate-100 dark:hover:bg-slate-900/70 text-slate-700 dark:text-slate-300'
            }`}
          >
            {/* Icon - Cải thiện styling */}
            <span className={`flex-shrink-0 flex items-center justify-center rounded-lg ${
              isMobile 
                ? 'text-2xl w-10 h-10' 
                : 'text-xl w-9 h-9'
            } ${
              isActive 
                ? 'bg-gemini-blue/20' 
                : 'bg-slate-100 dark:bg-slate-800'
            }`}>
              {link.icon}
            </span>
            {/* Label - Ẩn trên mobile */}
            {!isMobile && (
              <span className="text-base font-medium truncate flex-1">
                {link.label}
              </span>
            )}
            {/* Active indicator */}
            {isActive && !isMobile && (
              <div className="w-1.5 h-1.5 rounded-full bg-gemini-blue"></div>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

