import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import Button from '../components/common/Button';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams(); // /reset-password/:token
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  if (!token) {
    return (
      <div>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Invalid Link</h1>
        </div>
        <div className="bg-white rounded-xl border border-border shadow-card p-6 text-center space-y-4">
          <AlertCircle size={36} className="text-error mx-auto" />
          <p className="text-sm text-text-secondary">
            This password reset link is missing a token. Please request a new one.
          </p>
          <Link to="/forgot-password">
            <Button variant="secondary" size="sm">Request New Link</Button>
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async ({ password }) => {
    setIsLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      toast.error(error.message || 'Failed to update password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Set New Password</h1>
        <p className="text-text-secondary text-sm mt-1">Choose a strong password for your account</p>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-6">
        {done ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={28} className="text-success" />
            </div>
            <p className="text-sm font-medium text-text-primary">Password updated!</p>
            <p className="text-xs text-text-secondary">Redirecting you to login…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">
                New Password <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  className={`w-full px-3 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all
                    ${errors.password ? 'border-error focus:ring-error/20' : 'border-border focus:ring-primary/20 focus:border-primary'}`}
                  {...register('password', {
                    required: 'Password required',
                    minLength: { value: 8, message: 'Minimum 8 characters' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-error">{errors.password.message}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">
                Confirm Password <span className="text-error">*</span>
              </label>
              <input
                type="password"
                placeholder="Re-enter password"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all
                  ${errors.confirmPassword ? 'border-error focus:ring-error/20' : 'border-border focus:ring-primary/20 focus:border-primary'}`}
                {...register('confirmPassword', {
                  required: 'Please confirm password',
                  validate: v => v === watch('password') || 'Passwords do not match',
                })}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-error">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" loading={isLoading} fullWidth>
              Update Password
            </Button>

            <div className="text-center">
              <Link to="/login" className="text-xs text-primary hover:text-primary-600">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
