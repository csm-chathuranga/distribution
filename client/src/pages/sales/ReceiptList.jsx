import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useGetReceiptsQuery } from '../../api/salesApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import { fmtCurrency, fmtDate } from '../../utils/format';

const METHOD_BADGE = {
  CASH: 'bg-green-100 text-green-800',
  CHEQUE: 'bg-amber-100 text-amber-800',
  BANK_TRANSFER: 'bg-blue-100 text-blue-800',
  CARD: 'bg-purple-100 text-purple-800',
};

export default function ReceiptList() {
  const canCreate = usePermission('sales.create');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useGetReceiptsQuery({ search, page, limit: 20 });

  const columns = [
    { key: 'receipt_number', header: 'Receipt #', cell: r => <span className="font-mono font-medium text-primary-700">{r.receipt_number}</span> },
    { key: 'customer', header: 'Customer', cell: r => r.Customer?.name },
    { key: 'receipt_date', header: 'Date', cell: r => fmtDate(r.receipt_date) },
    { key: 'payment_method', header: 'Method', cell: r => <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${METHOD_BADGE[r.payment_method] || ''}`}>{r.payment_method}</span> },
    { key: 'amount', header: 'Amount', cell: r => <span className="font-semibold text-green-700">{fmtCurrency(r.amount)}</span>, className: 'text-right' },
    { key: 'reference', header: 'Reference', cell: r => r.reference || '-' },
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
