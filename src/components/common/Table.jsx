import { ChevronUp, ChevronDown } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

const Table = ({
  columns,
  data = [],
  loading = false,
  emptyMessage = 'No data found',
  emptyIcon,
  onRowClick,
  className = '',
  stickyHeader = false,
}) => {
  if (loading) return <div className="py-12"><LoadingSpinner /></div>;
  if (!data.length) return <EmptyState message={emptyMessage} icon={emptyIcon} />;

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead className={`${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
          <tr className="border-b border-border bg-gray-50/70">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap
                  ${col.className || ''}`}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row, idx) => (
            <tr
              key={row.id || idx}
              onClick={() => onRowClick?.(row)}
              className={`bg-white transition-colors duration-100
                ${onRowClick ? 'cursor-pointer hover:bg-gray-50/70' : 'hover:bg-gray-50/30'}`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3.5 text-text-primary ${col.cellClassName || ''}`}
                >
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
