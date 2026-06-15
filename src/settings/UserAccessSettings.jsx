import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Key, Mail, Search, Shield, Eye, EyeOff,
  RefreshCw, Trash2, UserCog, AlertTriangle, UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { employeeService } from '../services/employeeService';
import { settingsService } from '../services/settingsService';
import useAuthStore from '../store/authStore';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ROLE_COLORS, ROLE_LABELS } from '../constants/roles';

const UserAccessSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // { type: 'password'|'email'|'role'|'delete', employee }

  // Form state
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, rolesRes] = await Promise.all([
        employeeService.getAll({ pageSize: 200 }),
        settingsService.getRoles().catch(() => []),
      ]);
      setEmployees(Array.isArray(empRes?.data) ? empRes.data : (Array.isArray(empRes) ? empRes : []));
      setRoles(Array.isArray(rolesRes) ? rolesRes : []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = employees.filter(e => {
    if (!search) return true;
    const name = `${e.first_name} ${e.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase());
  });

  const closeModal = () => {
    setModal(null);
    setNewPassword(''); setNewEmail(''); setNewRoleId(''); setDeleteConfirm('');
    setShowPassword(false); setProcessing(false);
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setProcessing(true);
    try {
      await employeeService.adminResetPassword(modal.employee.id, newPassword);
      toast.success(`Password reset for ${modal.employee.first_name} ${modal.employee.last_name}`);
      closeModal();
    } catch (err) { toast.error(err.message || 'Failed to reset password'); }
    finally { setProcessing(false); }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) { toast.error('Enter a valid email address'); return; }
    if (newEmail === modal.employee.email) { toast.error('New email is the same as current'); return; }
    setProcessing(true);
    try {
      await employeeService.adminChangeEmail(modal.employee.id, newEmail);
      toast.success('Email updated successfully');
      loadData(); closeModal();
    } catch (err) { toast.error(err.message || 'Failed to update email'); }
    finally { setProcessing(false); }
  };

  const handleChangeRole = async () => {
    if (!newRoleId) { toast.error('Select a role'); return; }
    setProcessing(true);
    try {
      await employeeService.update(modal.employee.id, { role_id: newRoleId });
      toast.success(`Role updated for ${modal.employee.first_name} ${modal.employee.last_name}`);
      loadData(); closeModal();
    } catch (err) { toast.error(err.message || 'Failed to update role'); }
    finally { setProcessing(false); }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') { toast.error('Type DELETE to confirm'); return; }
    setProcessing(true);
    try {
      await employeeService.remove(modal.employee.id);
      toast.success(`${modal.employee.first_name} ${modal.employee.last_name} has been deleted`);
      loadData(); closeModal();
    } catch (err) { toast.error(err.message || 'Failed to delete user'); }
    finally { setProcessing(false); }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    let pwd = '';
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setNewPassword(pwd); setShowPassword(true);
  };

  const isSelf = (emp) => emp.id === user?.id;

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/settings')} className="p-2 hover:bg-gray-100 rounded-lg text-text-secondary">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <Shield size={20} className="text-primary" />
              User Access Management
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Manage login credentials, roles, and user accounts
            </p>
          </div>
        </div>
        <Button icon={UserPlus} onClick={() => navigate('/employees/new')} size="sm">
          Add Employee
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Info banner */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        <strong>Administrator access:</strong> You can reset any user's password, change their login email,
        change their role, or permanently delete their account. Changes take effect immediately.
      </div>

      {/* User List */}
      {loading ? <LoadingSpinner /> : (
        <Card className="divide-y divide-border">
          {filtered.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">No users found</p>
          ) : (
            filtered.map(emp => (
              <div key={emp.id} className="flex items-center justify-between py-3 px-1 gap-3">
                {/* User info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary text-xs font-bold">
                      {(emp.first_name?.[0] || '?')}{(emp.last_name?.[0] || '?')}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-text-primary">
                        {emp.first_name} {emp.last_name}
                        {isSelf(emp) && <span className="text-xs text-text-secondary ml-1">(you)</span>}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[emp.role] || 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABELS[emp.role] || emp.role}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary truncate">{emp.email}</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => { setModal({ type: 'email', employee: emp }); setNewEmail(emp.email || ''); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-gray-50 transition-colors"
                    title="Change email"
                  >
                    <Mail size={12} /> Email
                  </button>
                  <button
                    onClick={() => { setModal({ type: 'password', employee: emp }); setNewPassword(''); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                    title="Reset password"
                  >
                    <Key size={12} /> Password
                  </button>
                  <button
                    onClick={() => { setModal({ type: 'role', employee: emp }); setNewRoleId(''); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-gray-50 transition-colors"
                    title="Change role"
                  >
                    <UserCog size={12} /> Role
                  </button>
                  {!isSelf(emp) && (
                    <button
                      onClick={() => { setModal({ type: 'delete', employee: emp }); setDeleteConfirm(''); }}
                      className="p-1.5 text-error border border-error/20 rounded-lg hover:bg-error/5 transition-colors"
                      title="Delete user permanently"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </Card>
      )}

      {/* ── Reset Password Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={modal?.type === 'password'}
        onClose={closeModal}
        title={`Reset Password — ${modal?.employee?.first_name} ${modal?.employee?.last_name}`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              All active sessions for this user will be invalidated. They must log in again with the new password.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary block mb-1.5">
              New Password <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3 py-2.5 pr-10 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={generatePassword}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-600 font-medium"
          >
            <RefreshCw size={13} /> Generate strong password
          </button>
          {newPassword.length >= 8 && (
            <div className="p-2 bg-gray-50 rounded border border-border">
              <p className="text-xs text-text-secondary font-mono break-all">{newPassword}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleResetPassword} loading={processing} icon={Key}>
              Reset Password
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Change Email Modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={modal?.type === 'email'}
        onClose={closeModal}
        title={`Change Email — ${modal?.employee?.first_name} ${modal?.employee?.last_name}`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              The user must use the new email address to sign in going forward.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary block mb-1">Current Email</label>
            <p className="text-sm text-text-secondary px-3 py-2 bg-gray-50 rounded-lg border border-border">
              {modal?.employee?.email}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary block mb-1.5">
              New Email <span className="text-error">*</span>
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="new@email.com"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleChangeEmail} loading={processing} icon={Mail}>
              Update Email
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Change Role Modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={modal?.type === 'role'}
        onClose={closeModal}
        title={`Change Role — ${modal?.employee?.first_name} ${modal?.employee?.last_name}`}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary block mb-1">Current Role</label>
            <p className="text-sm text-text-secondary px-3 py-2 bg-gray-50 rounded-lg border border-border">
              {ROLE_LABELS[modal?.employee?.role] || modal?.employee?.role}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary block mb-1.5">
              New Role <span className="text-error">*</span>
            </label>
            <select
              value={newRoleId}
              onChange={e => setNewRoleId(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
            >
              <option value="">— Select role —</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleChangeRole} loading={processing} icon={UserCog}>
              Update Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete User Modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={modal?.type === 'delete'}
        onClose={closeModal}
        title={`Delete User — ${modal?.employee?.first_name} ${modal?.employee?.last_name}`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertTriangle size={16} className="text-error flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-800">
              This will <strong>permanently delete</strong> the user account along with all their
              login sessions. Their timesheets, leaves, and assignments will remain for record-keeping
              but will no longer be linked to an active account. This action cannot be undone.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary block mb-1.5">
              Type <span className="font-mono font-bold tracking-wide">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-error/20"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button
              onClick={handleDelete}
              loading={processing}
              icon={Trash2}
              disabled={deleteConfirm !== 'DELETE'}
              className="!bg-error !border-error hover:!bg-red-700 text-white"
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserAccessSettings;
