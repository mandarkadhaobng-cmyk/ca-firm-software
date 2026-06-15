import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ page, pageSize, total, onPageChange, onPageSizeChange }) => {
  const totalPages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between px-1 py-3 border-t border-border">
      <p className="text-xs text-text-secondary">
        Showing <span className="font-medium text-text-primary">{from}–{to}</span> of{' '}
        <span className="font-medium text-text-primary">{total}</span> records
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="text-xs border border-border rounded-md px-2 py-1.5 text-text-primary bg-white focus:outline-none"
          >
            {[10, 15, 25, 50].map(s => (
              <option key={s} value={s}>{s} / page</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-text-secondary"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let p;
            if (totalPages <= 5) p = i + 1;
            else if (page <= 3) p = i + 1;
            else if (page >= totalPages - 2) p = totalPages - 4 + i;
            else p = page - 2 + i;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 text-xs rounded-md font-medium transition-colors
                  ${page === p
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-gray-100'
                  }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-text-secondary"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
