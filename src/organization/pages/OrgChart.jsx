import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, User } from 'lucide-react';
import toast from 'react-hot-toast';
import * as orgService from '../services/organizationService';
import { getInitials } from '../../utils/formatters';

/** Build tree from flat list */
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

const ROLE_BG = {
  partner: 'border-purple-300 bg-purple-50',
  hr: 'border-blue-300 bg-blue-50',
  manager: 'border-amber-300 bg-amber-50',
  super_admin: 'border-red-300 bg-red-50',
};

const OrgNode = ({ node, depth = 0 }) => {
  const [collapsed, setCollapsed] = useState(depth > 1);
  const hasChildren = node.children?.length > 0;
  const borderColor = ROLE_BG[node.role_slug] || 'border-border bg-white';

  return (
    <div className={`relative ${depth > 0 ? 'pl-6 border-l border-dashed border-gray-300 ml-4' : ''}`}>
      <div className={`inline-flex items-center gap-2 border rounded-xl px-3 py-2 mb-2 shadow-sm ${borderColor}`}>
        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <span className="text-primary text-xs font-bold">{getInitials(`${node.first_name} ${node.last_name}`)}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary leading-tight">{node.first_name} {node.last_name}</p>
          <p className="text-xs text-text-secondary">{node.designation || node.role_name || node.role_slug}</p>
        </div>
        {hasChildren && (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="ml-1 p-0.5 rounded hover:bg-gray-200 text-text-secondary"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>
      {hasChildren && !collapsed && (
        <div className="ml-2">
          {node.children.map(child => <OrgNode key={child.id} node={child} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
};

const OrgChart = () => {
  const [tree, setTree]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orgService.getHierarchy()
      .then(data => setTree(buildTree(data || [])))
      .catch(() => toast.error('Failed to load hierarchy'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Organization Chart</h1>
        <p className="text-sm text-text-secondary mt-0.5">Reporting hierarchy of your firm</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_,i) => (
            <div key={i} style={{ marginLeft: `${i * 24}px` }}
              className="h-12 w-48 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : tree.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <User size={36} className="mx-auto mb-3 opacity-30" />
          <p>No reporting structure configured yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-max space-y-1">
            {tree.map(root => <OrgNode key={root.id} node={root} depth={0} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgChart;
