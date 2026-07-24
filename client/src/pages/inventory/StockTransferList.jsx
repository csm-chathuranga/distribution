import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Truck, PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetStockTransfersQuery, useDispatchStockTransferMutation, useReceiveStockTransferMutation } from '../../api/inventoryApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtDate } from '../../utils/format';

export default function StockTransferList() {
  const canTransfer = usePermission('inventory.transfer');
  const canView = usePermission('inventory.view');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dispatchItem, setDispatchItem] = useState(null);
  const [receiveItem, setReceiveItem] = useState(null);

  const { data, isLoading } = useGetStockTransfersQuery({ search, page, limit: 20 });
  const [dispatch, { isLoading: dispatching }] = useDispatchStockTransferMutation();
  const [receive, { isLoading: receiving }] = useReceiveStockTransferMutation();

  const handleDispatch = async () => {
    try {
      await dispatch(dispatchItem.id).unwrap();
      toast.success('Transfer dispatched — stock deducted from source');
      setDispatchItem(null);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const handleReceive = async () => {
    try {
      await receive(receiveItem.id).unwrap();
      toast.success('Transfer received — stock added to destination');
      setReceiveItem(null);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const columns = [
    { key: 'transfer_number', header: 'Reference', cell: r => <span className="font-mono font-medium text-primary-700">{r.transfer_number}</span> },
    { key: 'from', header: 'From', cell: r => r.FromWarehouse?.name },
    { key: 'to', header: 'To', cell: r => r.ToWarehouse?.name },
    { key: 'transfer_date', header: 'Date', cell: r => fmtDate(r.transfer_date) },
    { key: 'status', header: 'Status', cell: r => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', className: 'text-right',
      cell: r => canTransfer && (
        <div className="flex justify-end gap-2">
          {r.status === 'DRAFT' && (
            <button onClick={() => setDispatchItem(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Dispatch">
              <Truck size={14} />
            </button>
          )}
          {r.status === 'DISPATCHED' && (
            <button onClick={() => setReceiveItem(r)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Mark Received">
              <PackageCheck size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="card">
      <PageHeader title="Stock Transfers" search={search} onSearch={setSearch}>
        {canView && <Link to="/stock-transfers/new" className="btn btn-primary btn-sm gap-1.5"><Plus size={15} /> New Transfer</Link>}
      </PageHeader>
      <Table columns={columns} data={data?.data} loading={isLoading} emptyText="No stock transfers found" />
      <Pagination page={page} total={data?.total || 0} limit={20} onChange={setPage} />
      <ConfirmDialog
        open={!!dispatchItem}
        title="Dispatch Transfer"
        message={`Dispatch ${dispatchItem?.transfer_number}? Stock will be deducted from ${dispatchItem?.FromWarehouse?.name}.`}
        confirmLabel="Dispatch"
        onConfirm={handleDispatch}
        onCancel={() => setDispatchItem(null)}
        loading={dispatching}
      />
      <ConfirmDialog
        open={!!receiveItem}
        title="Receive Transfer"
        message={`Mark ${receiveItem?.transfer_number} as received? Stock will be added to ${receiveItem?.ToWarehouse?.name}.`}
        confirmLabel="Mark Received"
        onConfirm={handleReceive}
        onCancel={() => setReceiveItem(null)}
        loading={receiving}
      />
    </div>
  );
}
