import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { DASHBOARD_ROUTES } from '../constants/roles';
import { prefetchCommonData } from '../utils/prefetch';

// Fetch public branding (no auth needed) so login screen reflects firm settings
const fetchPublicBranding = async () => {
  try {
    const res = await fetch('/api/public/branding');
    const json = await res.json();
    return json?.data || {};
  } catch {
    return {};
  }
};

const Login = () => {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [branding, setBranding] = useState(null); // null = loading

  // Load branding on mount
  useEffect(() => {
    fetchPublicBranding().then(setBranding);
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { email: '', password: '', rememberMe: false }
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const { profile, roleSlug } = await login({ email: data.email, password: data.password });
      toast.success(`Welcome back, ${profile.firstName}!`);
      prefetchCommonData(profile).catch(() => {});
      navigate(DASHBOARD_ROUTES[roleSlug] || '/dashboard/employee', { replace: true });
    } catch (error) {
      const isNetworkError = !error.response;
      const msg = isNetworkError
        ? 'Cannot reach the server. Please make sure the backend is running.'
        : error.response?.data?.message?.includes('Invalid')
          ? 'Invalid email or password. Please check your credentials.'
          : error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const firmName  = branding?.firm_name  || 'CA Practice Manager';
  const logoUrl   = branding?.logo_url   || null;
  const tagline   = branding?.tagline    || 'Sign in to your workspace';
  const primary   = branding?.primary_color || null;

  return (
    <div>
      {/* Logo & Title */}
      <div className="text-center mb-8">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={firmName}
            className="h-14 w-auto mx-auto mb-4 object-contain rounded-xl"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ backgroundColor: primary || undefined }}
            // fall back to bg-primary class when no custom colour
            data-has-color={!!primary}
          >
            {/* Without custom colour, use Tailwind class */}
            {!primary && (
              <div className="absolute w-14 h-14 bg-primary rounded-2xl -z-10" />
            )}
            <span className="text-white text-2xl font-bold italic">CA</span>
          </div>
        )}
        <p className="text-text-primary font-semibold text-lg mt-1">{tagline}</p>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-card p-6">
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
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' }
            })}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">
              Password <span className="text-error">*</span>
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                className={`w-full pl-9 pr-10 py-2.5 border rounded-lg text-sm text-text-primary
                  placeholder-text-secondary bg-white focus:outline-none focus:ring-2 transition-all
                  ${errors.password
                    ? 'border-error focus:ring-error/20'
                    : 'border-border focus:ring-primary/20 focus:border-primary'
                  }`}
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Minimum 6 characters' }
                })}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-error mt-0.5">{errors.password.message}</p>}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 accent-primary border-border rounded"
                {...register('rememberMe')}
              />
              <span className="text-sm text-text-secondary">Remember me</span>
            </label>
            <Link to="/forgot-password" className="text-sm text-primary hover:underline font-medium">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" loading={isLoading} fullWidth size="md" className="mt-2">
            Sign In
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-text-secondary mt-6">
        Secure · Confidential · CA Practice Management
      </p>
    </div>
  );
};

export default Login;
