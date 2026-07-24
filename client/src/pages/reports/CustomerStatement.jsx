import { useState } from 'react';
import { Printer } from 'lucide-react';
import { useGetCustomerStatementQuery } from '../../api/reportsApi';
import { useGetCustomersQuery } from '../../api/customersApi';
import Table from '../../components/ui/Table';
import PageHeader from '../../components/ui/PageHeader';
import { fmtCurrency, fmtDate } from '../../utils/format';

export default function CustomerStatement() {
  const [customerId, setCustomerId] = useState('');
  const thisYear = new Date().getFullYear();
  const [from, setFrom] = useState(`${thisYear}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const { data: customers } = useGetCustomersQuery({ limit: 500 });
  const { data, isLoading } = useGetCustomerStatementQuery(
    { customerId, from, to },
    { skip: !customerId }
  );

  const columns = [
    { key: 'date', header: 'Date', cell: r => fmtDate(r.date) },
    { key: 'reference', header: 'Reference', cell: r => <span className="font-mono text-sm text-primary-700">{r.reference}</span> },
    { key: 'invoice_type', header: 'Type', cell: r => <span className="text-xs text-gray-500 uppercase">{r.invoice_type?.replace('_', ' ')}</span> },
    { key: 'debit', header: 'Debit', className: 'text-right', cell: r => parseFloat(r.debit) > 0 ? <span className="text-red-600">{fmtCurrency(r.debit)}</span> : '' },
    { key: 'credit', header: 'Credit', className: 'text-right', cell: r => parseFloat(r.credit) > 0 ? <span className="text-green-600">{fmtCurrency(r.credit)}</span> : '' },
    {
      key: 'running_balance', header: 'Balance', className: 'text-right font-semibold',
      cell: r => <span className={parseFloat(r.running_balance) > 0 ? 'text-red-700' : 'text-green-700'}>{fmtCurrency(Math.abs(r.running_balance))}</span>,
    },
  ];

  return (
    <div className="card">
      <PageHeader title="Customer Statement of Account">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="input input-sm w-48">
            <option value="">Select customer…</option>
            {customers?.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input input-sm" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input input-sm" />
          <button onClick={() => window.print()} className="btn btn-ghost btn-sm gap-1.5">
            <Printer size={14} /> Print
          </button>
        </div>
      </PageHeader>
      {!customerId && (
        <div className="p-12 text-center text-gray-400">Select a customer to view statement</div>
      )}
      {customerId && <Table columns={columns} data={data} loading={isLoading} emptyText="No transactions found" />}
      {data?.length > 0 && (
        <div className="px-6 py-3 border-t text-sm text-right">
          <span className="text-gray-500 mr-4">Closing Balance:</span>
          <span className={`font-bold text-base ${parseFloat(data[data.length - 1]?.running_balance) > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {fmtCurrency(Math.abs(data[data.length - 1]?.running_balance || 0))}
          </span>
        </div>
      )}
    </div>
  );
}
