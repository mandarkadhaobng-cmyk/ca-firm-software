import { Inbox } from 'lucide-react';

/**
 * EmptyState — accepts either:
 *   message / title    (string)  — headline text
 *   description        (string)  — sub-text
 *   action             (object { label, onClick } | JSX) — CTA
 */
const EmptyState = ({
  message,
  title,          // alias for message
  description,
  icon: Icon = Inbox,
  action,
}) => {
  const headline = message || title || 'No data found';

  // action can be { label, onClick } or a JSX element
  const renderAction = () => {
    if (!action) return null;
    if (typeof action === 'object' && action.label && action.onClick) {
      return (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          {action.label}
        </button>
      );
    }
    return <div className="mt-4">{action}</div>;
  };

  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
        <Icon size={24} className="text-text-secondary" />
      </div>
      <p className="text-sm font-medium text-text-primary mb-1">{headline}</p>
      {description && (
        <p className="text-xs text-text-secondary max-w-xs">{description}</p>
      )}
      {renderAction()}
    </div>
  );
};

export default EmptyState;
