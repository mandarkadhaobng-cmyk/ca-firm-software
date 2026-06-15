import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, Download, Eye, Edit, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { employeeService } from '../services/employeeService';
import { settingsService } from '../services/settingsService';
import { usePermissions } from '../hooks/usePermissions';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import SearchBar from '../components/common/SearchBar';
import Select from '../components/common/Select';
import Pagination from '../components/common/Pagination';
import { fullName, formatDate, getInitials } from '../utils/formatters';
import { ROLE_LABELS, ROLE_COLORS } from '../constants/roles';
import { USER_STATUS } from '../constants';
import { exportToExcel } from '../utils/exportHelpers';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'on_leave', label: 'On Leave' },
];

const EmployeeList = () => {
  const navigate = useNavigate();
  const { getFirmId } = useAuthStore();
  const { can } = usePermissions();
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    settingsService.getDepartments(getFirmId()).then(d =>
      setDepartments([{ value: '', label: 'All Departments' }, ...d.map(dept => ({ value: dept.id, label: dept.name }))])
    );
  }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const { data, total } = await employeeService.getAll({
        firmId: getFirmId(), search, status, departmentId, page, pageSize
      });
      setEmployees(data || []);
      setTotal(total || 0);
    } catch (err) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [search, status, departmentId, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  const handleDeactivate = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Deactivate this employee?')) return;
    try {
      await employeeService.deactivate(id);
      toast.success('Employee deactivated');
      fetchEmployees();
    } catch {
      toast.error('Failed to deactivate employee');
    }
  };

  const handleExport = async () => {
    const { data } = await employeeService.getAll({ firmId: getFirmId(), search, status, departmentId, page: 1, pageSize: 1000 });
    exportToExcel(data, [
      { header: 'Employee ID', key: 'employee_id' },
      { header: 'Name', accessor: r => fullName(r) },
      { header: 'Email', key: 'email' },
      { header: 'Phone', key: 'phone' },
      { header: 'Designation', key: 'designation' },
      { header: 'Department', key: 'department_name' },
      { header: 'Role', accessor: r => ROLE_LABELS[r.role] || r.role_name },
      { header: 'Status', key: 'status' },
      { header: 'Joining Date', accessor: r => formatDate(r.join_date) },
    ], 'employees');
  };

  const columns = [
    {
      key: 'employee_id',
      header: 'Employee',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary">{getInitials(fullName(row))}</span>
          </div>
          <div>
            <p className="font-medium text-text-primary">{fullName(row)}</p>
            <p className="text-xs text-text-secondary">{row.employee_id || '—'} · {row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'designation', header: 'Designation', render: v => v || '—' },
    { key: 'department_name', header: 'Department', render: v => v || '—' },
    { key: 'role', header: 'Role', render: (v, row) => (
      <Badge className={ROLE_COLORS[v] || 'bg-gray-100 text-gray-600'}>
        {ROLE_LABELS[v] || row.role_name || v || '—'}
      </Badge>
    )},
    { key: 'phone', header: 'Phone', render: v => v || '—' },
    { key: 'join_date', header: 'Joining Date', render: v => formatDate(v) },
    {
      key: 'status',
      header: 'Status',
      render: v => (
        <Badge className={v === 'active' ? 'bg-green-100 text-green-700' : v === 'on_leave' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}>
          {v}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
          <button onClick={() => navigate(`/employees/${row.id}`)}
            className="p-1.5 hover:bg-gray-100 rounded-md text-text-secondary hover:text-primary transition-colors" title="View">
            <Eye size={15} />
          </button>
          {can('employees.edit') && (
            <button onClick={() => navigate(`/employees/${row.id}/edit`)}
              className="p-1.5 hover:bg-gray-100 rounded-md text-text-secondary hover:text-primary transition-colors" title="Edit">
              <Edit size={15} />
            </button>
          )}
          {can('employees.delete') && row.status === 'active' && (
            <button onClick={(e) => handleDeactivate(row.id, e)}
              className="p-1.5 hover:bg-red-50 rounded-md text-text-secondary hover:text-error transition-colors" title="Deactivate">
              <UserX size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Employees</h2>
          <p className="text-xs text-text-secondary mt-0.5">{total} total employees</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={Download} onClick={handleExport}>Export</Button>
          {can('employees.create') && (
            <Button size="sm" icon={Plus} onClick={() => navigate('/employees/new')}>Add Employee</Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card padding={false}>
        <div className="p-4 border-b border-border flex flex-wrap gap-3">
          <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by name, email, ID..." className="flex-1 min-w-48" />
          <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            options={STATUS_OPTIONS} placeholder="" className="w-40" />
          <Select value={departmentId} onChange={e => { setDepartmentId(e.target.value); setPage(1); }}
            options={departments} placeholder="" className="w-48" />
        </div>

        <Table
          columns={columns}
          data={employees}
          loading={loading}
          emptyMessage="No employees found"
          onRowClick={(row) => navigate(`/employees/${row.id}`)}
        />

        <div className="px-4">
          <Pagination page={page} pageSize={pageSize} total={total}
            onPageChange={setPage} onPageSizeChange={p => { setPageSize(p); setPage(1); }} />
        </div>
      </Card>
    </div>
  );
};

export default EmployeeList;
