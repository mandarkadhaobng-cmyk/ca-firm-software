const Card = ({ children, className = '', padding = true, hover = false }) => {
  return (
    <div className={`
      bg-white rounded-xl border border-border shadow-card
      ${padding ? 'p-5' : ''}
      ${hover ? 'hover:shadow-md transition-shadow duration-200 cursor-pointer' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, actions, className = '' }) => (
  <div className={`flex items-start justify-between mb-4 ${className}`}>
    <div>
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export default Card;
