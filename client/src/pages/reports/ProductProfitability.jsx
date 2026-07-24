import { useState } from 'react';
import { useGetProductProfitabilityQuery } from '../../api/reportsApi';
import Table from '../../components/ui/Table';
import PageHeader from '../../components/ui/PageHeader';
import { fmtCurrency } from '../../utils/format';

function GpBadge({ pct }) {
  const p = parseFloat(pct || 0);
  if (p >= 30) return <span className="text-green-700 font-semibold">{p.toFixed(1)}%</span>;
  if (p >= 15) return <span className="text-amber-600 font-semibold">{p.toFixed(1)}%</span>;
  return <span className="text-red-600 font-semibold">{p.toFixed(1)}%</span>;
}

export default function ProductProfitability() {
  const thisYear = new Date().getFullYear();
  const [from, setFrom] = useState(`${thisYear}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const { data, isLoading } = useGetProductProfitabilityQuery({ from, to });

  const totals = (data || []).reduce((acc, r) => ({
    qty: acc.qty + parseFloat(r.qty_sold || 0),
    revenue: acc.revenue + parseFloat(r.revenue || 0),
    cost: acc.cost + parseFloat(r.cost || 0),
    gp: acc.gp + parseFloat(r.gross_profit || 0),
  }), { qty: 0, revenue: 0, cost: 0, gp: 0 });

  const columns = [
    { key: 'sku', header: 'SKU', cell: r => <span className="font-mono text-xs text-gray-500">{r.sku}</span> },
    { key: 'name', header: 'Product', cell: r => <span className="font-medium">{r.name}</span> },
    { key: 'qty_sold', header: 'Qty Sold', className: 'text-right', cell: r => parseFloat(r.qty_sold).toFixed(2) },
    { key: 'revenue', header: 'Revenue', className: 'text-right', cell: r => fmtCurrency(r.revenue) },
    { key: 'cost', header: 'COGS', className: 'text-right', cell: r => fmtCurrency(r.cost) },
    { key: 'gross_profit', header: 'Gross Profit', className: 'text-right font-medium', cell: r => fmtCurrency(r.gross_profit) },
    { key: 'gp_pct', header: 'GP %', className: 'text-right', cell: r => <GpBadge pct={r.gp_pct} /> },
  ];

  return (
    <div className="card">
      <PageHeader title="Product Profitability">
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input input-sm" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input input-sm" />
        </div>
      </PageHeader>
      <Table columns={columns} data={data} loading={isLoading} emptyText="No sales data for selected period" />
      {data?.length > 0 && (
        <div className="px-6 py-3 border-t bg-gray-50 flex justify-end gap-8 text-sm font-semibold">
          <span>Revenue: {fmtCurrency(totals.revenue)}</span>
          <span>COGS: {fmtCurrency(totals.cost)}</span>
          <span>GP: {fmtCurrency(totals.gp)}</span>
          <span>GP %: <GpBadge pct={totals.revenue ? (totals.gp / totals.revenue * 100) : 0} /></span>
        </div>
      )}
    </div>
  );
}
