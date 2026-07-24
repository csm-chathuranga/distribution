import { useState } from 'react';
import { useGetStockMovementQuery } from '../../api/reportsApi';
import { fmtDate, fmtNumber, today } from '../../utils/format';

const firstDayOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const MOVEMENT_COLORS = {
  IN: 'bg-green-100 text-green-800', OUT: 'bg-red-100 text-red-800',
  ADJ: 'bg-blue-100 text-blue-800', TRANSFER: 'bg-purple-100 text-purple-800',
  RETURN: 'bg-amber-100 text-amber-800',
};

export default function StockMovement() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());
  const { data, isLoading } = useGetStockMovementQuery({ from, to });
  const rows = data?.rows || [];

  return (
    <div className="card">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Stock Movement Report</h2>
          <p className="text-sm text-gray-500 mt-0.5">All stock in / out / adjustments</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To:</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-sm" />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3 font-medium text-gray-600">Date</th>
              <th className="text-left p-3 font-medium text-gray-600">Product</th>
              <th className="text-left p-3 font-medium text-gray-600">Warehouse</th>
              <th className="text-center p-3 font-medium text-gray-600">Type</th>
              <th className="text-right p-3 font-medium text-gray-600">Qty</th>
              <th className="text-left p-3 font-medium text-gray-600">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">No movements in selected period</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-3">{fmtDate(r.movement_date)}</td>
                <td className="p-3"><div className="font-medium">{r.product_name}</div><div className="text-xs text-gray-400 font-mono">{r.sku}</div></td>
                <td className="p-3">{r.warehouse_name}</td>
                <td className="p-3 text-center"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${MOVEMENT_COLORS[r.movement_type] || 'bg-gray-100 text-gray-700'}`}>{r.movement_type}</span></td>
                <td className="p-3 text-right"><span className={`font-semibold ${r.movement_type === 'OUT' ? 'text-red-600' : 'text-green-600'}`}>{r.movement_type === 'OUT' ? '-' : '+'}{fmtNumber(r.quantity, 0)}</span></td>
                <td className="p-3 text-sm text-gray-600">{r.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
