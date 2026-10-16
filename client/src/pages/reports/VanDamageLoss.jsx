import { useState } from 'react';
import { useGetVanDamageLossQuery } from '../../api/reportsApi';
import { fmtDate, fmtCurrency, fmtNumber, today } from '../../utils/format';

const firstDayOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const SOURCE_BADGE = {
  LOADING_SHEET: 'bg-blue-100 text-blue-700',
  REPORTED:      'bg-amber-100 text-amber-700',
};

const REASON_LABEL = {
  DAMAGE:  'Damaged',
  EXPIRED: 'Expired',
  OTHER:   'Other',
};

export default function VanDamageLoss() {
  const [from,       setFrom]       = useState(firstDayOfMonth());
  const [to,         setTo]         = useState(today());
  const [srcFilter,  setSrcFilter]  = useState('');
  const [repFilter,  setRepFilter]  = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading } = useGetVanDamageLossQuery({ from, to });
  const allRows = data?.rows || [];

  // Client-side filters
  const rows = allRows.filter(r =>
    (!srcFilter  || r.source === srcFilter) &&
    (!repFilter  || r.reported_by === repFilter) &&
    (!typeFilter || r.reference === typeFilter)
  );

  // Derive distinct reporter names for dropdown
  const reporters = [...new Set(allRows.map(r => r.reported_by).filter(Boolean))].sort();

  const summary = {
    totalDamaged:  rows.reduce((s, r) => s + parseFloat(r.damaged_quantity || 0), 0),
    totalLost:     rows.reduce((s, r) => s + parseFloat(r.lost_quantity    || 0), 0),
    totalWriteOff: rows.reduce((s, r) => s + parseFloat(r.write_off_value  || 0), 0),
  };

  return (
    <div className="space-y-4">
      {/* Header + filters */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Van Damage &amp; Loss Report</h2>
          <p className="text-sm text-gray-500 mt-0.5">From loading sheets and manually reported items</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">From:</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">To:</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-sm" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-wrap gap-2 items-center">
        <select value={srcFilter} onChange={e => setSrcFilter(e.target.value)} className="input-sm">
          <option value="">All Sources</option>
          <option value="LOADING_SHEET">Loading Sheet</option>
          <option value="REPORTED">Manually Reported</option>
        </select>
        <select value={repFilter} onChange={e => setRepFilter(e.target.value)} className="input-sm">
          <option value="">All Reporters</option>
          {reporters.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-sm">
          <option value="">All Reasons</option>
          <option value="DAMAGE">Damaged</option>
          <option value="EXPIRED">Expired</option>
          <option value="OTHER">Other</option>
        </select>
        {(srcFilter || repFilter || typeFilter) && (
          <button onClick={() => { setSrcFilter(''); setRepFilter(''); setTypeFilter(''); }}
            className="text-xs text-gray-400 hover:text-red-500 underline">
            Clear filters
          </button>
        )}
      </div>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center border-l-4 border-orange-400">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Damaged</p>
            <p className="text-2xl font-bold text-orange-600">{fmtNumber(summary.totalDamaged)} units</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-red-400">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Lost</p>
            <p className="text-2xl font-bold text-red-600">{fmtNumber(summary.totalLost)} units</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-gray-400">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Write-off</p>
            <p className="text-2xl font-bold text-gray-800 font-mono">{fmtCurrency(summary.totalWriteOff)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium text-gray-600">Date</th>
                <th className="text-left p-3 font-medium text-gray-600">Source</th>
                <th className="text-left p-3 font-medium text-gray-600">Reference</th>
                <th className="text-left p-3 font-medium text-gray-600">Reported By</th>
                <th className="text-left p-3 font-medium text-gray-600">Product</th>
                <th className="text-right p-3 font-medium text-gray-600">Loaded</th>
                <th className="text-right p-3 font-medium text-orange-600">Damaged</th>
                <th className="text-right p-3 font-medium text-red-600">Lost</th>
                <th className="text-right p-3 font-medium text-gray-600">Write-off</th>
                <th className="text-left p-3 font-medium text-gray-600">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={10} className="p-8 text-center text-gray-400">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-gray-400">No damage or loss recorded in this period</td></tr>
              ) : rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-3 whitespace-nowrap text-gray-600">{fmtDate(r.date)}</td>
                  <td className="p-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SOURCE_BADGE[r.source] || 'bg-gray-100 text-gray-600'}`}>
                      {r.source === 'LOADING_SHEET' ? 'Loading Sheet' : 'Reported'}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-primary-700 whitespace-nowrap">
                    {r.source === 'REPORTED'
                      ? <span className="font-semibold text-amber-700">{REASON_LABEL[r.reference] || r.reference}</span>
                      : r.reference}
                  </td>
                  <td className="p-3 text-gray-700">{r.reported_by}</td>
                  <td className="p-3">
                    <div className="font-medium text-gray-900">{r.product_name}</div>
                    <div className="text-xs text-gray-400 font-mono">{r.sku}</div>
                  </td>
                  <td className="p-3 text-right text-gray-400">
                    {r.loaded_quantity != null ? fmtNumber(r.loaded_quantity) : '—'}
                  </td>
                  <td className="p-3 text-right">
                    {parseFloat(r.damaged_quantity) > 0
                      ? <span className="font-bold text-orange-600">{fmtNumber(r.damaged_quantity)}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="p-3 text-right">
                    {parseFloat(r.lost_quantity) > 0
                      ? <span className="font-bold text-red-600">{fmtNumber(r.lost_quantity)}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="p-3 text-right font-mono font-semibold text-gray-800">
                    {parseFloat(r.write_off_value) > 0 ? fmtCurrency(r.write_off_value) : '—'}
                  </td>
                  <td className="p-3 text-gray-500 text-xs max-w-[180px] truncate" title={r.notes || ''}>{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td colSpan={6} className="p-3 text-gray-600">Totals ({rows.length} items)</td>
                  <td className="p-3 text-right text-orange-600">{fmtNumber(summary.totalDamaged)}</td>
                  <td className="p-3 text-right text-red-600">{fmtNumber(summary.totalLost)}</td>
                  <td className="p-3 text-right font-mono text-gray-900">{fmtCurrency(summary.totalWriteOff)}</td>
                  <td className="p-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
