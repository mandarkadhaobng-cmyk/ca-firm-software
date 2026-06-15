import { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  hint,
  icon: Icon = null,
  iconPosition = 'left',
  className = '',
  required = false,
  disabled = false,
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-text-primary">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && iconPosition === 'left' && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
            <Icon size={16} />
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`
            w-full border rounded-lg text-sm text-text-primary placeholder-text-secondary
            bg-white focus:outline-none focus:ring-2 transition-all
            disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-text-secondary
            ${error
              ? 'border-error focus:ring-error/20 focus:border-error'
              : 'border-border focus:ring-primary/20 focus:border-primary'
            }
            ${Icon && iconPosition === 'left' ? 'pl-9' : 'pl-3'}
            ${Icon && iconPosition === 'right' ? 'pr-9' : 'pr-3'}
            py-2.5
            ${className}
          `}
          {...props}
        />
        {Icon && iconPosition === 'right' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
            <Icon size={16} />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
      {hint && !error && <p className="text-xs text-text-secondary">{hint}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
