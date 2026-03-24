import { useState, useMemo } from 'react';

export default function DataTable({ columns, data, pageSize = 20, searchPlaceholder = 'Search...', onRowClick, title, extra }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = col.accessor ? col.accessor(row) : row[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    const col = columns.find(c => c.key === sortCol);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = col.accessor ? col.accessor(a) : a[col.key];
      const bVal = col.accessor ? col.accessor(b) : b[col.key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir, columns]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key) => {
    if (sortCol === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  return (
    <div className="table-container" data-testid="data-table">
      <div className="flex items-center justify-between p-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          {title && <span className="text-sm font-semibold text-gray-700">{title}</span>}
          <span className="text-xs text-gray-400">{filtered.length} items</span>
        </div>
        <div className="flex items-center gap-3">
          {extra}
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="px-3 py-1.5 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 w-56"
            data-testid="input-table-search"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border bg-gray-50/50">
              {columns.map(col => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 whitespace-nowrap"
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {sortCol === col.key && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        {sortDir === 'asc' ? <path d="M7 14l5-5 5 5z"/> : <path d="M7 10l5 5 5-5z"/>}
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {paginated.map((row, i) => (
              <tr
                key={row.id || i}
                className={`hover:bg-blue-50/30 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
                data-testid={`row-${row.id || i}`}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-sm whitespace-nowrap">
                    {col.render ? col.render(row) : (col.accessor ? col.accessor(row) : row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">No results found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
          <span className="text-xs text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button onClick={() => setPage(0)} disabled={page === 0} className="px-2 py-1 text-xs rounded border border-surface-border disabled:opacity-30 hover:bg-gray-50" data-testid="button-page-first">«</button>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 text-xs rounded border border-surface-border disabled:opacity-30 hover:bg-gray-50" data-testid="button-page-prev">‹</button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-2 py-1 text-xs rounded border border-surface-border disabled:opacity-30 hover:bg-gray-50" data-testid="button-page-next">›</button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="px-2 py-1 text-xs rounded border border-surface-border disabled:opacity-30 hover:bg-gray-50" data-testid="button-page-last">»</button>
          </div>
        </div>
      )}
    </div>
  );
}
