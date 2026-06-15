import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const KPICard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'primary', onClick }) => {
  const colorMap = {
    primary: { bg: 'bg-primary-50', icon: 'text-primary', border: 'border-primary-100' },
    success: { bg: 'bg-green-50', icon: 'text-success', border: 'border-green-100' },
    warning: { bg: 'bg-amber-50', icon: 'text-warning', border: 'border-amber-100' },
    error: { bg: 'bg-red-50', icon: 'text-error', border: 'border-red-100' },
    info: { bg: 'bg-blue-50', icon: 'text-info', border: 'border-blue-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
  };

  const c = colorMap[color] || colorMap.primary;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-error' : 'text-text-secondary';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-border shadow-card p-5
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold text-text-primary leading-tight">{value}</p>
          {subtitle && <p className="text-xs text-text-secondary mt-1">{subtitle}</p>}
          {trendValue !== undefined && (
            <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
              <TrendIcon size={13} />
              <span className="text-xs font-medium">{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg ${c.bg} ${c.border} border flex items-center justify-center flex-shrink-0 ml-4`}>
            <Icon size={20} className={c.icon} />
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
