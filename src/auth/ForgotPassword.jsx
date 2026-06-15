import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

const ForgotPassword = () => {
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ email }) => {
    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (error) {
      toast.error(error.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Reset Password</h1>
        <p className="text-text-secondary text-sm mt-1">
          {sent ? 'Check your inbox for the reset link' : 'Enter your email to receive a reset link'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-6">
        {sent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-success" />
            </div>
            <p className="text-sm text-text-primary font-medium mb-1">Email sent successfully!</p>
            <p className="text-xs text-text-secondary mb-6">
              If an account exists with this email, you'll receive a password reset link shortly.
            </p>
            <Link to="/login">
              <Button variant="secondary" size="sm" icon={ArrowLeft}>Back to Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              placeholder="you@firm.com"
              required
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' }
              })}
            />
            <Button type="submit" loading={isLoading} fullWidth>Send Reset Link</Button>
          </form>
        )}
      </div>

      {!sent && (
        <div className="text-center mt-4">
          <Link to="/login" className="text-sm text-primary hover:text-primary-600 flex items-center justify-center gap-1">
            <ArrowLeft size={14} /> Back to Login
          </Link>
        </div>
      )}
    </div>
  );
};

export default ForgotPassword;
