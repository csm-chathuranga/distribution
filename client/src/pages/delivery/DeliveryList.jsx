import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Plus, Truck, CheckCircle, RotateCcw, ChevronRight } from 'lucide-react';
import {
  useGetDeliveriesQuery, useDispatchDeliveryMutation,
  useDeliverDeliveryMutation, useReturnDeliveryMutation,
} from '../../api/salesApi';
import { selectCurrentUser } from '../../store/authSlice';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { fmtDate } from '../../utils/format';
import { usePermission } from '../../hooks/usePermission';

const STATUSES = ['', 'PENDING', 'DISPATCHED', 'DELIVERED', 'RETURNED'];

export default function DeliveryList() {
  const navigate    = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const canCreate   = usePermission('sales.create');
  const isDriver    = currentUser?.Role?.name === 'delivery';

  // Drivers default to their own dispatched deliveries
  const [status,   setStatus]   = useState(isDriver ? 'DISPATCHED' : '');
  const [mineOnly, setMineOnly] = useState(isDriver);
  const [actionDn, setActionDn] = useState(null); // { dn, action }
  const [notes,    setNotes]    = useState('');

  const { data, isLoading } = useGetDeliveriesQuery({
    status:    status   || undefined,
    driver_id: mineOnly ? currentUser?.id : undefined,
  });
  const [dispatchMut, { isLoading: dispatching }] = useDispatchDeliveryMutation();
  const [deliverMut,  { isLoading: delivering  }] = useDeliverDeliveryMutation();
  const [returnMut,   { isLoading: returning   }] = useReturnDeliveryMutation();

  const rows = data?.data || [];

  const handleAction = async () => {
    const { dn, action } = actionDn;
    if (action === 'dispatch') await dispatchMut({ id: dn.id });
    else if (action === 'deliver') await deliverMut({ id: dn.id, notes });
    else await returnMut({ id: dn.id, notes });
    setActionDn(null);
    setNotes('');
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Deliveries</h1>
          {!isDriver && (
            <p className="text-sm text-gray-500 mt-0.5">Track and manage delivery notes</p>
          )}
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/deliveries/new')}
            className="btn btn-primary flex items-center gap-1.5"
          >
            <Plus size={16} /> New
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="input-sm flex-1 min-w-[130px]"
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>{s || 'All Statuses'}</option>
          ))}
        </select>
        {!isDriver && (
          <button
            onClick={() => setMineOnly(v => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              mineOnly
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {mineOnly ? 'My deliveries' : 'All drivers'}
          </button>
        )}
      </div>

      {/* Card list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse p-4 space-y-2">
              <div className="flex justify-between">
                <div className="skeleton h-5 w-40" />
                <div className="skeleton h-5 w-20" />
              </div>
              <div className="skeleton h-4 w-28" />
              <div className="skeleton h-10 w-full rounded-lg mt-2" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-10">
          <EmptyState
            icon={Truck}
            title="No delivery notes"
            description={
              isDriver
                ? 'No deliveries are assigned to you right now'
                : 'Create a delivery note from a posted invoice'
            }
            action={
              canCreate
                ? { label: 'New Delivery', onClick: () => navigate('/deliveries/new') }
                : null
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(dn => {
            const isAssignedDriver = currentUser?.id === dn.Driver?.id;
            const canAct = canCreate || isAssignedDriver;
            return (
              <div key={dn.id} className="card overflow-hidden">
                {/* Tap area → detail */}
                <button
                  className="w-full text-left p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  onClick={() => navigate(`/deliveries/${dn.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-base leading-snug truncate">
                        {dn.Customer?.name || '—'}
                      </p>
                      <p className="text-xs font-mono text-gray-500 mt-0.5">{dn.dn_number}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={dn.status} />
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-xs text-gray-500">
                    <span>{fmtDate(dn.dn_date)}</span>
                    {dn.Invoice?.invoice_number && <span>{dn.Invoice.invoice_number}</span>}
                    {!isDriver && dn.Driver?.name && (
                      <span className="text-primary-600 font-medium">{dn.Driver.name}</span>
                    )}
                    {dn.Route?.name && <span>{dn.Route.name}</span>}
                  </div>
                </button>

                {/* Action buttons — only when actionable */}
                {canAct && dn.status === 'PENDING' && canCreate && (
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => setActionDn({ dn, action: 'dispatch' })}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-colors"
                    >
                      <Truck size={16} /> Dispatch
                    </button>
                  </div>
                )}

                {canAct && dn.status === 'DISPATCHED' && (canCreate || isAssignedDriver) && (
                  <div className="px-4 pb-4 flex gap-2">
                    <button
                      onClick={() => setActionDn({ dn, action: 'deliver' })}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold text-sm transition-colors"
                    >
                      <CheckCircle size={16} /> Mark Delivered
                    </button>
                    <button
                      onClick={() => setActionDn({ dn, action: 'return' })}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-sm transition-colors"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!actionDn}
        onCancel={() => { setActionDn(null); setNotes(''); }}
        onConfirm={handleAction}
        loading={dispatching || delivering || returning}
        variant={actionDn?.action === 'return' ? 'warning' : 'info'}
        title={
          actionDn?.action === 'dispatch' ? 'Confirm Dispatch' :
          actionDn?.action === 'deliver'  ? 'Confirm Delivery' : 'Mark as Returned'
        }
        message={
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {actionDn?.dn?.dn_number} — {actionDn?.dn?.Customer?.name}
            </p>
            {actionDn?.action !== 'dispatch' && (
              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="input text-sm"
                  placeholder={
                    actionDn?.action === 'return'
                      ? 'Reason for return…'
                      : 'Any delivery notes…'
                  }
                />
              </div>
            )}
          </div>
        }
        confirmLabel={
          actionDn?.action === 'dispatch' ? 'Dispatch' :
          actionDn?.action === 'deliver'  ? 'Mark Delivered' : 'Mark Returned'
        }
      />
    </div>
  );
}
