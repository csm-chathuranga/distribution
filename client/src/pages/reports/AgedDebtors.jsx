import { useGetAgedDebtorsQuery } from '../../api/reportsApi';
import { fmtCurrency } from '../../utils/format';

export default function AgedDebtors() {
  const { data, isLoading } = useGetAgedDebtorsQuery();
  const rows = data?.rows || [];
  const totals = data?.totals || {};

  const ageCol = (label, key) => ({ label, key });
  const ageCols = [
    ageCol('Current (0-30 days)', 'current'),
    ageCol('31-60 days', 'days_31_60'),
    ageCol('61-90 days', 'days_61_90'),
    ageCol('Over 90 days', 'over_90'),
  ];

  return (
    <div className="card">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Aged Debtors Report</h2>
        <p className="text-sm text-gray-500 mt-0.5">Outstanding customer balances by age bucket</p>
      </div>

      {!isLoading && totals.total > 0 && (
        <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 border-b">
          {ageCols.map(c => (
            <div key={c.key} className="text-center">
              <div className="text-xl font-bold text-gray-900">{fmtCurrency(totals[c.key] || 0)}</div>
              <div className="text-xs text-gray-500">{c.label}</div>
            </div>
          ))}
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">{fmtCurrency(totals.total || 0)}</div>
            <div className="text-xs text-gray-500">Total Outstanding</div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3 font-medium text-gray-600">Customer</th>
              <th className="text-right p-3 font-medium text-gray-600">0-30 days</th>
              <th className="text-right p-3 font-medium text-gray-600">31-60 days</th>
              <th className="text-right p-3 font-medium text-gray-600">61-90 days</th>
              <th className="text-right p-3 font-medium text-gray-600">Over 90</th>
              <th className="text-right p-3 font-medium text-gray-600 border-l">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">No outstanding balances</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-3 font-medium">{r.customer_name}</td>
                {ageCols.map(c => (
                  <td key={c.key} className={`p-3 text-right ${parseFloat(r[c.key]) > 0 ? (c.key === 'over_90' ? 'text-red-600 font-semibold' : c.key === 'days_61_90' ? 'text-amber-600' : '') : 'text-gray-400'}`}>
                    {parseFloat(r[c.key]) > 0 ? fmtCurrency(r[c.key]) : '-'}
                  </td>
                ))}
                <td className="p-3 text-right font-bold border-l text-red-600">{fmtCurrency(r.total)}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t-2 bg-gray-50 font-semibold">
              <tr>
                <td className="p-3">Totals</td>
                {ageCols.map(c => (
                  <td key={c.key} className="p-3 text-right">{fmtCurrency(totals[c.key] || 0)}</td>
                ))}
                <td className="p-3 text-right font-bold border-l text-red-600">{fmtCurrency(totals.total || 0)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
