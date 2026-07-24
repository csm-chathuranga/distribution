import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetPOsQuery, useApprovePOMutation } from '../../api/purchasingApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtCurrency, fmtDate } from '../../utils/format';

export default function PurchaseOrderList() {
  const canCreate = usePermission('purchase.create');
  const canApprove = usePermission('purchase.approve');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [approvingPO, setApprovingPO] = useState(null);
  const { data, isLoading } = useGetPOsQuery({ search, page, limit: 20 });
  const [approvePO, { isLoading: approving }] = useApprovePOMutation();

  const handleApprove = async () => {
    try {
      await approvePO(approvingPO.id).unwrap();
      toast.success('Purchase order approved');
      setApprovingPO(null);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const columns = [
    { key: 'po_number', header: 'PO Number', cell: r => <span className="font-mono font-medium text-primary-700">{r.po_number}</span> },
    { key: 'supplier', header: 'Supplier', cell: r => r.Supplier?.name },
    { key: 'order_date', header: 'Date', cell: r => fmtDate(r.order_date) },
    { key: 'expected_date', header: 'Expected', cell: r => r.expected_date ? fmtDate(r.expected_date) : '-' },
    { key: 'total_amount', header: 'Total', cell: r => fmtCurrency(r.total_amount), className: 'text-right font-medium' },
    { key: 'status', header: 'Status', cell: r => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', className: 'text-right',
      cell: r => (
        <div className="flex items-center justify-end gap-1">
          <Link to={`/purchase-orders/${r.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={14} /></Link>
          {canApprove && r.status === 'DRAFT' && (
            <button onClick={() => setApprovingPO(r)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"><CheckCircle size={14} /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="card">
      <PageHeader title="Purchase Orders" onNew={canCreate ? undefined : undefined} canCreate={false} search={search} onSearch={setSearch}>
        {canCreate && (
          <Link to="/purchase-orders/new" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New PO
          </Link>
        )}
      </PageHeader>
      <Table columns={columns} data={data?.data} loading={isLoading} />
      <Pagination page={page} total={data?.total || 0} limit={20} onChange={setPage} />
      <ConfirmDialog
        open={!!approvingPO}
        title="Approve Purchase Order"
        message={`Approve PO ${approvingPO?.po_number}? This will allow GRN creation against it.`}
        confirmLabel="Approve"
        onConfirm={handleApprove}
        onCancel={() => setApprovingPO(null)}
        loading={approving}
      />
    </div>
  );
}
