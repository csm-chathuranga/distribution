import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useGetSalesRepKpiQuery } from '../../api/reportsApi';
import Table from '../../components/ui/Table';
import PageHeader from '../../components/ui/PageHeader';
import { fmtCurrency } from '../../utils/format';

export default function SalesRepKPI() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { data, isLoading } = useGetSalesRepKpiQuery({ year, month });

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const chartData = (data || [])
    .filter(r => parseFloat(r.total_sales) > 0)
    .map(r => ({ name: r.rep_name.split(' ')[0], sales: parseFloat(r.total_sales), collected: parseFloat(r.collected) }));

  const columns = [
    { key: 'rep_name', header: 'Sales Rep', cell: r => <span className="font-medium">{r.rep_name}</span> },
    { key: 'invoice_count', header: 'Invoices', className: 'text-right', cell: r => r.invoice_count },
    { key: 'customers_served', header: 'Customers', className: 'text-right', cell: r => r.customers_served },
    { key: 'total_sales', header: 'Total Sales', className: 'text-right font-medium', cell: r => fmtCurrency(r.total_sales) },
    { key: 'collected', header: 'Collected', className: 'text-right', cell: r => <span className="text-green-700">{fmtCurrency(r.collected)}</span> },
    {
      key: 'outstanding', header: 'Outstanding', className: 'text-right',
      cell: r => {
        const out = parseFloat(r.total_sales) - parseFloat(r.collected);
        return <span className={out > 0 ? 'text-red-600' : 'text-gray-400'}>{fmtCurrency(out)}</span>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="card">
        <PageHeader title="Sales Rep KPI">
          <div className="flex items-center gap-2">
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="input input-sm">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="input input-sm">
              {[now.getFullYear(), now.getFullYear() - 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </PageHeader>

        {chartData.length > 0 && (
          <div className="px-6 pt-4 pb-2">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => fmtCurrency(v)} />
                <Bar dataKey="sales" name="Sales" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Collected" fill="#86efac" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <Table columns={columns} data={data} loading={isLoading} emptyText="No data for selected period" />
      </div>
    </div>
  );
}
