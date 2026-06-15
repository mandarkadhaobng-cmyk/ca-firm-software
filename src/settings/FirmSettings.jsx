import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Phone, Mail, Globe, Save, ChevronRight, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import useAuthStore from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import LoadingSpinner from '../components/common/LoadingSpinner';

const QuickLink = ({ label, desc, path }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
    >
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary mt-0.5">{desc}</p>
      </div>
      <ChevronRight size={16} className="text-text-secondary flex-shrink-0" />
    </button>
  );
};

const FirmSettings = () => {
  const { user } = useAuthStore();
  const { isPartnerOrAbove } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm();

  useEffect(() => {
    const loadData = async () => {
      try {
        const firmData = await (authService.getFirm?.() || Promise.resolve(null));
        if (firmData) reset(firmData);
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await authService.updateFirm?.(data);
      toast.success('Firm details updated');
      reset(data);
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Firm Settings</h1>
        <p className="text-sm text-text-secondary mt-0.5">Manage your firm's profile and configuration</p>
      </div>

      {/* Firm Details */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Building2 size={18} className="text-primary" />
            <h2 className="font-medium text-text-primary">Firm Information</h2>
          </div>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Firm Name"
                required
                placeholder="e.g. Shah & Associates"
                error={errors.name?.message}
                {...register('name', { required: 'Firm name is required' })}
              />
              <Input
                label="Registration Number"
                placeholder="Firm registration / ICAI number"
                {...register('registration_number')}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                placeholder="contact@yourfirm.com"
                icon={Mail}
                {...register('email')}
              />
              <Input
                label="Phone"
                placeholder="+91 98765 43210"
                icon={Phone}
                {...register('phone')}
              />
            </div>

            <Input
              label="Website"
              placeholder="https://yourfirm.com"
              icon={Globe}
              {...register('website')}
            />

            <div>
              <label className="text-sm font-medium text-text-primary block mb-1">Address</label>
              <textarea
                rows={2}
                placeholder="Firm address…"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                {...register('address')}
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <Input label="City"    placeholder="Mumbai"    {...register('city')} />
              <Input label="State"   placeholder="Maharashtra" {...register('state')} />
              <Input label="Pincode" placeholder="400001"   {...register('pincode')} />
            </div>
          </div>

          <div className="flex justify-end mt-5">
            <Button type="submit" loading={saving} disabled={!isDirty} icon={Save}>
              Save Firm Details
            </Button>
          </div>
        </Card>
      </form>

      {/* Quick Links */}
      <Card>
        <h2 className="font-medium text-text-primary mb-3">More Settings</h2>
        <div className="divide-y divide-border">
          <QuickLink path="/settings/policy"        label="Company Policy"        desc="View or edit the firm's HR and conduct policies" icon={FileText} />
          <QuickLink path="/settings/departments"   label="Departments"           desc="Manage departments and teams" />
          <QuickLink path="/settings/branding"      label="Branding"              desc="Logo, colors and firm identity" />
          <QuickLink path="/settings/notifications" label="Notifications"         desc="Email and in-app notification channels" />
          {isPartnerOrAbove() && (
            <QuickLink path="/settings/user-access" label="User Access"           desc="Reset passwords and manage login credentials" />
          )}
        </div>
      </Card>
    </div>
  );
};

export default FirmSettings;
