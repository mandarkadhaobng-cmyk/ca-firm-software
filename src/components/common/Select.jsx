import { forwardRef } from 'react';

const Select = forwardRef(({
  label,
  error,
  hint,
  options = [],
  placeholder = 'Select...',
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
      <select
        ref={ref}
        disabled={disabled}
        className={`
          w-full border rounded-lg text-sm text-text-primary px-3 py-2.5
          bg-white focus:outline-none focus:ring-2 transition-all appearance-none
          disabled:bg-gray-50 disabled:cursor-not-allowed
          ${error
            ? 'border-error focus:ring-error/20 focus:border-error'
            : 'border-border focus:ring-primary/20 focus:border-primary'
          }
          ${className}
        `}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          backgroundSize: '16px',
          paddingRight: '36px',
        }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-error">{error}</p>}
      {hint && !error && <p className="text-xs text-text-secondary">{hint}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
