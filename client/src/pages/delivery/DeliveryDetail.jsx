import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, Printer, MapPin, Truck, CheckCircle, RotateCcw, Package, User, Route } from 'lucide-react';
import MapModal from '../../components/MapModal';
import { useReactToPrint } from 'react-to-print';
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
import { fmtCurrency, fmtDate } from '../../utils/format';

export default function DeliveryDetail() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const printRef    = useRef(null);
  const currentUser = useSelector(selectCurrentUser);
  const canCreate   = usePermission('sales.create');
  const isDriver    = currentUser?.Role?.name === 'delivery';

  const [mapOpen,    setMapOpen]    = useState(false);
  const [actionOpen, setActionOpen] = useState(null); // 'dispatch' | 'deliver' | 'return'
  const [notes,      setNotes]      = useState('');

  const { data: delivery, isLoading } = useGetDeliveryQuery(id);
  const { data: company }             = useGetCompanyQuery();
  const [dispatchDn, { isLoading: dispatching }] = useDispatchDeliveryMutation();
  const [deliverDn,  { isLoading: delivering  }] = useDeliverDeliveryMutation();
  const [returnDn,   { isLoading: returning   }] = useReturnDeliveryMutation();

  const handlePrint = useReactToPrint({ contentRef: printRef });

  const handleAction = async () => {
    try {
      if (actionOpen === 'dispatch') await dispatchDn({ id }).unwrap();
      else if (actionOpen === 'deliver') await deliverDn({ id, notes }).unwrap();
      else await returnDn({ id, notes }).unwrap();
      toast.success(
        actionOpen === 'dispatch' ? 'Delivery dispatched' :
        actionOpen === 'deliver'  ? 'Marked as delivered' : 'Marked as returned'
      );
      setActionOpen(null); setNotes('');
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
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => navigate('/deliveries')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 active:opacity-70"
        >
          <ArrowLeft size={16} /> Back
        </button>

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
              <button onClick={() => setActionOpen('deliver')}
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

      {/* Hidden print template */}
      <div ref={printRef} style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }}>
        <DeliveryNotePrint delivery={delivery} company={company} />
      </div>

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
                onClick={() => setActionOpen('deliver')}
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

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!actionOpen}
        onCancel={() => { setActionOpen(null); setNotes(''); }}
        onConfirm={handleAction}
        loading={dispatching || delivering || returning}
        variant={actionOpen === 'return' ? 'warning' : 'info'}
        title={
          actionOpen === 'dispatch' ? 'Confirm Dispatch' :
          actionOpen === 'deliver'  ? 'Confirm Delivery' : 'Mark as Returned'
        }
        confirmLabel={
          actionOpen === 'dispatch' ? 'Dispatch' :
          actionOpen === 'deliver'  ? 'Mark Delivered' : 'Mark Returned'
        }
        message={
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {delivery.dn_number} — {delivery.Customer?.name}
            </p>
            {actionOpen !== 'dispatch' && (
              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="input text-sm"
                  placeholder={actionOpen === 'return' ? 'Reason for return…' : 'Any delivery notes…'}
                />
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}
