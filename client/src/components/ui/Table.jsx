export default function Table({ columns, data = [], loading, emptyText = 'No records found.' }) {
  if (loading) return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-3" />
      Loading...
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map(col => (
              <th key={col.key} className={`table-th ${col.className || ''}`}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-gray-400 text-sm">{emptyText}</td>
            </tr>
          ) : data.map((row, i) => (
            <tr key={row.id || i} className="hover:bg-gray-50 transition-colors">
              {columns.map(col => (
                <td key={col.key} className={`table-td ${col.className || ''}`}>
                  {col.cell ? col.cell(row) : row[col.key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
