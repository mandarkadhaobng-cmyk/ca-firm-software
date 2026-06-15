/**
 * OrgDirectory — unified Employee Directory + Org Chart page
 * Toggle between Grid (directory) and Tree (hierarchy) views.
 * Click any card to open a profile side-panel with full details and reporting hierarchy.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Search, Users, MapPin, Phone, Briefcase, Mail, ChevronDown, ChevronRight,
  X, LayoutGrid, Network, Building2, Calendar, Hash, UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as orgService from '../services/organizationService';
import { getInitials, fullName, formatDate } from '../../utils/formatters';

// ── Role styling ──────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  partner:     'bg-purple-100 text-purple-700',
  hr:          'bg-blue-100 text-blue-700',
  manager:     'bg-amber-100 text-amber-700',
  employee:    'bg-green-100 text-green-700',
  article:     'bg-gray-100 text-gray-600',
  super_admin: 'bg-red-100 text-red-700',
};

const ROLE_BORDER = {
  partner:     'border-purple-300 bg-purple-50',
  hr:          'border-blue-300 bg-blue-50',
  manager:     'border-amber-300 bg-amber-50',
  super_admin: 'border-red-300 bg-red-50',
};

// ── Employee avatar ───────────────────────────────────────────────────────────
const Avatar = ({ emp, size = 14, textSize = 'text-lg' }) => (
  emp.photo_url
    ? <img src={emp.photo_url} alt="" style={{ width: size * 4, height: size * 4 }}
           className="rounded-full object-cover border-2 border-border flex-shrink-0" />
    : <div style={{ width: size * 4, height: size * 4 }}
           className="rounded-full bg-primary/10 flex items-center justify-center border-2 border-border flex-shrink-0">
        <span className={`text-primary font-bold ${textSize}`}>{getInitials(`${emp.first_name} ${emp.last_name}`)}</span>
      </div>
);

// ── Employee card (grid view) ─────────────────────────────────────────────────
const EmployeeCard = ({ emp, onClick }) => {
  const roleColor = ROLE_COLORS[emp.role_slug] || ROLE_COLORS.employee;
  return (
    <button
      onClick={() => onClick(emp)}
      className="theme-card border rounded-xl p-4 hover:shadow-md transition-all flex flex-col items-center
                 text-center gap-2 w-full text-left hover:border-primary/30 group"
    >
      <Avatar emp={emp} size={14} textSize="text-lg" />
      <div className="w-full">
        <p className="font-semibold text-text-primary text-sm group-hover:text-primary transition-colors">
          {emp.first_name} {emp.last_name}
        </p>
        {emp.designation && <p className="text-xs text-text-secondary mt-0.5">{emp.designation}</p>}
        <span className={`mt-1.5 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${roleColor}`}>
          {emp.role_name || emp.role_slug}
        </span>
      </div>
      {emp.department && (
        <div className="flex items-center gap-1 text-xs text-text-secondary">
          <Briefcase size={11} className="flex-shrink-0" />
          <span className="truncate">{emp.department}</span>
        </div>
      )}
      {emp.email && (
        <div className="flex items-center gap-1 text-xs text-text-secondary">
          <Mail size={11} className="flex-shrink-0" />
          <span className="truncate max-w-[140px]">{emp.email}</span>
        </div>
      )}
    </button>
  );
};

// ── Org chart node (tree view) ────────────────────────────────────────────────
const OrgNode = ({ node, depth = 0, onSelect }) => {
  const [collapsed, setCollapsed] = useState(depth > 1);
  const hasChildren = node.children?.length > 0;
  const borderStyle = ROLE_BORDER[node.role_slug] || 'border-border bg-card-bg';

  return (
    <div className={`relative ${depth > 0 ? 'pl-6 border-l border-dashed border-gray-300 ml-4' : ''}`}>
      <div className={`inline-flex items-center gap-2 border-2 rounded-xl px-3 py-2 mb-2 shadow-sm cursor-pointer
                       hover:shadow-md transition-shadow ${borderStyle}`}
           onClick={() => onSelect(node)}>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-primary text-xs font-bold">{getInitials(`${node.first_name} ${node.last_name}`)}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary leading-tight whitespace-nowrap">
            {node.first_name} {node.last_name}
          </p>
          <p className="text-xs text-text-secondary truncate max-w-[140px]">
            {node.designation || node.role_name || node.role_slug}
          </p>
        </div>
        {hasChildren && (
          <button onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}
            className="ml-1 p-0.5 rounded hover:bg-gray-200 text-text-secondary flex-shrink-0">
            {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>
      {hasChildren && !collapsed && (
        <div className="ml-2">
          {node.children.map(child => (
            <OrgNode key={child.id} node={child} depth={depth + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Profile panel ─────────────────────────────────────────────────────────────
const ProfilePanel = ({ emp, allEmployees, onClose }) => {
  if (!emp) return null;
  const roleColor = ROLE_COLORS[emp.role_slug] || ROLE_COLORS.employee;

  // Find who this person reports to
  const reportsTo = emp.reports_to_id
    ? allEmployees.find(e => e.id === emp.reports_to_id)
    : null;

  // Find direct reports (people who report to this person)
  const directReports = allEmployees.filter(e => e.reports_to_id === emp.id);

  const InfoRow = ({ icon: Icon, label, value }) => value ? (
    <div className="flex items-start gap-2.5 py-2 border-b border-border last:border-0">
      <Icon size={14} className="text-text-secondary mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="text-sm text-text-primary font-medium break-words">{value}</p>
      </div>
    </div>
  ) : null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 lg:w-96 bg-card-bg shadow-xl border-l border-border z-40
                    flex flex-col overflow-hidden animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
        <h3 className="font-semibold text-text-primary">Employee Profile</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-text-secondary">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3 px-5 py-6 border-b border-border bg-card-bg">
          <Avatar emp={emp} size={16} textSize="text-2xl" />
          <div className="text-center">
            <h2 className="text-lg font-bold text-text-primary">
              {emp.first_name} {emp.last_name}
            </h2>
            {emp.designation && (
              <p className="text-sm text-text-secondary">{emp.designation}</p>
            )}
            <span className={`mt-2 inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${roleColor}`}>
              {emp.role_name || emp.role_slug}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="px-5 py-4 space-y-0">
          <InfoRow icon={Hash}       label="Employee ID"   value={emp.employee_code || emp.employee_id} />
          <InfoRow icon={Building2}  label="Department"    value={emp.department} />
          <InfoRow icon={Briefcase}  label="Designation"   value={emp.designation} />
          <InfoRow icon={Mail}       label="Email"         value={emp.email} />
          <InfoRow icon={Phone}      label="Phone"         value={emp.work_phone || emp.phone} />
          <InfoRow icon={MapPin}     label="Location"      value={emp.work_location} />
          <InfoRow icon={Calendar}   label="Joining Date"  value={
            emp.join_date ? new Date(emp.join_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : null
          } />
        </div>

        {/* Reporting structure */}
        {(reportsTo || directReports.length > 0) && (
          <div className="px-5 py-4 border-t border-border">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
              Reporting Structure
            </h4>

            {reportsTo && (
              <div className="mb-4">
                <p className="text-xs text-text-secondary mb-2">Reports To</p>
                <div className="flex items-center gap-2.5 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-700 text-xs font-bold">
                      {getInitials(`${reportsTo.first_name} ${reportsTo.last_name}`)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">
                      {reportsTo.first_name} {reportsTo.last_name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {reportsTo.designation || reportsTo.role_name}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {directReports.length > 0 && (
              <div>
                <p className="text-xs text-text-secondary mb-2">
                  Direct Reports ({directReports.length})
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {directReports.map(dr => (
                    <div key={dr.id} className="flex items-center gap-2.5 p-2 bg-green-50 rounded-lg border border-green-100">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-green-700 text-xs font-bold">
                          {getInitials(`${dr.first_name} ${dr.last_name}`)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-text-primary">
                          {dr.first_name} {dr.last_name}
                        </p>
                        <p className="text-xs text-text-secondary truncate">
                          {dr.designation || dr.role_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Tree builder ──────────────────────────────────────────────────────────────
const buildTree = (employees) => {
  const byId = {};
  employees.forEach(e => { byId[e.id] = { ...e, children: [] }; });
  const roots = [];
  employees.forEach(e => {
    if (e.reports_to_id && byId[e.reports_to_id]) {
      byId[e.reports_to_id].children.push(byId[e.id]);
    } else {
      roots.push(byId[e.id]);
    }
  });
  return roots;
};

// ── Main Component ────────────────────────────────────────────────────────────
const OrgDirectory = () => {
  const [allEmployees, setAllEmployees] = useState([]);
  const [filtered, setFiltered]         = useState([]);
  const [departments, setDepartments]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [deptFilter, setDeptFilter]     = useState('');
  const [view, setView]                 = useState('grid'); // 'grid' | 'chart'
  const [selected, setSelected]         = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, depts] = await Promise.all([
        orgService.getHierarchy ? orgService.getHierarchy() : orgService.getDirectory({}),
        orgService.listDepartments(),
      ]);
      setAllEmployees(emps || []);
      setFiltered(emps || []);
      setDepartments(depts || []);
    } catch { toast.error('Failed to load directory'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Client-side filter for grid view
  useEffect(() => {
    let list = allEmployees;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        (`${e.first_name} ${e.last_name}`).toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q) ||
        (e.designation || '').toLowerCase().includes(q)
      );
    }
    if (deptFilter) {
      list = list.filter(e => String(e.department_id) === String(deptFilter));
    }
    setFiltered(list);
  }, [search, deptFilter, allEmployees, departments]);

  const orgTree = buildTree(allEmployees);

  return (
    <div className={`transition-all ${selected ? 'pr-80 lg:pr-96' : ''}`}>
      {/* Profile side-panel */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelected(null)} />
          <ProfilePanel emp={selected} allEmployees={allEmployees} onClose={() => setSelected(null)} />
        </>
      )}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Organization</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {allEmployees.length} people · {departments.length} departments
            </p>
          </div>
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden bg-card-bg">
            <button onClick={() => setView('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors
                ${view === 'grid' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              <LayoutGrid size={14} /> Directory
            </button>
            <button onClick={() => setView('chart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-l border-border
                ${view === 'chart' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              <Network size={14} /> Hierarchy
            </button>
          </div>
        </div>

        {/* Filters — only for grid view */}
        {view === 'grid' && (
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input type="text" placeholder="Search name, email, designation…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary/20
                           bg-card-bg text-text-primary" />
            </div>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none
                         bg-card-bg text-text-primary min-w-[160px]">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_,i) => <div key={i} className="h-52 bg-gray-100 animate-pulse rounded-xl" />)}
          </div>
        ) : view === 'grid' ? (
          filtered.length === 0 ? (
            <div className="text-center py-16 text-text-secondary">
              <Users size={36} className="mx-auto mb-3 opacity-30" />
              <p>No employees found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map(emp => (
                <EmployeeCard key={emp.id} emp={emp} onClick={setSelected} />
              ))}
            </div>
          )
        ) : (
          /* Hierarchy / chart view */
          <div className="theme-card border border-border rounded-xl p-5 overflow-x-auto">
            {orgTree.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">
                <Network size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hierarchy set up yet.</p>
                <p className="text-xs mt-1">Assign reporting managers from the Employee profile pages.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orgTree.map(root => (
                  <OrgNode key={root.id} node={root} depth={0} onSelect={setSelected} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrgDirectory;
