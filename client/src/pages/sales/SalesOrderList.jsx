import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ClipboardList, ChevronRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetSalesOrdersQuery, useConfirmSalesOrderMutation } from '../../api/salesApi';
import { usePermission } from '../../hooks/usePermission';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtCurrency, fmtDate } from '../../utils/format';

export default function SalesOrderList() {
  const navigate    = useNavigate();
  const canCreate   = usePermission('sales.create');
  const canApprove  = usePermission('sales.approve');
  const [page,             setPage]             = useState(1);
  const [search,           setSearch]           = useState('');
  const [confirmingOrder,  setConfirmingOrder]  = useState(null);

  const { data, isLoading } = useGetSalesOrdersQuery({ search, page, limit: 20 });
  const [confirmOrder, { isLoading: confirming }] = useConfirmSalesOrderMutation();
  const orders = data?.data || [];
  const total  = data?.total || 0;

  const handleConfirm = async () => {
    try {
      await confirmOrder(confirmingOrder.id).unwrap();
      toast.success('Sales order confirmed');
      setConfirmingOrder(null);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Sales Orders</h1>
        {canCreate && (
          <button onClick={() => navigate('/sales-orders/new')} className="btn btn-primary flex items-center gap-1.5">
            <Plus size={16} /> New
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search orders…"
          className="input pl-9 w-full text-sm py-2"
        />
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="card animate-pulse p-4 space-y-2">
              <div className="flex justify-between">
                <div className="skeleton h-5 w-36" />
                <div className="skeleton h-5 w-20" />
              </div>
              <div className="skeleton h-4 w-48" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-10 text-center">
          <ClipboardList size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No sales orders yet</p>
          {canCreate && (
            <button onClick={() => navigate('/sales-orders/new')} className="mt-4 btn-primary text-sm">
              Create first order
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(so => (
            <div key={so.id} className="card overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 leading-snug">
                      {so.Customer?.name || '—'}
                    </p>
                    <p className="text-xs font-mono text-primary-600 mt-0.5">{so.order_number}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={so.status} />
                    <ChevronRight size={15} className="text-gray-400" />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-gray-500">
                    {fmtDate(so.order_date)}
                    {so.Warehouse?.name && <span className="ml-2 text-gray-400">· {so.Warehouse.name}</span>}
                  </div>
                  <span className="font-bold text-gray-900 font-mono">{fmtCurrency(so.total_amount)}</span>
                </div>
              </div>

              {so.status === 'DRAFT' && canApprove && (
                <div className="px-4 pb-4">
                  <button
                    onClick={() => setConfirmingOrder(so)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-semibold transition-colors"
                  >
                    <CheckCircle size={15} /> Confirm Order
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{(page-1)*20+1}–{Math.min(page*20,total)} of {total}</span>
          <div className="flex gap-2">
            <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="btn-secondary px-3 py-1.5 disabled:opacity-40">Prev</button>
            <button disabled={page*20>=total} onClick={() => setPage(p=>p+1)} className="btn-secondary px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmingOrder}
        title="Confirm Sales Order"
        message={`Confirm order ${confirmingOrder?.order_number}?`}
        confirmLabel="Confirm Order"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmingOrder(null)}
        loading={confirming}
      />
    </div>
  );
}
