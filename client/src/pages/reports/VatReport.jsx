import { useState } from 'react';
import { useGetVatSummaryQuery } from '../../api/reportsApi';
import Table from '../../components/ui/Table';
import PageHeader from '../../components/ui/PageHeader';
import { fmtCurrency } from '../../utils/format';

export default function VatReport() {
  const thisYear = new Date().getFullYear();
  const [from, setFrom] = useState(`${thisYear}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const { data, isLoading } = useGetVatSummaryQuery({ from, to });

  const totals = (data || []).reduce((acc, r) => ({
    subtotal: acc.subtotal + r.subtotal,
    output_vat: acc.output_vat + r.output_vat,
    input_vat: acc.input_vat + r.input_vat,
    net_vat: acc.net_vat + r.net_vat,
  }), { subtotal: 0, output_vat: 0, input_vat: 0, net_vat: 0 });

  const columns = [
    { key: 'month', header: 'Month', cell: r => <span className="font-medium">{r.month}</span> },
    { key: 'subtotal', header: 'Taxable Sales', className: 'text-right', cell: r => fmtCurrency(r.subtotal) },
    { key: 'output_vat', header: 'Output VAT (Sales)', className: 'text-right', cell: r => <span className="text-red-600">{fmtCurrency(r.output_vat)}</span> },
    { key: 'input_vat', header: 'Input VAT (Purchases)', className: 'text-right', cell: r => <span className="text-green-600">{fmtCurrency(r.input_vat)}</span> },
    {
      key: 'net_vat', header: 'Net VAT Payable', className: 'text-right font-semibold',
      cell: r => <span className={r.net_vat >= 0 ? 'text-red-700' : 'text-green-700'}>{fmtCurrency(r.net_vat)}</span>,
    },
  ];

  return (
    <div className="card">
      <PageHeader title="VAT Summary Report">
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input input-sm" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input input-sm" />
        </div>
      </PageHeader>
      <Table columns={columns} data={data} loading={isLoading} emptyText="No VAT data for selected period" />
      {data?.length > 0 && (
        <div className="px-6 py-3 border-t bg-gray-50 grid grid-cols-4 gap-4 text-sm font-semibold">
          <span className="text-gray-600">Totals</span>
          <span className="text-right">{fmtCurrency(totals.subtotal)}</span>
          <span className="text-right text-red-600">{fmtCurrency(totals.output_vat)}</span>
          <span className="text-right text-green-600">{fmtCurrency(totals.input_vat)}</span>
        </div>
      )}
    </div>
  );
}
