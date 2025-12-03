import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon: Icon, iconPosition = 'left', fullWidth = true, className = '', ...props }, ref) => {
    const inputClasses = `
      input
      ${error ? 'input-error' : ''}
      ${Icon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : ''}
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `.trim().replace(/\s+/g, ' ');
    
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            {label}
            {props.required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {Icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <Icon size={18} />
            </div>
          )}
          <input
            ref={ref}
            className={inputClasses}
            {...props}
          />
          {Icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <Icon size={18} />
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-error-600 flex items-center gap-1">
            <span>⚠</span>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-neutral-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

