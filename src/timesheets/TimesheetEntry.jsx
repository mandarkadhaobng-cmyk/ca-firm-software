import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Send, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { timesheetService } from '../services/timesheetService';
import { clientService } from '../services/clientService';
import { assignmentService } from '../services/assignmentService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import { isoDate, formatHours } from '../utils/formatters';
import { MAX_DAILY_HOURS } from '../constants';

const TimesheetEntry = () => {
  const navigate = useNavigate();
  const { profile, getFirmId } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [clients, setClients] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      date: isoDate(),
      hours_worked: '',
      is_billable: true,
      status: 'draft',
    }
  });

  const selectedDate = watch('date');
  const selectedClientId = watch('client_id');
  const hoursWorked = watch('hours_worked');
  const isBillable = watch('is_billable');

  useEffect(() => {
    clientService.getAllForSelect(getFirmId()).then(setClients);
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      assignmentService.getAll({
        firmId: getFirmId(), clientId: selectedClientId, page: 1, pageSize: 100
      }).then(({ data }) => setAssignments(data || []));
    } else {
      setAssignments([]);
      setValue('assignment_id', '');
    }
  }, [selectedClientId]);

  useEffect(() => {
    if (selectedDate && profile?.id) {
      timesheetService.getDailySummary(profile.id, selectedDate).then(setDailyTotal);
    }
  }, [selectedDate]);

  const handleSave = async (data, submitAfter = false) => {
    setSaving(true);
    try {
      const today = isoDate();
      if (data.date > today) {
        toast.error('Cannot log time for future dates');
        setSaving(false);
        return;
      }

      const newTotal = dailyTotal + parseFloat(data.hours_worked || 0);
      if (newTotal > MAX_DAILY_HOURS) {
        toast.error(`Total daily hours cannot exceed ${MAX_DAILY_HOURS}h. Currently logged: ${formatHours(dailyTotal)}`);
        setSaving(false);
        return;
      }

      const entry = await timesheetService.create({
        ...data,
        user_id: profile.id,
        firm_id: getFirmId(),
        hours_worked: parseFloat(data.hours_worked),
        status: 'draft',
      });

      if (submitAfter) {
        await timesheetService.submit([entry.id], getFirmId());
        toast.success('Timesheet saved and submitted for approval');
      } else {
        toast.success('Timesheet saved as draft');
      }
      navigate('/timesheets');
    } catch (err) {
      toast.error(err.message || 'Failed to save timesheet');
    } finally {
      setSaving(false);
    }
  };

  const today = isoDate();
  const remainingHours = Math.max(0, MAX_DAILY_HOURS - dailyTotal);

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/timesheets')} className="p-2 hover:bg-gray-100 rounded-lg text-text-secondary">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-base font-semibold text-text-primary">Log Time</h2>
          <p className="text-xs text-text-secondary">Daily remaining: {formatHours(remainingHours)}</p>
        </div>
      </div>

      {dailyTotal > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-2 mb-4">
          <AlertCircle size={15} className="text-info flex-shrink-0" />
          <p className="text-xs text-info">{formatHours(dailyTotal)} already logged for this date.</p>
        </div>
      )}

      <form className="space-y-5">
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Time Entry</h3>
          <div className="space-y-4">
            <Input
              label="Date"
              type="date"
              required
              max={today}
              error={errors.date?.message}
              {...register('date', { required: 'Date is required', max: { value: today, message: 'Cannot log future dates' } })}
            />

            <Select
              label="Client"
              required
              options={clients.map(c => ({ value: c.id, label: `${c.client_name} (${c.client_code})` }))}
              placeholder="Select client"
              error={errors.client_id?.message}
              {...register('client_id', { required: 'Client is required' })}
            />

            <Select
              label="Assignment"
              options={assignments.map(a => ({ value: a.id, label: `${a.title} (${a.status})` }))}
              placeholder="Select assignment (optional)"
              {...register('assignment_id')}
            />

            <div>
              <label className="text-sm font-medium text-text-primary block mb-1">
                Task Description <span className="text-error">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Describe the work done..."
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none transition-all
                  ${errors.task_description
                    ? 'border-error focus:ring-error/20'
                    : 'border-border focus:ring-primary/20 focus:border-primary'}`}
                {...register('task_description', { required: 'Task description is required', minLength: { value: 10, message: 'Min 10 characters' } })}
              />
              {errors.task_description && <p className="text-xs text-error mt-1">{errors.task_description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Hours Worked"
                type="number"
                step="0.5"
                min="0.5"
                max={MAX_DAILY_HOURS}
                required
                placeholder="0.5"
                error={errors.hours_worked?.message}
                {...register('hours_worked', {
                  required: 'Hours required',
                  min: { value: 0.5, message: 'Min 0.5 hours' },
                  max: { value: MAX_DAILY_HOURS, message: `Max ${MAX_DAILY_HOURS} hours` },
                })}
              />
              <div className="flex flex-col justify-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-primary border-border rounded" {...register('is_billable')} />
                  <span className="text-sm text-text-primary">Billable</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-text-primary block mb-1">Remarks</label>
              <textarea
                rows={2}
                placeholder="Any additional remarks..."
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                {...register('remarks')}
              />
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/timesheets')}>Cancel</Button>
          <Button type="button" variant="secondary" icon={Save} loading={saving}
            onClick={handleSubmit((data) => handleSave(data, false))}>
            Save Draft
          </Button>
          <Button type="button" icon={Send} loading={saving}
            onClick={handleSubmit((data) => handleSave(data, true))}>
            Save & Submit
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TimesheetEntry;
