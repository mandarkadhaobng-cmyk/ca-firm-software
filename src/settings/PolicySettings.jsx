import { useState, useEffect } from 'react';
import { FileText, Edit3, Save, X, Info, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsService } from '../services/settingsService';
import useAuthStore from '../store/authStore';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PLACEHOLDER_POLICY = `Welcome to our firm. Please read the following policies carefully.

1. WORKING HOURS
   Standard working hours are 9:00 AM to 6:00 PM, Monday to Saturday.
   Employees are expected to log their hours accurately in the timesheet.

2. LEAVE POLICY
   All leaves are subject to prior approval from your reporting manager.
   Leave applications must be submitted at least 2 working days in advance.

3. CODE OF CONDUCT
   Employees are expected to maintain professional behaviour at all times.
   Confidentiality of client information must be strictly maintained.

4. TIMESHEET SUBMISSION
   Timesheets must be submitted every Friday by 7:00 PM.
   Unsigned or incomplete timesheets will be returned for correction.

(No policy has been set yet. Super Admin can click Edit to add one.)`;

const PolicySettings = () => {
  const { profile } = useAuthStore();
  const isSuperAdmin = profile?.role === 'super_admin' || profile?.roles?.slug === 'super_admin';

  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [policyText, setPolicyText] = useState('');
  const [draft, setDraft]       = useState('');

  useEffect(() => {
    settingsService.getPolicy()
      .then(data => { setPolicyText(data?.policy_text || ''); })
      .catch(() => toast.error('Failed to load policy'))
      .finally(() => setLoading(false));
  }, []);

  const startEdit = () => {
    setDraft(policyText);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft('');
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.updatePolicy(draft);
      setPolicyText(draft);
      setEditing(false);
      toast.success('Company policy saved');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to save policy';
      // Surface the migration hint if the column is missing
      if (msg.includes('ALTER TABLE')) {
        toast.error(
          'Run this SQL in pgAdmin first:\nALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS policy_text TEXT;',
          { duration: 8000 }
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            Company Policy
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Firm-wide HR policies, conduct guidelines, and rules visible to all employees
          </p>
        </div>

        {isSuperAdmin && !editing && (
          <Button variant="secondary" size="sm" icon={Edit3} onClick={startEdit}>
            Edit Policy
          </Button>
        )}
        {!isSuperAdmin && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary bg-gray-50 border border-border px-3 py-1.5 rounded-lg">
            <Lock size={12} />
            View only
          </div>
        )}
      </div>

      {/* Info banner for super admin when no policy set */}
      {isSuperAdmin && !policyText && !editing && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            No company policy has been written yet. Click <strong>Edit Policy</strong> to add one.
            All employees will see it here.
          </p>
        </div>
      )}

      {/* Policy content */}
      {editing ? (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-text-primary">Edit Policy</h2>
            <span className="text-xs text-text-secondary">Markdown-style plain text supported</span>
          </div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={22}
            placeholder={PLACEHOLDER_POLICY}
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm font-mono
              focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y
              text-text-primary bg-white leading-relaxed"
          />
          <div className="flex items-center justify-end gap-3 mt-4">
            <Button variant="ghost" icon={X} onClick={cancelEdit}>
              Cancel
            </Button>
            <Button icon={Save} loading={saving} onClick={handleSave}>
              Save Policy
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          {policyText ? (
            <pre className="whitespace-pre-wrap text-sm text-text-primary font-sans leading-relaxed">
              {policyText}
            </pre>
          ) : (
            <div className="py-10 text-center">
              <FileText size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-text-secondary">
                No company policy has been published yet.
              </p>
            </div>
          )}
        </Card>
      )}

    </div>
  );
};

export default PolicySettings;
