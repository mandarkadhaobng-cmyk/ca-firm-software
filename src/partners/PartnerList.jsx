import { useState, useEffect, useCallback } from 'react';
import { Briefcase, Mail, Phone, Calendar, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/apiClient';
import { usePermissions } from '../hooks/usePermissions';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import SearchBar from '../components/common/SearchBar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { fullName, formatDate, getInitials } from '../utils/formatters';

const STATUS_BADGE = {
  active:   'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
};

const PartnerList = () => {
  const { roleSlug } = usePermissions();
  const [partners, setPartners]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');

  const canManage = ['super_admin'].includes(roleSlug);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: 100 });
      if (search) params.append('search', search);
      const { data } = await api.get(`/partners?${params}`);
      const list = data?.data?.data || data?.data || [];
      const count = data?.data?.total || list.length;
      setPartners(list);
      setTotal(count);
    } catch {
      toast.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchPartners, 300);
    return () => clearTimeout(t);
  }, [fetchPartners]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Briefcase size={20} className="text-primary" />
            Partners
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {total} partner{total !== 1 ? 's' : ''} — firm owners and top-level management
          </p>
        </div>
      </div>

      {/* Search */}
      <SearchBar
        value={search}
        onChange={v => setSearch(v)}
        placeholder="Search by name or email…"
        className="max-w-sm"
      />

      {/* Cards grid */}
      {partners.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <Briefcase size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-text-secondary">No partners found.</p>
            {canManage && (
              <p className="text-xs text-text-secondary mt-1">
                Add a user with the <strong>Partner</strong> role via Employee Management → Add Employee.
              </p>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={fullName(p)} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <span className="text-primary font-semibold text-sm">{getInitials(fullName(p))}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-text-primary truncate">{fullName(p)}</p>
                    <Badge className={STATUS_BADGE[p.status] || STATUS_BADGE.inactive}>
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 truncate">
                    {p.designation || 'Partner'}
                    {p.department_name ? ` · ${p.department_name}` : ''}
                  </p>

                  <div className="mt-3 space-y-1.5">
                    {p.email && (
                      <a
                        href={`mailto:${p.email}`}
                        className="flex items-center gap-2 text-xs text-text-secondary hover:text-primary transition-colors"
                      >
                        <Mail size={12} className="flex-shrink-0" />
                        <span className="truncate">{p.email}</span>
                      </a>
                    )}
                    {p.phone && (
                      <a
                        href={`tel:${p.phone}`}
                        className="flex items-center gap-2 text-xs text-text-secondary hover:text-primary transition-colors"
                      >
                        <Phone size={12} className="flex-shrink-0" />
                        <span>{p.phone}</span>
                      </a>
                    )}
                    {p.join_date && (
                      <p className="flex items-center gap-2 text-xs text-text-secondary">
                        <Calendar size={12} className="flex-shrink-0" />
                        Since {formatDate(p.join_date)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {p.branch_name && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-text-secondary">Branch: <span className="text-text-primary">{p.branch_name}</span></p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PartnerList;
