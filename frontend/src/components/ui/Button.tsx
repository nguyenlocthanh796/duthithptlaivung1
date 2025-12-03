import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'error';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode | LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const baseClasses = 'btn';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    success: 'btn-success',
    error: 'btn-error',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  const renderIcon = () => {
    if (!Icon) return null;
    
    // Nếu là ReactNode (JSX element)
    if (React.isValidElement(Icon)) {
      return <span className="flex-shrink-0">{Icon}</span>;
    }
    
    // Nếu là LucideIcon (function component)
    if (typeof Icon === 'function') {
      const IconComponent = Icon as LucideIcon;
      return <IconComponent size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} />;
    }
    
    return null;
  };
  
  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12c0-2.209 1.791-4 4-4s4 1.791 4 4-1.791 4-4 4-4-1.791-4-4H6z"></path>
          </svg>
          <span>Đang xử lý...</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && renderIcon()}
          {children}
          {Icon && iconPosition === 'right' && renderIcon()}
        </>
      )}
    </button>
  );
};

export default Button;
