import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, PackageCheck } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  useGetStockTransferQuery,
  useDispatchStockTransferMutation,
  useReceiveStockTransferMutation,
} from '../../api/inventoryApi';
import { usePermission } from '../../hooks/usePermission';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtDate } from '../../utils/format';

export default function StockTransferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canTransfer = usePermission('inventory.transfer');
  const [confirming, setConfirming] = useState(null); // 'dispatch' | 'receive'

  const { data: transfer, isLoading } = useGetStockTransferQuery(id);
  const [dispatch, { isLoading: dispatching }] = useDispatchStockTransferMutation();
  const [receive,  { isLoading: receiving  }] = useReceiveStockTransferMutation();

  const handleDispatch = async () => {
    try {
      await dispatch(id).unwrap();
      toast.success('Transfer dispatched — stock deducted from source');
      setConfirming(null);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const handleReceive = async () => {
    try {
      await receive(id).unwrap();
      toast.success('Transfer received — stock added to destination');
      setConfirming(null);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  if (isLoading) return <div className="card p-6 text-gray-500">Loading…</div>;
  if (!transfer)  return <div className="card p-6 text-gray-500">Transfer not found.</div>;

  const lines = transfer.Lines || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded hover:bg-gray-100">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="font-mono font-semibold text-lg text-primary-700">{transfer.transfer_number}</div>
            <div className="text-sm text-gray-500">{fmtDate(transfer.transfer_date)}</div>
          </div>
          <StatusBadge status={transfer.status} />
        </div>

        {canTransfer && (
          <div className="flex gap-2">
            {transfer.status === 'DRAFT' && (
              <button onClick={() => setConfirming('dispatch')} className="btn btn-sm btn-secondary gap-1.5">
                <Truck size={14} /> Dispatch
              </button>
            )}
            {transfer.status === 'DISPATCHED' && (
              <button onClick={() => setConfirming('receive')} className="btn btn-sm btn-primary gap-1.5">
                <PackageCheck size={14} /> Mark Received
              </button>
            )}
          </div>
        )}
      </div>

      {/* From / To */}
      <div className="card p-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500 mb-1">From</div>
          <div className="font-medium">{transfer.FromWarehouse?.name || '—'}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">To</div>
          <div className="font-medium">{transfer.ToWarehouse?.name || '—'}</div>
        </div>
        {transfer.notes && (
          <div className="col-span-2">
            <div className="text-gray-500 mb-1">Notes</div>
            <div>{transfer.notes}</div>
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="card">
        <div className="px-4 pt-4 pb-2 font-medium text-gray-700">Items</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase">
              <th className="px-4 py-2 text-left">Product</th>
              <th className="px-4 py-2 text-left">SKU</th>
              <th className="px-4 py-2 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={line.id || i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{line.Product?.name || `Product #${line.product_id}`}</td>
                <td className="px-4 py-2 text-gray-500 font-mono">{line.Product?.sku || '—'}</td>
                <td className="px-4 py-2 text-right font-semibold">{line.requested_quantity}</td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No items</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirming === 'dispatch'}
        title="Dispatch Transfer"
        message={`Dispatch ${transfer.transfer_number}? Stock will be deducted from ${transfer.FromWarehouse?.name}.`}
        confirmLabel="Dispatch"
        onConfirm={handleDispatch}
        onCancel={() => setConfirming(null)}
        loading={dispatching}
      />
      <ConfirmDialog
        open={confirming === 'receive'}
        title="Receive Transfer"
        message={`Mark ${transfer.transfer_number} as received? Stock will be added to ${transfer.ToWarehouse?.name}.`}
        confirmLabel="Mark Received"
        onConfirm={handleReceive}
        onCancel={() => setConfirming(null)}
        loading={receiving}
      />
    </div>
  );
}
