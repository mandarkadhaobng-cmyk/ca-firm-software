import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ size = 'md', fullScreen = false, message = 'Loading...' }) => {
  const sizes = { sm: 16, md: 24, lg: 32 };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50 gap-3">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-sm text-text-secondary">{message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <Loader2 size={sizes[size]} className="animate-spin text-primary" />
      {message && <p className="text-sm text-text-secondary">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
