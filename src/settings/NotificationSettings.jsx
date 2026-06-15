import { useState, useEffect } from 'react';
import { Bell, Mail, Save, Info } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import toast from 'react-hot-toast';

const NOTIFICATION_TYPES = [
  { key: 'timesheet_submitted',  label: 'Timesheet Submitted',  desc: 'When an employee submits a timesheet for approval' },
  { key: 'timesheet_approved',   label: 'Timesheet Approved',   desc: 'When a timesheet is approved by manager' },
  { key: 'timesheet_rejected',   label: 'Timesheet Rejected',   desc: 'When a timesheet is rejected' },
  { key: 'leave_applied',        label: 'Leave Applied',        desc: 'When an employee applies for leave' },
  { key: 'leave_approved',       label: 'Leave Approved',       desc: 'When a leave request is approved' },
  { key: 'leave_rejected',       label: 'Leave Rejected',       desc: 'When a leave request is rejected' },
  { key: 'assignment_created',   label: 'Assignment Created',   desc: 'When a new assignment is created' },
  { key: 'assignment_updated',   label: 'Assignment Updated',   desc: 'When an assignment is updated' },
  { key: 'assignment_completed', label: 'Assignment Completed', desc: 'When an assignment is marked complete' },
  { key: 'holiday_added',        label: 'Holiday Added',        desc: 'When a new holiday is added' },
  { key: 'notice_posted',        label: 'Notice Posted',        desc: 'When a new notice/announcement is posted' },
  { key: 'birthday_reminder',    label: 'Birthday Reminder',    desc: 'Employee birthday notifications' },
  { key: 'work_anniversary',     label: 'Work Anniversary',     desc: 'Employee work anniversary reminders' },
  { key: 'payroll_approved',     label: 'Payroll Approved',     desc: 'When a payroll run is approved (notifies HR/admin)' },
  { key: 'payslip_ready',        label: 'Payslip Ready',        desc: 'When payroll is approved and payslips are available for employees' },
  { key: 'payslip_bulk_sent',    label: 'Bulk Payslips Sent',   desc: 'Summary notification after bulk payslip emails are dispatched' },
];

const CHANNELS = [
  { key: 'in_app', label: 'In-App', icon: Bell, color: 'text-blue-600' },
  { key: 'email',  label: 'Email',  icon: Mail, color: 'text-green-600' },
];

const NotificationSettings = () => {
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providerSettings, setProviderSettings] = useState({
    email_provider: 'smtp',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getConfigs();
      // Build map: { [type]: { in_app: bool, email: bool, sms: bool, whatsapp: bool } }
      const map = {};
      NOTIFICATION_TYPES.forEach(nt => {
        map[nt.key] = { in_app: true, email: false };
      });
      if (Array.isArray(data)) {
        data.forEach(cfg => {
          if (map[cfg.event_type]) {
            const chans = cfg.channels || [];
            map[cfg.event_type] = {
              in_app: chans.includes('in_app') || chans.includes('inapp'),
              email:  chans.includes('email'),
            };
          }
        });
      }
      setConfigs(map);
    } catch {
      toast.error('Failed to load notification configs');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (type, channel) => {
    setConfigs(prev => ({
      ...prev,
      [type]: { ...prev[type], [channel]: !prev[type][channel] },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(configs).map(([type, channels]) => {
        const chans = [];
        if (channels.in_app) chans.push('in_app');
        if (channels.email)  chans.push('email');
        return { event_type: type, channels: chans };
      });
      await notificationService.upsertConfigs(payload);
      toast.success('Notification settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Notification Settings</h1>
          <p className="text-sm text-text-secondary mt-1">
            Control which channels are used for each notification type
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium
            hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          <strong>In-App</strong> notifications are delivered inside the application in real-time.
          <strong> Email</strong> notifications require SMTP credentials configured in the backend{' '}
          <code className="font-mono text-xs">.env</code> file to be sent.
        </p>
      </div>

      {/* Channel Matrix */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-text-secondary w-64">
                  Notification Type
                </th>
                {CHANNELS.map(ch => {
                  const Icon = ch.icon;
                  return (
                    <th key={ch.key} className="px-4 py-3 text-center font-medium text-text-secondary w-24">
                      <div className="flex flex-col items-center gap-1">
                        <Icon size={16} className={ch.color} />
                        <span>{ch.label}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {NOTIFICATION_TYPES.map((nt, idx) => (
                <tr
                  key={nt.key}
                  className={`border-b border-border last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{nt.label}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{nt.desc}</p>
                  </td>
                  {CHANNELS.map(ch => (
                    <td key={ch.key} className="px-4 py-3 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={configs[nt.key]?.[ch.key] ?? false}
                          onChange={() => toggle(nt.key, ch.key)}
                          disabled={ch.key === 'in_app'} // in-app always on
                        />
                        <div className={`w-9 h-5 rounded-full peer-focus:ring-2 peer-focus:ring-primary/30 transition-colors
                          ${configs[nt.key]?.[ch.key]
                            ? 'bg-primary'
                            : 'bg-gray-300 peer-disabled:bg-gray-200'
                          }
                          after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                          after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
                          peer-checked:after:translate-x-4`}
                        />
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provider Quick Reference */}
      <div className="bg-white border border-border rounded-xl p-5 space-y-3">
        <h2 className="font-medium text-text-primary">Email Provider Configuration</h2>
        <p className="text-sm text-text-secondary">
          Set the following in your backend <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">.env</code> file to enable email delivery:
        </p>
        <div className="bg-gray-50 rounded-lg p-4 text-xs font-mono space-y-1 max-w-sm">
          <p className="font-semibold text-green-700 not-italic font-sans text-xs mb-2">SMTP Settings</p>
          <p className="text-gray-600">SMTP_HOST=smtp.gmail.com</p>
          <p className="text-gray-600">SMTP_PORT=587</p>
          <p className="text-gray-600">SMTP_USER=your@email.com</p>
          <p className="text-gray-600">SMTP_PASS=your_app_password</p>
          <p className="text-gray-600">SMTP_FROM="CA Firm &lt;your@email.com&gt;"</p>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
