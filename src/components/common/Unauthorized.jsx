import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Button from './Button';

const Unauthorized = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center p-8">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
        <ShieldAlert size={32} className="text-error" />
      </div>
      <h2 className="text-xl font-semibold text-text-primary mb-2">Access Restricted</h2>
      <p className="text-text-secondary text-sm mb-6 max-w-sm">
        You don't have permission to access this page. Contact your administrator if you need access.
      </p>
      <Button onClick={() => navigate(-1)} variant="secondary">Go Back</Button>
    </div>
  );
};

export default Unauthorized;
