import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-600 focus:ring-primary/30',
  secondary: 'bg-white text-text-primary border border-border hover:bg-gray-50 focus:ring-gray-200',
  danger: 'bg-error text-white hover:bg-red-600 focus:ring-red-200',
  ghost: 'text-text-secondary hover:bg-gray-100 hover:text-text-primary focus:ring-gray-200',
  success: 'bg-success text-white hover:bg-green-600 focus:ring-green-200',
  warning: 'bg-warning text-white hover:bg-amber-500 focus:ring-amber-200',
};

const sizes = {
  xs: 'px-2.5 py-1.5 text-xs',
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon = null,
  iconPosition = 'left',
  className = '',
  type = 'button',
  fullWidth = false,
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg
        focus:outline-none focus:ring-2 transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {!loading && Icon && iconPosition === 'left' && <Icon size={16} />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon size={16} />}
    </button>
  );
};

export default Button;
