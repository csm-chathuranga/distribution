import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useGetCustomerReturnsQuery } from '../../api/salesApi';
import { fmtDate } from '../../utils/format';

const STATUS_BADGE = {
  DRAFT:     'badge-warning',
  CONFIRMED: 'badge-success',
  CREDITED:  'badge-info',
  CANCELLED: 'badge-danger',
};

export default function CustomerReturnList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetCustomerReturnsQuery({ page, limit: 20 });
  const returns = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customer Return Notes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Return notes issued to customers when goods are taken back</p>
        </div>
        <button onClick={() => navigate('/customer-returns/new')} className="btn btn-primary flex items-center gap-2">
          <Plus size={16} /> New Return
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : returns.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No return notes found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th">Return #</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Status</th>
                  <th className="table-th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {returns.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/customer-returns/${r.id}`)}>
                    <td className="table-td font-mono font-semibold text-primary-700">{r.return_number}</td>
                    <td className="table-td text-gray-600">{fmtDate(r.return_date)}</td>
                    <td className="table-td font-medium">{r.Customer?.name}</td>
                    <td className="table-td">
                      <span className={`badge ${STATUS_BADGE[r.status] || 'badge-secondary'}`}>{r.status}</span>
                    </td>
                    <td className="table-td text-right">
                      <button className="text-primary-600 hover:underline text-xs font-medium">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data?.total > 20 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p-1)} className="btn btn-secondary btn-sm">Prev</button>
          <span className="text-sm text-gray-500 self-center">Page {page}</span>
          <button disabled={returns.length < 20} onClick={() => setPage(p => p+1)} className="btn btn-secondary btn-sm">Next</button>
        </div>
      )}
    </div>
  );
}
