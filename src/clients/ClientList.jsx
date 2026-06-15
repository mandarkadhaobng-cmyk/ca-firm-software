import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { clientService } from '../services/clientService';
import { usePermissions } from '../hooks/usePermissions';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import SearchBar from '../components/common/SearchBar';
import Select from '../components/common/Select';
import Pagination from '../components/common/Pagination';
import { fullName, formatDate } from '../utils/formatters';
import { exportToExcel } from '../utils/exportHelpers';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'prospect', label: 'Prospect' },
];

const ClientList = () => {
  const navigate = useNavigate();
  const { getFirmId } = useAuthStore();
  const { can } = usePermissions();
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await clientService.getAll({ firmId: getFirmId(), search, status, page, pageSize });
      setClients(data || []);
      setTotal(count || 0);
    } catch {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [search, status, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(fetchClients, 300);
    return () => clearTimeout(timer);
  }, [fetchClients]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this client? This cannot be undone.')) return;
    try {
      await clientService.delete(id);
      toast.success('Client deleted');
      fetchClients();
    } catch {
      toast.error('Cannot delete client with existing assignments');
    }
  };

  const handleExport = async () => {
    const { data } = await clientService.getAll({ firmId: getFirmId(), search, status, page: 1, pageSize: 1000 });
    exportToExcel(data, [
      { header: 'Client Name', key: 'client_name' },
      { header: 'Client Code', key: 'client_code' },
      { header: 'PAN', key: 'pan_number' },
      { header: 'GST', key: 'gst_number' },
      { header: 'Industry', key: 'industry' },
      { header: 'Partner', accessor: r => r.assigned_partner ? fullName(r.assigned_partner) : '—' },
      { header: 'Manager', accessor: r => r.assigned_manager ? fullName(r.assigned_manager) : '—' },
      { header: 'Status', key: 'status' },
    ], 'clients');
  };

  const columns = [
    {
      key: 'client_name',
      header: 'Client',
      render: (v, row) => (
        <div>
          <p className="font-medium text-text-primary">{v}</p>
          <p className="text-xs text-text-secondary">{row.client_code} · {row.industry || '—'}</p>
        </div>
      ),
    },
    { key: 'pan_number', header: 'PAN', render: v => v || '—' },
    { key: 'assigned_partner', header: 'Partner', render: v => v ? fullName(v) : '—' },
    { key: 'assigned_manager', header: 'Manager', render: v => v ? fullName(v) : '—' },
    {
      key: 'status',
      header: 'Status',
      render: v => (
        <Badge className={v === 'active' ? 'bg-green-100 text-green-700' : v === 'prospect' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}>
          {v}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
          {can('clients.edit') && (
            <button onClick={() => navigate(`/clients/${row.id}/edit`)}
              className="p-1.5 hover:bg-gray-100 rounded-md text-text-secondary hover:text-primary transition-colors">
              <Edit size={15} />
            </button>
          )}
          {can('clients.delete') && (
            <button onClick={(e) => handleDelete(row.id, e)}
              className="p-1.5 hover:bg-red-50 rounded-md text-text-secondary hover:text-error transition-colors">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Clients</h2>
          <p className="text-xs text-text-secondary mt-0.5">{total} total clients</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={Download} onClick={handleExport}>Export</Button>
          {can('clients.create') && (
            <Button size="sm" icon={Plus} onClick={() => navigate('/clients/new')}>Add Client</Button>
          )}
        </div>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-border flex flex-wrap gap-3">
          <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by name, code, PAN..." className="flex-1 min-w-48" />
          <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            options={STATUS_OPTIONS} placeholder="" className="w-40" />
        </div>

        <Table columns={columns} data={clients} loading={loading} emptyMessage="No clients found"
          onRowClick={() => {}} />

        <div className="px-4">
          <Pagination page={page} pageSize={pageSize} total={total}
            onPageChange={setPage} onPageSizeChange={p => { setPageSize(p); setPage(1); }} />
        </div>
      </Card>
    </div>
  );
};

export default ClientList;
