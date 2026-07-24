import { useState } from 'react';
import { useGetProfitLossQuery } from '../../api/reportsApi';
import { fmtCurrency } from '../../utils/format';

const firstDayOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const today = () => new Date().toISOString().split('T')[0];

export default function ProfitLoss() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());
  const { data, isLoading } = useGetProfitLossQuery({ from, to });

  const revenue = data?.revenue || [];
  const cogs = data?.cogs || [];
  const expenses = data?.expenses || [];
  const totals = data?.totals || {};

  const Section = ({ title, rows, totalLabel, total, colorClass }) => (
    <div className="mb-4">
      <div className="flex items-center justify-between bg-gray-100 px-4 py-2 rounded-t">
        <span className="font-semibold text-gray-700">{title}</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between px-6 py-1.5 border-b border-gray-100 text-sm">
          <span className="text-gray-700">{r.name}</span>
          <span>{fmtCurrency(r.amount)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b-2 border-gray-200">
        <span className="font-semibold">{totalLabel}</span>
        <span className={`font-bold ${colorClass}`}>{fmtCurrency(total)}</span>
      </div>
    </div>
  );

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Profit & Loss Statement</h2>
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
      {isLoading ? (
        <div className="p-12 text-center text-gray-400">Loading...</div>
      ) : (
        <div className="p-6">
          <Section title="Revenue" rows={revenue} totalLabel="Total Revenue" total={totals.total_revenue || 0} colorClass="text-green-700" />
          <Section title="Cost of Goods Sold" rows={cogs} totalLabel="Total COGS" total={totals.total_cogs || 0} colorClass="text-red-600" />

          <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded mb-4">
            <span className="font-bold text-blue-800">Gross Profit</span>
            <span className={`font-bold text-xl ${(totals.gross_profit || 0) >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmtCurrency(totals.gross_profit || 0)}</span>
          </div>

          <Section title="Operating Expenses" rows={expenses} totalLabel="Total Expenses" total={totals.total_expenses || 0} colorClass="text-red-600" />

          <div className={`flex items-center justify-between px-4 py-4 rounded border-2 ${(totals.net_profit || 0) >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <span className="font-bold text-lg">{(totals.net_profit || 0) >= 0 ? 'Net Profit' : 'Net Loss'}</span>
            <span className={`font-bold text-2xl ${(totals.net_profit || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmtCurrency(Math.abs(totals.net_profit || 0))}</span>
          </div>
        </div>
      )}
    </div>
  );
}
