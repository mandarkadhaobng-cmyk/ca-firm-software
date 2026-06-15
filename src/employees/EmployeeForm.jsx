import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { employeeService } from '../services/employeeService';
import { settingsService } from '../services/settingsService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import LoadingSpinner from '../components/common/LoadingSpinner';

const DESIGNATION_OPTIONS = [
  'Partner', 'Senior Manager', 'Manager', 'Assistant Manager',
  'Senior Associate', 'Associate', 'Article Trainee', 'Intern',
].map(d => ({ value: d, label: d }));

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getFirmId } = useAuthStore();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [managers, setManagers] = useState([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    const firmId = getFirmId();
    Promise.all([
      settingsService.getDepartments(firmId),
      settingsService.getRoles(firmId),
      employeeService.getManagers(firmId),
    ]).then(([depts, roles, managers]) => {
      setDepartments(depts.map(d => ({ value: d.id, label: d.name })));
      setRoles(roles.map(r => ({ value: r.id, label: r.name })));
      setManagers(managers.map(m => ({ value: m.id, label: `${m.first_name} ${m.last_name}` })));
    });

    if (isEdit) {
      employeeService.getById(id).then(emp => {
        reset({
          first_name: emp.first_name,
          last_name: emp.last_name,
          email: emp.email,
          mobile: emp.phone,               // API returns 'phone'
          employee_id: emp.employee_id,
          designation: emp.designation,
          department_id: emp.department_id,
          role_id: emp.role_id,
          reporting_manager_id: emp.reporting_manager_id,
          joining_date: emp.join_date,     // API returns 'join_date'
          status: emp.status,
          // Payroll / banking
          pan_number:     emp.pan_number     || '',
          bank_name:      emp.bank_name      || '',
          account_number: emp.account_number || '',
          ifsc_code:      emp.ifsc_code      || '',
        });
        setPageLoading(false);
      });
    }
  }, [id]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = { ...data, firm_id: getFirmId() };
      if (isEdit) {
        await employeeService.update(id, payload);
        toast.success('Employee updated successfully');
      } else {
        await employeeService.create(payload);
        toast.success('Employee created successfully');
      }
      navigate('/employees');
    } catch (err) {
      toast.error(err.message || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/employees')} className="p-2 hover:bg-gray-100 rounded-lg text-text-secondary">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-base font-semibold text-text-primary">{isEdit ? 'Edit Employee' : 'Add New Employee'}</h2>
          <p className="text-xs text-text-secondary">{isEdit ? 'Update employee information' : 'Create a new employee record'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Personal Information */}
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Personal Information & Login</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="First Name" required placeholder="John"
              error={errors.first_name?.message}
              {...register('first_name', { required: 'First name required' })} />
            <Input label="Last Name" required placeholder="Doe"
              error={errors.last_name?.message}
              {...register('last_name', { required: 'Last name required' })} />
            <Input label="Email Address (Login ID)" type="email" required placeholder="john@firm.com"
              disabled={isEdit}
              error={errors.email?.message}
              {...register('email', { required: 'Email required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })} />
            <Input label="Mobile Number" placeholder="+91 9876543210"
              {...register('mobile')} />
            {!isEdit && (
              <Input label="Initial Password" type="text" placeholder="Defaults to Welcome@123"
                {...register('password')} />
            )}
          </div>
        </Card>

        {/* Professional Details */}
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Professional Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Employee ID" placeholder="EMP001" {...register('employee_id')} />
            <Select label="Designation" options={DESIGNATION_OPTIONS} placeholder="Select designation"
              {...register('designation')} />
            <Select label="Department" options={departments} placeholder="Select department"
              {...register('department_id')} />
            <Select label="Role" options={roles} placeholder="Select role" required
              error={errors.role_id?.message}
              {...register('role_id', { required: 'Role is required' })} />
            <Select label="Reporting Manager" options={managers} placeholder="Select manager"
              {...register('reporting_manager_id')} />
            <Input label="Joining Date" type="date" {...register('joining_date')} />
          </div>
        </Card>

        {/* Status */}
        {isEdit && (
          <Card>
            <h3 className="text-sm font-semibold text-text-primary mb-4">Account Status</h3>
            <Select label="Status" options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'on_leave', label: 'On Leave' },
            ]} {...register('status')} />
          </Card>
        )}

        {/* Payroll & Banking */}
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-1">Payroll &amp; Banking</h3>
          <p className="text-xs text-text-secondary mb-4">Used on payslips. Fill in for accurate payslip generation.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="PAN Number" placeholder="ABCDE1234F" {...register('pan_number')} />
            <Input label="Bank Name" placeholder="State Bank of India" {...register('bank_name')} />
            <Input label="Account Number" placeholder="1234567890" {...register('account_number')} />
            <Input label="IFSC Code" placeholder="SBIN0001234" {...register('ifsc_code')} />
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/employees')}>Cancel</Button>
          <Button type="submit" loading={loading}>{isEdit ? 'Update Employee' : 'Create Employee'}</Button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
