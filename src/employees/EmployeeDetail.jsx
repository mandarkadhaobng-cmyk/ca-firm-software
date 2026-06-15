import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Mail, Phone, Calendar, Briefcase, Building2, Hash, UserCheck } from 'lucide-react';
import { employeeService } from '../services/employeeService';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { fullName, formatDate, getInitials } from '../utils/formatters';
import { ROLE_LABELS, ROLE_COLORS } from '../constants/roles';
import useAuthStore from '../store/authStore';

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const canEdit = ['super_admin', 'partner', 'hr'].includes(profile?.role);

  useEffect(() => {
    employeeService.getById(id)
      .then(e => { setEmployee(e); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!employee) return <p className="p-6 text-text-secondary">Employee not found.</p>;

  // Derived values from the API response
  const roleSlug      = employee.role;           // r.slug as role
  const roleName      = employee.role_name;
  const managerName   = employee.manager_first
    ? `${employee.manager_first} ${employee.manager_last}`.trim()
    : null;

  const InfoCard = ({ icon: Icon, label, value }) => (
    <Card>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ backgroundColor: 'var(--sidebar-hover-bg)' }}>
          <Icon size={15} className="text-text-secondary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-text-secondary">{label}</p>
          <p className="text-sm font-medium text-text-primary mt-0.5 break-words">{value || '—'}</p>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="max-w-2xl space-y-5 p-0">
      {/* Back + Edit header */}
      <div className="flex items-center gap-3 mb-1">
        <button
          onClick={() => navigate('/employees')}
          className="p-2 hover:bg-gray-100 rounded-lg text-text-secondary"
          style={{ '--tw-bg-opacity': 1 }}
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-base font-semibold text-text-primary">Employee Profile</h2>
        {canEdit && (
          <div className="ml-auto">
            <Button size="sm" icon={Edit} variant="secondary"
              onClick={() => navigate(`/employees/${id}/edit`)}>
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-primary">
              {getInitials(fullName(employee))}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-text-primary">{fullName(employee)}</h3>
            <p className="text-sm text-text-secondary">
              {employee.designation || roleName || '—'}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className={ROLE_COLORS[roleSlug] || 'bg-gray-100 text-gray-700'}>
                {ROLE_LABELS[roleSlug] || roleName || roleSlug}
              </Badge>
              <Badge className={
                employee.status === 'active'   ? 'bg-green-100 text-green-700' :
                employee.status === 'on_leave' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'
              }>
                {employee.status}
              </Badge>
              {employee.employee_id && (
                <span className="text-xs text-text-secondary bg-gray-100 px-2 py-1 rounded-md">
                  {employee.employee_id}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard icon={Mail}      label="Email"              value={employee.email} />
        <InfoCard icon={Phone}     label="Mobile / Phone"     value={employee.phone} />
        <InfoCard icon={Building2} label="Department"         value={employee.department_name} />
        <InfoCard icon={Hash}      label="Employee ID"        value={employee.employee_id} />
        <InfoCard icon={Briefcase} label="Designation"        value={employee.designation} />
        <InfoCard icon={Calendar}  label="Joining Date"       value={formatDate(employee.join_date)} />
        {managerName && (
          <InfoCard icon={UserCheck} label="Reporting Manager" value={managerName} />
        )}
        {employee.branch_name && (
          <InfoCard icon={Building2} label="Branch"           value={employee.branch_name} />
        )}
      </div>

      {/* Quick actions for HR/Admin */}
      {canEdit && (
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-3">Account Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary"
              onClick={() => navigate(`/employees/${id}/edit`)}>
              Edit Details
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default EmployeeDetail;
