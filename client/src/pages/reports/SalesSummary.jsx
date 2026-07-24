import { useState } from 'react';
import { useGetSalesSummaryQuery } from '../../api/reportsApi';
import { fmtCurrency, fmtDate, today } from '../../utils/format';

const firstDayOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

export default function SalesSummary() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());
  const { data, isLoading } = useGetSalesSummaryQuery({ from, to });

  const rows = data?.rows || [];
  const totals = data?.totals || {};

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Sales Summary</h2>
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

        {!isLoading && data && (
          <div className="grid grid-cols-4 gap-4 p-4 border-b bg-gray-50">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totals.invoice_count || 0}</div>
              <div className="text-sm text-gray-500">Invoices</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{fmtCurrency(totals.total_sales || 0)}</div>
              <div className="text-sm text-gray-500">Gross Sales</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{fmtCurrency(totals.total_vat || 0)}</div>
              <div className="text-sm text-gray-500">VAT Collected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{fmtCurrency(totals.total_collected || 0)}</div>
              <div className="text-sm text-gray-500">Collected</div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium text-gray-600">Date</th>
                <th className="text-left p-3 font-medium text-gray-600">Customer</th>
                <th className="text-left p-3 font-medium text-gray-600">Invoice #</th>
                <th className="text-right p-3 font-medium text-gray-600">Subtotal</th>
                <th className="text-right p-3 font-medium text-gray-600">VAT</th>
                <th className="text-right p-3 font-medium text-gray-600">Total</th>
                <th className="text-right p-3 font-medium text-gray-600">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">No data for selected period</td></tr>
              ) : rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-3">{fmtDate(r.invoice_date)}</td>
                  <td className="p-3 font-medium">{r.customer_name}</td>
                  <td className="p-3 font-mono text-primary-700">{r.invoice_number}</td>
                  <td className="p-3 text-right">{fmtCurrency(r.subtotal)}</td>
                  <td className="p-3 text-right">{fmtCurrency(r.vat_amount)}</td>
                  <td className="p-3 text-right font-medium">{fmtCurrency(r.total_amount)}</td>
                  <td className="p-3 text-right"><span className={parseFloat(r.balance_due) > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>{fmtCurrency(r.balance_due)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
