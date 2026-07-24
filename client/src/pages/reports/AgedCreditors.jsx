import { useNavigate } from 'react-router-dom';
import { RefreshCw, CreditCard, AlertTriangle } from 'lucide-react';
import { useGetAgedCreditorsQuery } from '../../api/reportsApi';
import { fmtCurrency } from '../../utils/format';
import SkeletonTable from '../../components/ui/SkeletonTable';

export default function AgedCreditors() {
  const navigate = useNavigate();
  const { data = [], isLoading, refetch } = useGetAgedCreditorsQuery();

  const totals = data.reduce(
    (acc, r) => {
      acc.current  += parseFloat(r.current_amount || 0);
      acc.days_60  += parseFloat(r.days_60  || 0);
      acc.days_90  += parseFloat(r.days_90  || 0);
      acc.over_90  += parseFloat(r.over_90  || 0);
      acc.total    += parseFloat(r.total_outstanding || 0);
      return acc;
    },
    { current: 0, days_60: 0, days_90: 0, over_90: 0, total: 0 }
  );

  const overduePct = (r) => {
    const total = parseFloat(r.total_outstanding || 0);
    if (!total) return 0;
    return ((parseFloat(r.days_60 || 0) + parseFloat(r.days_90 || 0) + parseFloat(r.over_90 || 0)) / total) * 100;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Aged Creditors</h1>
          <p className="text-sm text-gray-500 mt-0.5">Outstanding AP balances by supplier, aged by GRN date</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/supplier-payments/new')} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
            <CreditCard size={15} /> New Payment
          </button>
          <button onClick={refetch} className="btn-secondary p-2 rounded-lg"><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Current (≤ 30 days)', value: totals.current, color: 'text-green-600' },
          { label: '31 – 60 days',         value: totals.days_60, color: 'text-amber-500' },
          { label: '61 – 90 days',         value: totals.days_90, color: 'text-orange-500' },
          { label: 'Over 90 days',         value: totals.over_90, color: 'text-red-600'   },
          { label: 'Total Outstanding',    value: totals.total,   color: 'text-primary-600' },
        ].map(card => (
          <div key={card.label} className="card p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide leading-tight">{card.label}</p>
            <p className={`text-lg font-bold font-mono mt-1 ${card.color}`}>{fmtCurrency(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? <SkeletonTable rows={6} cols={7} /> : data.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            <CreditCard size={32} className="mx-auto mb-3 text-gray-200" />
            No outstanding AP balances.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Supplier</th>
                  <th className="px-4 py-3 text-right font-semibold text-green-600">≤ 30 days</th>
                  <th className="px-4 py-3 text-right font-semibold text-amber-500">31–60 days</th>
                  <th className="px-4 py-3 text-right font-semibold text-orange-500">61–90 days</th>
                  <th className="px-4 py-3 text-right font-semibold text-red-600">&gt; 90 days</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">GRNs</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Total Outstanding</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Overdue %</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map(r => {
                  const pct = overduePct(r);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{r.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{r.code}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-green-600">
                        {parseFloat(r.current_amount) > 0 ? fmtCurrency(r.current_amount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-600">
                        {parseFloat(r.days_60) > 0 ? fmtCurrency(r.days_60) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-orange-600">
                        {parseFloat(r.days_90) > 0 ? fmtCurrency(r.days_90) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-red-600">
                        {parseFloat(r.over_90) > 0 ? fmtCurrency(r.over_90) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{r.grn_count}</td>
                      <td className="px-4 py-3 text-right font-bold font-mono text-gray-900">
                        {fmtCurrency(r.total_outstanding)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {pct > 50 && <AlertTriangle size={13} className="text-red-500" />}
                          <span className={`text-xs font-semibold ${pct > 50 ? 'text-red-600' : pct > 20 ? 'text-amber-600' : 'text-green-600'}`}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => navigate(`/supplier-payments/new?supplier_id=${r.id}`)}
                          className="text-xs text-primary-600 hover:underline font-medium"
                        >
                          Pay
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                  <td className="px-4 py-3 text-gray-800">TOTALS</td>
                  <td className="px-4 py-3 text-right font-mono text-green-700">{fmtCurrency(totals.current)}</td>
                  <td className="px-4 py-3 text-right font-mono text-amber-700">{fmtCurrency(totals.days_60)}</td>
                  <td className="px-4 py-3 text-right font-mono text-orange-700">{fmtCurrency(totals.days_90)}</td>
                  <td className="px-4 py-3 text-right font-mono text-red-700">{fmtCurrency(totals.over_90)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{data.reduce((s, r) => s + Number(r.grn_count), 0)}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900 text-base">{fmtCurrency(totals.total)}</td>
                  <td />
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
