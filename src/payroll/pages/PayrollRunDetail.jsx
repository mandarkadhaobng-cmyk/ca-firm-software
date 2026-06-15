import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, CheckCircle, Send, Download,
  ChevronDown, ChevronUp, Mail, MailCheck, MailX, Edit2,
  Check, X, Loader2, AlertCircle, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as svc from '../services/payrollService';
import { formatCurrency } from '../../utils/formatters';
import Button from '../../components/common/Button';
import { usePermissions } from '../../hooks/usePermissions';

const MONTHS_FULL = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

const STATUS_BADGE = {
  draft:    { label: 'Draft',    cls: 'bg-gray-100 text-gray-600' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-700' },
  sent:     { label: 'Sent',     cls: 'bg-blue-100 text-blue-700' },
};

const EMAIL_BADGE = {
  pending: { icon: Mail,      cls: 'text-text-secondary' },
  sent:    { icon: MailCheck, cls: 'text-green-600' },
  failed:  { icon: MailX,     cls: 'text-red-500' },
  skipped: { icon: Mail,      cls: 'text-amber-500' },
};

// ── Inline Slip Editor ──────────────────────────────────────
const SlipRow = ({ slip, runStatus, onUpdate, onDownload, onResend }) => {
  const [expanded,  setExpanded]  = useState(false);
  const [editing,   setEditing]   = useState(false);
  const [absent,    setAbsent]    = useState(String(slip.absent_days || 0));
  const [reimb,     setReiemb]    = useState(String(slip.reimbursement || 0));
  const [adj,       setAdj]       = useState(String(slip.adjustment || 0));
  const [saving,    setSaving]    = useState(false);
  const [resending, setResending] = useState(false);

  const EmailIcon = EMAIL_BADGE[slip.email_status]?.icon || Mail;
  const emailCls  = EMAIL_BADGE[slip.email_status]?.cls || 'text-text-secondary';

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(slip.id, {
        absentDays:    parseInt(absent)    || 0,
        reimbursement: parseFloat(reimb)   || 0,
        adjustment:    parseFloat(adj)     || 0,
      });
      setEditing(false);
      toast.success('Slip updated');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await onResend(slip.id);
      toast.success('Payslip resent to ' + slip.email);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Resend failed');
    } finally { setResending(false); }
  };

  const canEdit = !slip.is_locked && runStatus === 'draft';

  return (
    <div className="border-b border-border last:border-0">
      {/* Row summary */}
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center
                        flex-shrink-0 text-primary text-xs font-bold">
          {(slip.first_name?.[0] || '') + (slip.last_name?.[0] || '')}
        </div>

        <div className="flex-1 min-w-0" onClick={() => setExpanded(v => !v)} role="button">
          <p className="text-sm font-medium text-text-primary">
            {slip.first_name} {slip.last_name}
          </p>
          <p className="text-xs text-text-secondary">
            Present: {slip.present_days}/{slip.working_days} days
            {parseFloat(slip.absent_deduction) > 0 && (
              <span className="text-red-500 ml-2">
                −{formatCurrency(slip.absent_deduction)}
              </span>
            )}
            {parseFloat(slip.reimbursement) > 0 && (
              <span className="text-green-600 ml-2">
                +{formatCurrency(slip.reimbursement)} reimb
              </span>
            )}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-text-primary">{formatCurrency(slip.final_salary)}</p>
          <p className="text-xs text-text-secondary">Net Pay</p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <EmailIcon size={14} className={emailCls} title={slip.email_status} />
          {canEdit && (
            <button onClick={() => setEditing(v => !v)}
              className="p-1 rounded hover:bg-gray-200 text-text-secondary">
              <Edit2 size={13} />
            </button>
          )}
          <button onClick={() => setExpanded(v => !v)}
            className="p-1 rounded hover:bg-gray-200 text-text-secondary">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-border">
          {editing ? (
            /* Edit form */
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Absent Days', value: absent, setter: setAbsent, hint: '0 = full month' },
                  { label: 'Reimbursement (₹)', value: reimb, setter: setReiemb, hint: 'Travel, food, etc.' },
                  { label: 'Adjustment (₹)', value: adj, setter: setAdj, hint: '±1 rounding' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs font-medium text-text-secondary mb-1">{f.label}</label>
                    <input
                      type="number" step="any"
                      value={f.value}
                      onChange={e => f.setter(e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-1.5 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-xs text-text-secondary mt-0.5">{f.hint}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSave} loading={saving}>
                  <Check size={13} className="mr-1" /> Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                  <X size={13} className="mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* View breakdown */
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['Monthly Salary', formatCurrency(slip.monthly_salary)],
                ['Working Days',   slip.working_days + ' days'],
                ['Present Days',   slip.present_days + ' days'],
                ['Absent Days',    slip.absent_days + ' days'],
                ['Per Day Salary', formatCurrency(slip.per_day_salary)],
                ['Absent Deduction', '−' + formatCurrency(slip.absent_deduction)],
                ['Reimbursement',  '+' + formatCurrency(slip.reimbursement || 0)],
                ['Net Salary',     formatCurrency(slip.final_salary)],
              ].map(([label, val]) => (
                <div key={label} className="bg-white rounded-lg p-2.5 border border-border">
                  <p className="text-xs text-text-secondary">{label}</p>
                  <p className="text-sm font-semibold text-text-primary mt-0.5">{val}</p>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          {!editing && (
            <div className="flex gap-2 mt-3">
              {runStatus !== 'draft' && (
                <Button size="sm" variant="outline"
                  onClick={() => onDownload(slip.id, slip.first_name + '_' + slip.last_name,
                                            slip.month, slip.year)}>
                  <Download size={13} className="mr-1" /> PDF
                </Button>
              )}
              {runStatus === 'approved' && slip.email_status === 'failed' && (
                <Button size="sm" variant="outline" onClick={handleResend} loading={resending}>
                  <Mail size={13} className="mr-1" /> Retry Email
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────
const PayrollRunDetail = () => {
  const { runId }  = useParams();
  const navigate   = useNavigate();
  const { roleSlug } = usePermissions();
  const isHR      = ['super_admin','partner','hr'].includes(roleSlug);
  const isPartner = ['super_admin','partner'].includes(roleSlug);

  const [run,       setRun]       = useState(null);
  const [slips,     setSlips]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);
  const [approving,  setApproving]  = useState(false);
  const [sending,    setSending]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        svc.getRun(runId),
        svc.getRunSlips(runId),
      ]);
      setRun(r);
      setSlips(s || []);
    } catch { toast.error('Failed to load payroll run'); }
    finally { setLoading(false); }
  }, [runId]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await svc.generateSlips(runId);
      toast.success(res.generated + ' salary slips generated');
      await load();
    } catch (e) { toast.error(e.response?.data?.message || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this payroll run? Slips will be locked for editing.')) return;
    setApproving(true);
    try {
      await svc.approveRun(runId);
      toast.success('Payroll approved');
      await load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setApproving(false); }
  };

  const handleSendEmails = async () => {
    if (!window.confirm('Send payslips to all employees by email?')) return;
    setSending(true);
    try {
      const res = await svc.sendBulkEmails(runId, []);
      const d = res.data;
      if (d?.sent > 0) toast.success(d.sent + ' payslip(s) sent successfully!');
      if (d?.skipped > 0) toast(d.skipped + ' skipped — email address missing.');
      if (d?.failed > 0 && d?.failures?.length > 0) {
        // Show the actual SMTP error for the first failure
        const firstErr = d.failures[0]?.error || 'Unknown error';
        toast.error(d.failed + ' failed. Reason: ' + firstErr, { duration: 8000 });
      } else if (d?.failed > 0) {
        toast.error(d.failed + ' emails failed. Check SMTP settings.');
      }
      await load();
    } catch (e) { toast.error(e.response?.data?.message || 'Send failed'); }
    finally { setSending(false); }
  };

  const handleUpdateSlip = async (slipId, data) => {
    const updated = await svc.updateSlip(slipId, data);
    setSlips(prev => prev.map(s => s.id === slipId ? { ...s, ...updated } : s));
    return updated;
  };

  const handleDownload = (slipId, name, month, year) => {
    svc.downloadSlipPdf(slipId, name, month, year).catch(() => toast.error('Download failed'));
  };

  const handleResend = async (slipId) => {
    await svc.resendSlipEmail(slipId);
    await load();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!run) {
    return <div className="p-6 text-center text-text-secondary">Payroll run not found</div>;
  }

  const badge    = STATUS_BADGE[run.status] || STATUS_BADGE.draft;
  const monthName = MONTHS_FULL[run.month - 1];
  const emailStats = {
    sent:    run.emails_sent    || 0,
    failed:  run.emails_failed  || 0,
    pending: run.emails_pending || 0,
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/payroll')}
          className="p-1.5 rounded-md hover:bg-gray-100 text-text-secondary">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-text-primary">
              {monthName} {run.year} Payroll
            </h1>
            <span className={'text-xs font-medium px-2 py-0.5 rounded-full ' + badge.cls}>
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-0.5">
            {run.working_days} working days · Created by {run.created_by_name || '—'}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {isHR && run.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={handleGenerate} loading={generating}>
              <RefreshCw size={13} className="mr-1" />
              {slips.length > 0 ? 'Regenerate' : 'Generate Slips'}
            </Button>
          )}
          {isPartner && run.status === 'draft' && slips.length > 0 && (
            <Button size="sm" onClick={handleApprove} loading={approving}>
              <CheckCircle size={13} className="mr-1" /> Approve
            </Button>
          )}
          {isHR && run.status === 'approved' && (
            <Button size="sm" onClick={handleSendEmails} loading={sending}>
              <Send size={13} className="mr-1" /> Send Payslips
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Employees',    value: run.total_employees || slips.length },
          { label: 'Total Salary', value: formatCurrency(run.total_net || 0) },
          { label: 'Deductions',   value: formatCurrency(run.total_deductions || 0) },
          { label: 'Net Payable',  value: formatCurrency(run.total_net || 0), highlight: true },
        ].map(c => (
          <div key={c.label}
            className={'bg-white border rounded-xl p-4 ' +
              (c.highlight ? 'border-primary/30' : 'border-border')}>
            <p className="text-xs text-text-secondary">{c.label}</p>
            <p className={'text-lg font-bold mt-1 ' +
              (c.highlight ? 'text-primary' : 'text-text-primary')}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Email stats (after approval) */}
      {run.status !== 'draft' && (
        <div className="flex items-center gap-4 bg-white border border-border rounded-xl px-4 py-3 text-sm">
          <span className="text-text-secondary text-xs">Email delivery:</span>
          {emailStats.sent > 0 && (
            <span className="flex items-center gap-1 text-green-600 text-xs">
              <MailCheck size={13} /> {emailStats.sent} sent
            </span>
          )}
          {emailStats.failed > 0 && (
            <span className="flex items-center gap-1 text-red-500 text-xs">
              <MailX size={13} /> {emailStats.failed} failed
            </span>
          )}
          {emailStats.pending > 0 && (
            <span className="flex items-center gap-1 text-text-secondary text-xs">
              <Mail size={13} /> {emailStats.pending} pending
            </span>
          )}
          {emailStats.sent === 0 && emailStats.failed === 0 && emailStats.pending === 0 && (
            <span className="text-text-secondary text-xs">No emails sent yet</span>
          )}
        </div>
      )}

      {/* Slips list */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-text-secondary" />
            <span className="font-medium text-text-primary text-sm">
              Salary Slips ({slips.length})
            </span>
          </div>
          {run.status === 'draft' && (
            <span className="text-xs text-text-secondary">
              Click Edit icon to adjust attendance or reimbursement
            </span>
          )}
        </div>

        {slips.length === 0 ? (
          <div className="py-12 text-center text-text-secondary">
            <AlertCircle size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No slips yet.</p>
            {isHR && run.status === 'draft' && (
              <p className="text-xs mt-1">Click "Generate Slips" above to create payslips for all employees.</p>
            )}
          </div>
        ) : (
          <div>
            {slips.map(slip => (
              <SlipRow
                key={slip.id}
                slip={slip}
                runStatus={run.status}
                onUpdate={handleUpdateSlip}
                onDownload={handleDownload}
                onResend={handleResend}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom: Download all PDFs */}
      {run.status !== 'draft' && slips.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm"
            onClick={() => slips.forEach(s =>
              handleDownload(s.id, s.first_name + '_' + s.last_name, s.month, s.year))}>
            <Download size={13} className="mr-1.5" /> Download All PDFs
          </Button>
        </div>
      )}
    </div>
  );
};

export default PayrollRunDetail;
