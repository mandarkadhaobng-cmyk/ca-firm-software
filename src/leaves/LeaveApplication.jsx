import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { differenceInBusinessDays, differenceInCalendarDays, parseISO } from 'date-fns';
import useAuthStore from '../store/authStore';
import { leaveService } from '../services/leaveService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import { LEAVE_TYPES, isoDate } from '../constants';

const LeaveApplication = () => {
  const navigate = useNavigate();
  const { profile, getFirmId } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState({});

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { leave_type: 'casual', from_date: isoDate(), to_date: isoDate(), is_half_day: false }
  });

  const fromDate = watch('from_date');
  const toDate = watch('to_date');
  const isHalfDay = watch('is_half_day');

  const totalDays = (() => {
    if (!fromDate || !toDate) return 0;
    if (isHalfDay) return 0.5;
    const diff = differenceInCalendarDays(parseISO(toDate), parseISO(fromDate));
    return Math.max(0, diff + 1);
  })();

  useEffect(() => {
    leaveService.getLeaveBalance(profile?.id).then(setBalance);
  }, []);

  const onSubmit = async (data) => {
    if (parseISO(data.to_date) < parseISO(data.from_date)) {
      toast.error('End date must be after start date');
      return;
    }
    setLoading(true);
    try {
      await leaveService.apply({
        leaveType: data.leave_type,
        fromDate: data.from_date,
        toDate: data.to_date,
        reason: data.reason,
        totalDays: totalDays,
      });
      toast.success('Leave application submitted successfully');
      navigate('/leaves');
    } catch (err) {
      toast.error(err.message || 'Failed to submit leave application');
    } finally {
      setLoading(false);
    }
  };

  const today = isoDate();

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/leaves')} className="p-2 hover:bg-gray-100 rounded-lg text-text-secondary">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-base font-semibold text-text-primary">Apply for Leave</h2>
          <p className="text-xs text-text-secondary">Submit a new leave request</p>
        </div>
      </div>

      {/* Leave Balance */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {LEAVE_TYPES.slice(0, 4).map(lt => (
          <Card key={lt.value} className="text-center">
            <p className="text-xs text-text-secondary">{lt.label}</p>
            <p className="text-lg font-bold text-text-primary mt-1">{balance[lt.value] || 0}d</p>
            <p className="text-xs text-text-secondary">used</p>
          </Card>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Leave Details</h3>
          <div className="space-y-4">
            <Select
              label="Leave Type"
              required
              options={LEAVE_TYPES}
              error={errors.leave_type?.message}
              {...register('leave_type', { required: 'Leave type is required' })}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="From Date"
                type="date"
                required
                min={today}
                error={errors.from_date?.message}
                {...register('from_date', { required: 'From date required' })}
              />
              <Input
                label="To Date"
                type="date"
                required
                min={fromDate || today}
                error={errors.to_date?.message}
                {...register('to_date', { required: 'To date required' })}
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-primary border-border rounded" {...register('is_half_day')} />
                <span className="text-sm text-text-primary">Half Day</span>
              </label>
              {totalDays > 0 && (
                <span className="text-sm text-text-secondary">
                  = <strong className="text-text-primary">{totalDays}</strong> day{totalDays !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-text-primary block mb-1">
                Reason <span className="text-error">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Briefly describe the reason for leave..."
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none transition-all
                  ${errors.reason ? 'border-error focus:ring-error/20' : 'border-border focus:ring-primary/20 focus:border-primary'}`}
                {...register('reason', { required: 'Reason is required', minLength: { value: 10, message: 'Min 10 characters' } })}
              />
              {errors.reason && <p className="text-xs text-error mt-1">{errors.reason.message}</p>}
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/leaves')}>Cancel</Button>
          <Button type="submit" loading={loading} icon={Calendar}>Submit Application</Button>
        </div>
      </form>
    </div>
  );
};

export default LeaveApplication;
