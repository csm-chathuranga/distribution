import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

function getPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 4) pages.push('...');
  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 3) pages.push('...');
  pages.push(total);
  return pages;
}

export default function Pagination({ page, total, limit, onChange, onPerPageChange }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1 && !onPerPageChange) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const pages = getPages(page, totalPages);

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 flex-wrap gap-3">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>Showing {from}–{to} of {total} records</span>
        {onPerPageChange && (
          <select
            value={limit}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="input-sm py-1 text-xs"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            disabled={page === 1}
            onClick={() => onChange(page - 1)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>

          {pages.map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400">
                <MoreHorizontal size={14} />
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onChange(p)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  p === page ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            disabled={page === totalPages}
            onClick={() => onChange(page + 1)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
