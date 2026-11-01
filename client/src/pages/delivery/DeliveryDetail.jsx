import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Printer, MapPin, Truck, CheckCircle, RotateCcw, Package, User, Route, Banknote, X } from 'lucide-react';
import MapModal from '../../components/MapModal';
import toast from 'react-hot-toast';
import {
  useGetDeliveryQuery, useDispatchDeliveryMutation,
  useDeliverDeliveryMutation, useReturnDeliveryMutation,
} from '../../api/salesApi';
import { useGetCompanyQuery } from '../../api/reportsApi';
import { usePermission } from '../../hooks/usePermission';
import { selectCurrentUser } from '../../store/authSlice';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DeliveryNotePrint from '../../components/print/DeliveryNotePrint';
import { printComponent } from '../../utils/print';
import { fmtCurrency, fmtDate } from '../../utils/format';

export default function DeliveryDetail() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const canCreate   = usePermission('sales.create');
  const isDriver    = currentUser?.Role?.name === 'delivery';

  const [mapOpen,       setMapOpen]       = useState(false);
  const [actionOpen,    setActionOpen]    = useState(null); // 'dispatch' | 'deliver' | 'return'
  const [notes,         setNotes]         = useState('');
  const [deliverOpen,   setDeliverOpen]   = useState(false);
  const [paymentType,   setPaymentType]   = useState('full'); // 'full' | 'partial' | 'none'
  const [cashCollected, setCashCollected] = useState('');

  const { data: delivery, isLoading } = useGetDeliveryQuery(id);
  const { data: company }             = useGetCompanyQuery();
  const [dispatchDn, { isLoading: dispatching }] = useDispatchDeliveryMutation();
  const [deliverDn,  { isLoading: delivering  }] = useDeliverDeliveryMutation();
  const [returnDn,   { isLoading: returning   }] = useReturnDeliveryMutation();

  const handlePrint = () => printComponent(<DeliveryNotePrint delivery={delivery} company={company} />);

  const handleAction = async () => {
    try {
      if (actionOpen === 'dispatch') await dispatchDn({ id }).unwrap();
      else await returnDn({ id, notes }).unwrap();
      toast.success(actionOpen === 'dispatch' ? 'Delivery dispatched' : 'Marked as returned');
      setActionOpen(null); setNotes('');
    } catch (e) { toast.error(e.data?.message || 'Action failed'); }
  };

  const openDeliver = () => {
    const total = parseFloat(invoice?.total_amount || 0);
    setPaymentType('full');
    setCashCollected(total > 0 ? String(total) : '');
    setNotes('');
    setDeliverOpen(true);
  };

  const handleDeliver = async () => {
    const total = parseFloat(invoice?.total_amount || 0);
    const collected = paymentType === 'full'    ? total
                    : paymentType === 'partial'  ? parseFloat(cashCollected || 0)
                    : 0;
    try {
      await deliverDn({ id, notes, cash_collected: collected }).unwrap();
      toast.success('Marked as delivered' + (collected > 0 ? ` · LKR ${collected.toFixed(2)} collected` : ''));
      setDeliverOpen(false);
    } catch (e) { toast.error(e.data?.message || 'Action failed'); }
  };

  if (isLoading) return (
    <div className="card p-8 flex items-center justify-center text-gray-400">
      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-3" />
      Loading…
    </div>
  );

  if (!delivery) return (
    <div className="card p-8 text-center text-gray-500">Delivery note not found.</div>
  );

  const invoice        = delivery.Invoice;
  const lines          = invoice?.Lines || [];
  const isAssigned     = currentUser?.id === delivery.Driver?.id;
  const canAct         = canCreate || isAssigned;
  const isDispatched   = delivery.status === 'DISPATCHED';
  const isPending      = delivery.status === 'PENDING';
  const isDone         = ['DELIVERED', 'RETURNED', 'CANCELLED'].includes(delivery.status);

  // On mobile the sticky bar needs bottom padding to not overlap home indicator
  const stickyBarShown = canAct && (isPending || isDispatched) && !isDone;

  return (
    <div className={`space-y-4 max-w-2xl mx-auto md:max-w-4xl ${stickyBarShown ? 'pb-28 md:pb-6' : 'pb-6'}`}>

      {/* Top bar */}
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5">
            <Printer size={15} /> Print
          </button>
          {/* Desktop action buttons — hidden on mobile (mobile uses sticky bar) */}
          {isPending && canCreate && (
            <button onClick={() => setActionOpen('dispatch')}
              className="hidden md:flex items-center gap-1.5 text-sm py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">
              <Truck size={15} /> Dispatch
            </button>
          )}
          {isDispatched && canAct && (
            <>
              <button onClick={openDeliver}
                className="hidden md:flex items-center gap-1.5 text-sm py-1.5 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors">
                <CheckCircle size={15} /> Mark Delivered
              </button>
              <button onClick={() => setActionOpen('return')}
                className="hidden md:flex items-center gap-1.5 text-sm py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors">
                <RotateCcw size={15} /> Return
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status hero — driver sees a big status banner */}
      <div className={`card p-5 border-l-4 ${
        isDispatched ? 'border-blue-500 bg-blue-50' :
        delivery.status === 'DELIVERED' ? 'border-green-500 bg-green-50' :
        delivery.status === 'RETURNED'  ? 'border-amber-500 bg-amber-50' :
        'border-gray-300 bg-white'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={delivery.status} />
              <span className="text-xs text-gray-500 font-mono">{delivery.dn_number}</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 leading-snug">
              {delivery.Customer?.name || invoice?.Customer?.name || '—'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{fmtDate(delivery.dn_date)}</p>
          </div>
          {invoice?.total_amount && (
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Invoice Total</p>
              <p className="font-bold text-gray-900 text-lg font-mono">{fmtCurrency(invoice.total_amount)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="card p-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Driver</p>
          <p className="font-semibold text-gray-800 text-sm">{delivery.Driver?.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Route</p>
          <p className="font-semibold text-gray-800 text-sm">{delivery.Route?.name || '—'}</p>
        </div>
        {invoice?.invoice_number && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Invoice</p>
            <p className="font-semibold text-gray-800 text-sm font-mono">{invoice.invoice_number}</p>
          </div>
        )}
        {delivery.Customer?.phone && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Phone</p>
            <a
              href={`tel:${delivery.Customer.phone}`}
              className="font-semibold text-primary-600 text-sm"
            >
              {delivery.Customer.phone}
            </a>
          </div>
        )}
      </div>

      {/* Notes */}
      {delivery.notes && (
        <div className="card p-4 bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-amber-800">{delivery.notes}</p>
        </div>
      )}

      {/* Navigation card */}
      {invoice?.latitude && invoice?.longitude && (
        <button
          onClick={() => setMapOpen(true)}
          className="card p-4 w-full text-left flex items-center gap-4 hover:bg-blue-50 active:bg-blue-100 transition-colors border border-blue-100"
        >
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <MapPin size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-blue-900">Navigate to Delivery</p>
            <p className="text-xs font-mono text-blue-500 mt-0.5 truncate">
              {parseFloat(invoice.latitude).toFixed(6)}, {parseFloat(invoice.longitude).toFixed(6)}
            </p>
          </div>
          <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0">
            Go
          </div>
        </button>
      )}

      {/* Customer address */}
      {delivery.Customer?.address && (
        <div className="card p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Delivery Address</p>
          <p className="text-sm text-gray-700">{delivery.delivery_address || delivery.Customer.address}</p>
        </div>
      )}

      {/* Items */}
      {lines.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Items ({lines.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {lines.map((line, i) => (
              <div key={line.id || i} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm leading-snug">
                    {line.Product?.name || `Product #${line.product_id}`}
                  </p>
                  {line.Product?.sku && (
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{line.Product.sku}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900 text-sm">× {line.quantity}</p>
                  <p className="text-xs text-gray-500 font-mono">{fmtCurrency(line.line_total)}</p>
                </div>
              </div>
            ))}
          </div>
          {invoice?.total_amount && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-600">Total</span>
              <span className="font-bold text-gray-900 font-mono">{fmtCurrency(invoice.total_amount)}</span>
            </div>
          )}
        </div>
      )}

      {/* In-app map navigation */}
      {mapOpen && invoice?.latitude && invoice?.longitude && (
        <MapModal
          lat={invoice.latitude}
          lng={invoice.longitude}
          label={delivery.Customer?.name || invoice?.Customer?.name || 'Delivery Location'}
          onClose={() => setMapOpen(false)}
        />
      )}

      {/* Sticky bottom action bar — mobile only */}
      {stickyBarShown && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3 pb-safe">
          {isPending && canCreate && (
            <button
              onClick={() => setActionOpen('dispatch')}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-base transition-colors"
            >
              <Truck size={20} /> Dispatch Delivery
            </button>
          )}
          {isDispatched && (
            <div className="flex gap-3">
              <button
                onClick={openDeliver}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold text-base transition-colors"
              >
                <CheckCircle size={20} /> Mark Delivered
              </button>
              <button
                onClick={() => setActionOpen('return')}
                className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-base transition-colors"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dispatch / Return confirm dialog */}
      <ConfirmDialog
        open={!!actionOpen}
        onCancel={() => { setActionOpen(null); setNotes(''); }}
        onConfirm={handleAction}
        loading={dispatching || returning}
        variant={actionOpen === 'return' ? 'warning' : 'info'}
        title={actionOpen === 'dispatch' ? 'Confirm Dispatch' : 'Mark as Returned'}
        confirmLabel={actionOpen === 'dispatch' ? 'Dispatch' : 'Mark Returned'}
        message={
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{delivery.dn_number} — {delivery.Customer?.name}</p>
            {actionOpen === 'return' && (
              <div>
                <label className="label">Reason (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  className="input text-sm" placeholder="Reason for return…" />
              </div>
            )}
          </div>
        }
      />

      {/* Deliver + Payment Collection modal */}
      {deliverOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Banknote size={18} className="text-green-600" />
                <h3 className="font-bold text-gray-900">Collect Payment</h3>
              </div>
              <button onClick={() => setDeliverOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Invoice total */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-sm text-gray-500">Invoice Total</span>
                <span className="font-bold text-gray-900 font-mono">{fmtCurrency(invoice?.total_amount || 0)}</span>
              </div>

              {/* Payment type */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment Collected</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'full',    label: 'Full',    color: 'green' },
                    { key: 'partial', label: 'Partial', color: 'amber' },
                    { key: 'none',    label: 'None',    color: 'red'   },
                  ].map(({ key, label, color }) => (
                    <button key={key} type="button" onClick={() => {
                      setPaymentType(key);
                      if (key === 'full') setCashCollected(String(parseFloat(invoice?.total_amount || 0)));
                      if (key === 'none') setCashCollected('0');
                    }}
                      className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${
                        paymentType === key
                          ? color === 'green' ? 'border-green-500 bg-green-50 text-green-700'
                          : color === 'amber' ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-red-400 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount input — only for partial */}
              {paymentType === 'partial' && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Amount Collected (LKR)</label>
                  <input
                    type="number" inputMode="decimal" min="0"
                    max={parseFloat(invoice?.total_amount || 0)}
                    value={cashCollected}
                    onChange={e => setCashCollected(e.target.value)}
                    onFocus={e => e.target.select()}
                    placeholder="0.00"
                    className="input w-full text-right text-lg font-bold"
                    autoFocus
                  />
                </div>
              )}

              {/* Full amount display */}
              {paymentType === 'full' && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-green-600 font-medium">Collecting full amount</p>
                  <p className="text-xl font-bold text-green-700 font-mono mt-0.5">{fmtCurrency(invoice?.total_amount || 0)}</p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="input text-sm w-full" placeholder="Any delivery notes…" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setDeliverOpen(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeliver} disabled={delivering || (paymentType === 'partial' && !parseFloat(cashCollected))}
                className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors disabled:opacity-50">
                {delivering ? 'Saving…' : 'Mark Delivered'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
