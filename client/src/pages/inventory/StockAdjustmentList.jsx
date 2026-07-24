import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetStockAdjustmentsQuery, useApproveStockAdjustmentMutation, useCancelStockAdjustmentMutation } from '../../api/inventoryApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtDate } from '../../utils/format';

const REASON_LABELS = { DAMAGE: 'Damage', EXPIRY: 'Expiry', COUNT: 'Stock Count', OTHER: 'Other' };

export default function StockAdjustmentList() {
  const canAdjust = usePermission('inventory.adjust');
  const canCreate = usePermission('inventory.create');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [approvingItem, setApprovingItem] = useState(null);
  const [cancellingItem, setCancellingItem] = useState(null);

  const { data, isLoading } = useGetStockAdjustmentsQuery({ search, page, limit: 20 });
  const [approve, { isLoading: approving }] = useApproveStockAdjustmentMutation();
  const [cancel, { isLoading: cancelling }] = useCancelStockAdjustmentMutation();

  const handleApprove = async () => {
    try {
      await approve(approvingItem.id).unwrap();
      toast.success('Adjustment approved — stock updated');
      setApprovingItem(null);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const handleCancel = async () => {
    try {
      await cancel(cancellingItem.id).unwrap();
      toast.success('Adjustment cancelled');
      setCancellingItem(null);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const columns = [
    { key: 'adjustment_number', header: 'Reference', cell: r => <span className="font-mono font-medium text-primary-700">{r.adjustment_number}</span> },
    { key: 'warehouse', header: 'Warehouse', cell: r => r.Warehouse?.name },
    { key: 'adjustment_date', header: 'Date', cell: r => fmtDate(r.adjustment_date) },
    { key: 'reason', header: 'Reason', cell: r => REASON_LABELS[r.reason] || r.reason },
    { key: 'status', header: 'Status', cell: r => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', className: 'text-right',
      cell: r => r.status === 'DRAFT' && canAdjust && (
        <div className="flex justify-end gap-2">
          <button onClick={() => setApprovingItem(r)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Approve">
            <CheckCircle size={14} />
          </button>
          <button onClick={() => setCancellingItem(r)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Cancel">
            <XCircle size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="card">
      <PageHeader title="Stock Adjustments" onNew={canCreate ? null : null} search={search} onSearch={setSearch}>
        {canCreate && <Link to="/stock-adjustments/new" className="btn btn-primary btn-sm gap-1.5"><Plus size={15} /> New Adjustment</Link>}
      </PageHeader>
      <Table columns={columns} data={data?.data} loading={isLoading} emptyText="No stock adjustments found" />
      <Pagination page={page} total={data?.total || 0} limit={20} onChange={setPage} />
      <ConfirmDialog
        open={!!approvingItem}
        title="Approve Stock Adjustment"
        message={`Approve adjustment ${approvingItem?.adjustment_number}? This will update stock quantities based on the variance.`}
        confirmLabel="Approve"
        onConfirm={handleApprove}
        onCancel={() => setApprovingItem(null)}
        loading={approving}
      />
      <ConfirmDialog
        open={!!cancellingItem}
        title="Cancel Adjustment"
        message={`Cancel adjustment ${cancellingItem?.adjustment_number}?`}
        confirmLabel="Cancel Adjustment"
        onConfirm={handleCancel}
        onCancel={() => setCancellingItem(null)}
        loading={cancelling}
      />
    </div>
  );
}
