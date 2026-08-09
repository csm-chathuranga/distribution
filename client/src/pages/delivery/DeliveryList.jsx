import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Plus, Truck, CheckCircle, RotateCcw, MapPin, User, FileText } from 'lucide-react';
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

const STATUS_BORDER = {
  PENDING:    'border-l-amber-400',
  DISPATCHED: 'border-l-blue-500',
  DELIVERED:  'border-l-emerald-500',
  RETURNED:   'border-l-gray-400',
  CANCELLED:  'border-l-red-400',
};

export default function DeliveryList() {
  const navigate    = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const canCreate   = usePermission('sales.create');
  const isDriver    = ['driver', 'delivery'].includes(currentUser?.Role?.name);

  const [status,   setStatus]   = useState(isDriver ? 'DISPATCHED' : '');
  const [mineOnly, setMineOnly] = useState(isDriver);
  const [actionDn, setActionDn] = useState(null);
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

  const filters = (
    <div className="flex gap-2 flex-wrap">
      <select value={status} onChange={e => setStatus(e.target.value)} className="input-sm flex-1 min-w-[130px]">
        {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
      </select>
      {!isDriver && (
        <button
          onClick={() => setMineOnly(v => !v)}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            mineOnly ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {mineOnly ? 'My deliveries' : 'All drivers'}
        </button>
      )}
    </div>
  );

  const actionButtons = (dn) => {
    const isAssignedDriver = currentUser?.id === dn.Driver?.id;
    const canAct = canCreate || isAssignedDriver;
    if (!canAct) return null;
    if (dn.status === 'PENDING' && canCreate) {
      return (
        <button onClick={e => { e.stopPropagation(); setActionDn({ dn, action: 'dispatch' }); }}
          className="btn-secondary text-xs py-1 px-3 whitespace-nowrap">
          Dispatch
        </button>
      );
    }
    if (dn.status === 'DISPATCHED') {
      return (
        <div className="flex gap-2">
          <button onClick={e => { e.stopPropagation(); setActionDn({ dn, action: 'deliver' }); }}
            className="btn btn-primary text-xs py-1 px-3 whitespace-nowrap">
            Delivered
          </button>
          <button onClick={e => { e.stopPropagation(); setActionDn({ dn, action: 'return' }); }}
            className="btn-secondary text-xs py-1 px-3 text-amber-600 border-amber-300 whitespace-nowrap">
            Return
          </button>
        </div>
      );
    }
    return null;
  };

  const confirmDialog = (
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
          <p className="text-sm text-gray-600">{actionDn?.dn?.dn_number} — {actionDn?.dn?.Customer?.name}</p>
          {actionDn?.action !== 'dispatch' && (
            <div>
              <label className="label">Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="input text-sm"
                placeholder={actionDn?.action === 'return' ? 'Reason for return…' : 'Any delivery notes…'} />
            </div>
          )}
        </div>
      }
      confirmLabel={
        actionDn?.action === 'dispatch' ? 'Dispatch' :
        actionDn?.action === 'deliver'  ? 'Mark Delivered' : 'Mark Returned'
      }
    />
  );

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Deliveries</h1>
          {!isDriver && <p className="text-sm text-gray-500 mt-0.5">Track and manage delivery notes</p>}
        </div>
        {canCreate && (
          <button onClick={() => navigate('/deliveries/new')} className="btn btn-primary flex items-center gap-1.5">
            <Plus size={16} /> New
          </button>
        )}
      </div>

      {filters}

      {isLoading ? (
        <div className="card p-8 text-center text-gray-400">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="card p-10">
          <EmptyState icon={Truck} title="No delivery notes"
            description={isDriver ? 'No deliveries are assigned to you right now' : 'Create a delivery note from a posted invoice'}
            action={canCreate ? { label: 'New Delivery', onClick: () => navigate('/deliveries/new') } : null} />
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">DN #</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Invoice</th>
                  {!isDriver && <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Driver</th>}
                  <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Route</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(dn => (
                  <tr key={dn.id} onClick={() => navigate(`/deliveries/${dn.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{dn.dn_number}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{dn.Customer?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(dn.dn_date)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{dn.Invoice?.invoice_number || '—'}</td>
                    {!isDriver && <td className="px-4 py-3 text-gray-500">{dn.Driver?.name || '—'}</td>}
                    <td className="px-4 py-3 text-gray-500">{dn.Route?.name || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={dn.status} /></td>
                    <td className="px-4 py-3 text-right">{actionButtons(dn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="md:hidden space-y-3">
            {rows.map(dn => {
              const isAssignedDriver = currentUser?.id === dn.Driver?.id;
              const canAct = canCreate || isAssignedDriver;
              const hasAction = (dn.status === 'PENDING' && canCreate) ||
                                (dn.status === 'DISPATCHED' && (canCreate || isAssignedDriver));
              return (
                <div key={dn.id}
                  className={`bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer active:opacity-75 transition-opacity border-l-4 ${STATUS_BORDER[dn.status] || 'border-l-gray-300'}`}
                  onClick={() => navigate(`/deliveries/${dn.id}`)}>

                  <div className="p-4">
                    {/* Customer + status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm leading-tight">{dn.Customer?.name || '—'}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs font-mono text-gray-400">{dn.dn_number}</span>
                          <span className="text-gray-300 text-xs">·</span>
                          <span className="text-xs text-gray-400">{fmtDate(dn.dn_date)}</span>
                        </div>
                      </div>
                      <StatusBadge status={dn.status} />
                    </div>

                    {/* Details row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-2.5 border-t border-gray-100">
                      {dn.Invoice?.invoice_number && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <FileText size={11} className="text-gray-400" />
                          {dn.Invoice.invoice_number}
                        </span>
                      )}
                      {!isDriver && dn.Driver?.name && (
                        <span className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                          <User size={11} /> {dn.Driver.name}
                        </span>
                      )}
                      {dn.Route?.name && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin size={11} className="text-gray-400" /> {dn.Route.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  {canAct && hasAction && (
                    <div className="px-4 pb-4" onClick={e => e.stopPropagation()}>
                      {dn.status === 'PENDING' && canCreate && (
                        <button onClick={() => setActionDn({ dn, action: 'dispatch' })}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm transition-colors">
                          <Truck size={16} /> Dispatch
                        </button>
                      )}
                      {dn.status === 'DISPATCHED' && (
                        <div className="flex gap-2">
                          <button onClick={() => setActionDn({ dn, action: 'deliver' })}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm transition-colors">
                            <CheckCircle size={16} /> Mark Delivered
                          </button>
                          <button onClick={() => setActionDn({ dn, action: 'return' })}
                            className="w-12 flex items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white transition-colors">
                            <RotateCcw size={17} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {confirmDialog}
    </div>
  );
}
