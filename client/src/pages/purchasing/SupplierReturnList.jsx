import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw } from 'lucide-react';
import { useGetSupplierReturnsQuery, usePostSupplierReturnMutation } from '../../api/purchasingApi';
import Table from '../../components/ui/Table';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtCurrency, fmtDate } from '../../utils/format';
import { usePermission } from '../../hooks/usePermission';

export default function SupplierReturnList() {
  const navigate = useNavigate();
  const canCreate = usePermission('purchase.create');
  const canApprove = usePermission('purchase.approve');
  const [postTarget, setPostTarget] = useState(null);

  const { data, isLoading } = useGetSupplierReturnsQuery({});
  const [postReturn, { isLoading: posting }] = usePostSupplierReturnMutation();

  const rows = data?.data || [];

  const handlePost = async () => {
    await postReturn(postTarget.id).unwrap();
    setPostTarget(null);
  };

  const columns = [
    { header: 'Return #', render: r => <span className="font-mono text-xs font-semibold text-gray-800">{r.return_number}</span> },
    { header: 'Date', render: r => fmtDate(r.return_date) },
    { header: 'Supplier', render: r => r.Supplier?.name || '—' },
    { header: 'GRN Ref', render: r => r.GoodsReceived?.grn_number || '—' },
    { header: 'Total Amount', render: r => <span className="font-semibold text-red-600">{fmtCurrency(r.total_amount)}</span> },
    { header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      header: 'Actions',
      render: r => r.status === 'DRAFT' && canApprove ? (
        <button onClick={() => setPostTarget(r)} className="btn btn-sm btn-primary">Post</button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Supplier Returns</h1>
          <p className="text-sm text-gray-500 mt-0.5">Return goods to suppliers and adjust payables</p>
        </div>
        {canCreate && (
          <button onClick={() => navigate('/supplier-returns/new')} className="btn btn-primary">
            <Plus size={16} /> New Supplier Return
          </button>
        )}
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={rows}
          loading={isLoading}
          emptyComponent={<EmptyState icon={RotateCcw} title="No supplier returns" description="Create a return to credit a supplier for goods sent back" action={canCreate ? { label: 'New Supplier Return', onClick: () => navigate('/supplier-returns/new') } : null} />}
        />
      </div>

      <ConfirmDialog
        open={!!postTarget}
        onCancel={() => setPostTarget(null)}
        onConfirm={handlePost}
        loading={posting}
        variant="warning"
        title="Post Supplier Return"
        confirmLabel="Post"
        loadingLabel="Posting..."
        message={`Post ${postTarget?.return_number}? This will debit the supplier's payable account and reduce stock. This action cannot be undone.`}
      />
    </div>
  );
}
