import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Printer } from 'lucide-react';
import { useGetReceiptsQuery, useGetReceiptQuery } from '../../api/salesApi';
import { useGetCompanyQuery } from '../../api/reportsApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import ReceiptPrint from '../../components/print/ReceiptPrint';
import { printComponent } from '../../utils/print';
import { fmtCurrency, fmtDate } from '../../utils/format';

const METHOD_BADGE = {
  CASH: 'bg-green-100 text-green-800',
  CHEQUE: 'bg-amber-100 text-amber-800',
  BANK_TRANSFER: 'bg-blue-100 text-blue-800',
  CARD: 'bg-purple-100 text-purple-800',
};

function PrintReceiptButton({ id, company }) {
  const [pending, setPending] = useState(false);
  const { data: receipt } = useGetReceiptQuery(id, { skip: !pending });

  const handleClick = async () => {
    setPending(true);
  };

  if (pending && receipt) {
    printComponent(<ReceiptPrint receipt={receipt} company={company} />);
    setPending(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
      title="Print receipt"
    >
      <Printer size={14} />
    </button>
  );
}

export default function ReceiptList() {
  const canCreate = usePermission('sales.create');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useGetReceiptsQuery({ search, page, limit: 20 });
  const { data: company } = useGetCompanyQuery();

  const columns = [
    { key: 'receipt_number', header: 'Receipt #', cell: r => <span className="font-mono font-medium text-primary-700">{r.receipt_number}</span> },
    { key: 'customer', header: 'Customer', cell: r => r.Customer?.name },
    { key: 'receipt_date', header: 'Date', cell: r => fmtDate(r.receipt_date) },
    { key: 'payment_method', header: 'Method', cell: r => <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${METHOD_BADGE[r.payment_method] || ''}`}>{r.payment_method?.replace('_', ' ')}</span> },
    { key: 'amount', header: 'Amount', cell: r => <span className="font-semibold text-green-700">{fmtCurrency(r.amount)}</span>, className: 'text-right' },
    { key: 'reference', header: 'Reference', cell: r => r.reference || '-' },
    {
      key: 'print', header: '', className: 'text-right',
      cell: r => <PrintReceiptButton id={r.id} company={company} />,
    },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Receipts</h2>
          <div className="mt-1">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search receipts..." className="input-sm" />
          </div>
        </div>
        {canCreate && (
          <Link to="/receipts/new" className="btn-primary flex items-center gap-2"><Plus size={16} /> New Receipt</Link>
        )}
      </div>
      <Table columns={columns} data={data?.data} loading={isLoading} />
      <Pagination page={page} total={data?.total || 0} limit={20} onChange={setPage} />
    </div>
  );
}
