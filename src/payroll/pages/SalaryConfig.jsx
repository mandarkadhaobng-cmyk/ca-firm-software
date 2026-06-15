import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as payrollService from '../services/payrollService';
import Button from '../../components/common/Button';

const Field = ({ label, name, register, errors, type='number', required=false, hint }) => (
  <div>
    <label className="block text-sm font-medium text-text-primary mb-1">
      {label} {required && <span className="text-error">*</span>}
    </label>
    <input
      type={type}
      step="0.01"
      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all
        ${errors[name] ? 'border-error focus:ring-error/20' : 'border-border focus:ring-primary/20 focus:border-primary'}`}
      {...register(name, required ? { required: `${label} is required`, min: { value: 0, message: 'Must be ≥ 0' } } : { min: { value: 0, message: 'Must be ≥ 0' } })}
    />
    {hint && <p className="text-xs text-text-secondary mt-0.5">{hint}</p>}
    {errors[name] && <p className="text-xs text-error mt-0.5">{errors[name].message}</p>}
  </div>
);

const SalaryConfig = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      monthlyGross: '', basicPay: '', hra: '', conveyanceAllowance: '',
      medicalAllowance: '', specialAllowance: '', pf: '', esic: '',
      professionalTax: '', tds: '', workingDaysPerMonth: 26,
      effectiveFrom: new Date().toISOString().split('T')[0],
    }
  });

  useEffect(() => {
    payrollService.getSalaryConfig(employeeId)
      .then(config => { if (config) reset({ ...config, effectiveFrom: config.effective_from?.split('T')[0] || '' }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [employeeId]);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await payrollService.saveSalaryConfig(employeeId, data);
      toast.success('Salary configuration saved');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-6"><div className="h-64 bg-gray-100 animate-pulse rounded-xl" /></div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-md hover:bg-gray-100 text-text-secondary">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold text-text-primary">Salary Configuration</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-border rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">Earnings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Monthly Gross (₹)" name="monthlyGross" register={register} errors={errors} required hint="Total CTC per month" />
            <Field label="Basic Pay (₹)"     name="basicPay"     register={register} errors={errors} />
            <Field label="HRA (₹)"           name="hra"           register={register} errors={errors} />
            <Field label="Conveyance (₹)"    name="conveyanceAllowance" register={register} errors={errors} />
            <Field label="Medical Allow. (₹)"name="medicalAllowance" register={register} errors={errors} />
            <Field label="Special Allow. (₹)"name="specialAllowance" register={register} errors={errors} />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">Deductions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="PF (₹)"             name="pf"              register={register} errors={errors} />
            <Field label="ESIC (₹)"           name="esic"            register={register} errors={errors} />
            <Field label="Professional Tax (₹)"name="professionalTax" register={register} errors={errors} />
            <Field label="TDS (₹)"            name="tds"             register={register} errors={errors} />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Working Days / Month" name="workingDaysPerMonth" register={register} errors={errors} required />
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Effective From</label>
              <input type="date" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                {...register('effectiveFrom')} />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" loading={saving}>
            <Save size={14} className="mr-1" /> Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SalaryConfig;
